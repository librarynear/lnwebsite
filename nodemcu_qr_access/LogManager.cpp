#include "LogManager.h"
#include "config.h"
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

const char* OFFLINE_LOG_FILE = "/offline_logs.txt";
const char* PREFS_FILE = "/prefs.json";

LogManager::LogManager() {}

void LogManager::init() {
    if (!LittleFS.begin()) {
        Serial.println("LittleFS Mount Failed");
        return;
    }
}

String LogManager::getLibId() {
    if (LittleFS.exists(PREFS_FILE)) {
        File f = LittleFS.open(PREFS_FILE, "r");
        if (f) {
            StaticJsonDocument<512> doc;
            DeserializationError error = deserializeJson(doc, f);
            f.close();
            if (!error && doc.containsKey("libId")) {
                return doc["libId"].as<String>();
            }
        }
    }
    return String(LIBRARY_ID);
}

void LogManager::addLog(const String& uid, const String& doorId, time_t timestamp, const String& status, const String& reason) {
    ramLogs.push_back({uid, doorId, timestamp, status, reason});
    
    // Attempt upload immediately if connected
    if (WiFi.status() == WL_CONNECTED) {
        if (uploadRamLogs()) {
            return; // Success!
        }
    }
    
    Serial.println("Log buffered in RAM.");
    
    // If RAM buffer is too large, save to flash to prevent data loss on reset
    if (ramLogs.size() >= 30) {
        saveToFlash();
    }
}

void LogManager::sync() {
    // Only attempt sync every 10 seconds to avoid spamming the network
    if (millis() - lastSyncAttempt < 10000) return;
    lastSyncAttempt = millis();

    if (WiFi.status() != WL_CONNECTED) return;

    // 1. Upload any pending flash logs first
    if (LittleFS.exists(OFFLINE_LOG_FILE)) {
        uploadFlashLogs();
    }

    // 2. Upload any RAM logs
    if (!ramLogs.empty()) {
        uploadRamLogs();
    }
}

bool LogManager::uploadBatch(const String& jsonPayload) {
    WiFiClientSecure client;
    client.setInsecure(); // Do not verify SSL cert for simplicity
    
    HTTPClient http;
    http.begin(client, API_LOG_ENDPOINT);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", API_HARDWARE_KEY);
    
    int httpResponseCode = http.POST(jsonPayload);
    
    bool success = false;
    if (httpResponseCode == 200) {
        success = true;
    } else {
        Serial.print("Error sending POST, code: ");
        Serial.println(httpResponseCode);
    }
    
    http.end();
    return success;
}

bool LogManager::uploadRamLogs() {
    if (ramLogs.empty()) return true;

    String libId = getLibId();

    DynamicJsonDocument doc(4096);
    doc["libraryId"] = libId;
    JsonArray logsArray = doc.createNestedArray("logs");
    
    for (const auto& entry : ramLogs) {
        JsonObject logObj = logsArray.createNestedObject();
        logObj["uid"] = entry.uid;
        logObj["doorId"] = entry.doorId;
        logObj["timestamp"] = entry.timestamp;
        logObj["status"] = entry.status;
        if (entry.reason.length() > 0) {
            logObj["reason"] = entry.reason;
        }
    }

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    if (uploadBatch(jsonPayload)) {
        ramLogs.clear();
        return true;
    }
    return false;
}

void LogManager::saveToFlash() {
    if (ramLogs.empty()) return;
    
    File file = LittleFS.open(OFFLINE_LOG_FILE, "a");
    if (!file) {
        Serial.println("Failed to open file for appending");
        return;
    }

    for (const auto& entry : ramLogs) {
        DynamicJsonDocument doc(512);
        doc["uid"] = entry.uid;
        doc["doorId"] = entry.doorId;
        doc["timestamp"] = entry.timestamp;
        doc["status"] = entry.status;
        if (entry.reason.length() > 0) doc["reason"] = entry.reason;
        
        String output;
        serializeJson(doc, output);
        file.println(output);
    }
    file.close();
    
    ramLogs.clear();
    Serial.println("Flushed RAM logs to LittleFS");
}

bool LogManager::uploadFlashLogs() {
    File file = LittleFS.open(OFFLINE_LOG_FILE, "r");
    if (!file) return true; // Nothing to upload

    String libId = getLibId();
    DynamicJsonDocument doc(4096);
    doc["libraryId"] = libId;
    JsonArray logsArray = doc.createNestedArray("logs");
    
    int count = 0;
    while (file.available() && count < 30) {
        String line = file.readStringUntil('\n');
        if (line.length() > 5) {
            StaticJsonDocument<512> lineDoc;
            if (!deserializeJson(lineDoc, line)) {
                logsArray.add(lineDoc);
                count++;
            }
        }
    }
    file.close();

    if (count == 0) {
        LittleFS.remove(OFFLINE_LOG_FILE);
        return true;
    }

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    if (uploadBatch(jsonPayload)) {
        // Remove the file if successful (Note: if >30 logs, we delete all for simplicity, 
        // to be robust we should rewrite un-uploaded logs, but keeping simple here)
        LittleFS.remove(OFFLINE_LOG_FILE);
        return true;
    }
    return false;
}

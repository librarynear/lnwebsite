#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <SoftwareSerial.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include "config.h"
#include "SecurityManager.h"
#include "LogManager.h"
#include "HardwareController.h"

// Software Serial for GM67 Scanner
SoftwareSerial ScannerSerial(QR_RX_PIN, QR_TX_PIN);

SecurityManager securityManager;
LogManager logManager;
HardwareController hwController;

String qrBuffer = "";
unsigned long lastCachePurge = 0;

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n--- NodeMCU QR Access Control System ---");

    // Initialize Hardware & LittleFS
    hwController.init();
    if (!LittleFS.begin()) {
        Serial.println("LittleFS Mount Failed");
    }
    
    logManager.init();
    securityManager.init();

    // Initialize Scanner Serial
    ScannerSerial.begin(9600);

    // Read WiFi credentials from LittleFS
    String ssid = "";
    String password = "";
    
    if (LittleFS.exists("/prefs.json")) {
        File f = LittleFS.open("/prefs.json", "r");
        if (f) {
            StaticJsonDocument<512> doc;
            DeserializationError error = deserializeJson(doc, f);
            f.close();
            if (!error) {
                ssid = doc["ssid"].as<String>();
                password = doc["password"].as<String>();
            }
        }
    }

    if (ssid == "") {
        Serial.println("No WiFi credentials found. Waiting for Provisioning QR...");
    } else {
        Serial.print("Connecting to WiFi: ");
        Serial.println(ssid);
        
        WiFi.begin(ssid.c_str(), password.c_str());
        
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 30) {
            delay(1000);
            Serial.print(".");
            attempts++;
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("\nWiFi Connected!");
            configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
            Serial.println("Waiting for NTP sync...");
            
            time_t now = time(nullptr);
            while (now < 8 * 3600 * 2) {
                delay(500);
                Serial.print(".");
                now = time(nullptr);
            }
            Serial.println("\nNTP Synced!");
            struct tm timeinfo;
            gmtime_r(&now, &timeinfo);
            Serial.print("Current time: ");
            Serial.println(asctime(&timeinfo));
        } else {
            Serial.println("\nWiFi Failed to Connect.");
        }
    }
    
    Serial.println("System Ready. Scan QR...");
}

void processProvisioning(const QRPayload& payload) {
    Serial.println("\n[PROVISION] Processing new network credentials...");
    
    DynamicJsonDocument doc(512);
    doc["ssid"] = payload.ssid;
    doc["password"] = payload.pass;
    doc["libId"] = payload.libId;
    
    File f = LittleFS.open("/prefs.json", "w");
    if (f) {
        serializeJson(doc, f);
        f.close();
        Serial.println("[PROVISION] Credentials saved to LittleFS.");
        Serial.println("[PROVISION] Rebooting in 3 seconds...");
        delay(3000);
        ESP.restart();
    } else {
        Serial.println("[PROVISION] Failed to save credentials!");
    }
}

void loop() {
    hwController.update();
    logManager.sync();

    // Purge replay cache every 60 seconds
    if (millis() - lastCachePurge > 60000) {
        securityManager.purgeReplayCache();
        lastCachePurge = millis();
    }

    // Read from GM67 Scanner via SoftwareSerial
    while (ScannerSerial.available()) {
        char c = ScannerSerial.read();
        if (c == '\n' || c == '\r') {
            if (qrBuffer.length() > 0) {
                Serial.println("\n[SCAN] ────────────────────────────────");
                Serial.print("[SCAN] QR Data: ");
                Serial.println(qrBuffer);
                
                QRPayload payload = securityManager.processQR(qrBuffer);
                
                if (payload.cmd == "PROVISION" && payload.isValid) {
                    processProvisioning(payload);
                }
                else if (payload.isValid) {
                    Serial.println("[ACCESS] ✓ GRANTED");
                    hwController.unlockDoor();
                    logManager.addLog(payload.uid, payload.doorId, payload.iat, "SUCCESS");
                } else {
                    Serial.print("[ACCESS] ✗ DENIED: ");
                    Serial.println(payload.failReason);
                    logManager.addLog(payload.uid, payload.doorId, time(nullptr), "DENIED", payload.failReason);
                }
                
                Serial.println("[SCAN] ────────────────────────────────\n");
                qrBuffer = "";
            }
        } else {
            qrBuffer += c;
        }
    }
}

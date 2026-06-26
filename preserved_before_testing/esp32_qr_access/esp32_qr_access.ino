#include <Arduino.h>
#include <WiFi.h>
#include <Preferences.h>
#include <time.h>
#include "config.h"
#include "SecurityManager.h"
#include "LogManager.h"
#include "HardwareController.h"

// Hardware Serial for GM67 Scanner
HardwareSerial ScannerSerial(2);

SecurityManager securityManager;
LogManager logManager;
HardwareController hwController;
Preferences preferences;

String qrBuffer = "";
unsigned long lastCachePurge = 0;

void connectToWiFi(const char* ssid, const char* pass) {
    Serial.println("Connecting to WiFi...");
    WiFi.begin(ssid, pass);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nConnected to WiFi!");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
        
        Serial.println("Syncing NTP Time...");
        configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
        struct tm timeinfo;
        if(getLocalTime(&timeinfo, 10000)){
            Serial.println(&timeinfo, "Time synced: %A, %B %d %Y %H:%M:%S");
        } else {
            Serial.println("Failed to obtain time");
        }
    } else {
        Serial.println("\nFailed to connect to WiFi. Operating in offline mode.");
    }
}

void waitForWiFiQR() {
    Serial.println("No WiFi credentials found.");
    Serial.println("PLEASE SCAN A WIFI PROVISIONING QR CODE...");

    while (true) {
        if (ScannerSerial.available()) {
            char c = ScannerSerial.read();
            if (c == '\n' || c == '\r') {
                if (qrBuffer.length() > 0) {
                    Serial.print("Scanned: ");
                    Serial.println(qrBuffer);
                    
                    if (securityManager.detectQRType(qrBuffer) == "wifi") {
                        WiFiConfigPayload res = securityManager.processWiFiQR(qrBuffer);
                        if (res.isValid) {
                            Serial.println("WiFi Provisioning Valid!");
                            preferences.begin("library-app", false);
                            preferences.putString("ssid", res.ssid);
                            preferences.putString("pass", res.pass);
                            // Can also save library ID if passed, e.g., using qid for now or library id directly
                            preferences.end();
                            
                            connectToWiFi(res.ssid.c_str(), res.pass.c_str());
                            qrBuffer = "";
                            break; // Exit provisioning loop
                        } else {
                            Serial.println("WiFi Provisioning Invalid! Try again.");
                        }
                    } else {
                        Serial.println("Waiting for a WiFi QR code. Invalid QR type.");
                    }
                    qrBuffer = "";
                }
            } else {
                qrBuffer += c;
            }
        }
        delay(10);
    }
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n--- ESP32 QR Access Control System ---");

    hwController.init();
    logManager.init();
    securityManager.init();

    ScannerSerial.begin(9600, SERIAL_8N1, QR_RX_PIN, QR_TX_PIN);

    // Initialize Preferences
    preferences.begin("library-app", true); // true = read-only
    String savedSSID = preferences.getString("ssid", "");
    String savedPASS = preferences.getString("pass", "");
    preferences.end();

    if (savedSSID == "") {
        waitForWiFiQR();
    } else {
        connectToWiFi(savedSSID.c_str(), savedPASS.c_str());
    }
}

void loop() {
    hwController.process();

    while (ScannerSerial.available()) {
        char c = ScannerSerial.read();
        if (c == '\n' || c == '\r') {
            if (qrBuffer.length() > 0) {
                Serial.print("Scanned: ");
                Serial.println(qrBuffer);
                
                String type = securityManager.detectQRType(qrBuffer);
                
                if (type == "wifi") {
                    WiFiConfigPayload res = securityManager.processWiFiQR(qrBuffer);
                    if (res.isValid) {
                        Serial.println("Re-provisioning WiFi...");
                        preferences.begin("library-app", false);
                        preferences.putString("ssid", res.ssid);
                        preferences.putString("pass", res.pass);
                        preferences.end();
                        WiFi.disconnect();
                        connectToWiFi(res.ssid.c_str(), res.pass.c_str());
                    } else {
                        Serial.println("WiFi Provisioning Invalid!");
                    }
                } else {
                    // Normal Access QR
                    QRPayload result = securityManager.processQR(qrBuffer);
                    if (result.isValid) {
                        Serial.println("QR Valid -> Access Granted");
                        hwController.unlockDoor();
                        // Add log (Success) - we will update addLog later to handle reason/status
                        logManager.addLog(result.uid, result.doorId, result.iat, "SUCCESS", "");
                    } else {
                        Serial.println("QR Invalid -> Access Denied");
                        // Add log (Failed) 
                        logManager.addLog(result.uid, result.doorId, result.iat, "DENIED", "Signature/Time/Replay Invalid");
                    }
                }
                qrBuffer = "";
            }
        } else {
            qrBuffer += c;
        }
    }

    logManager.sync();
    
    if (millis() - lastCachePurge > 10000) {
        securityManager.purgeReplayCache();
        lastCachePurge = millis();
    }
}

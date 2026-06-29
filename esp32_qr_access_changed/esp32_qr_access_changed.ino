#include <Arduino.h>
#include <map>
#include <WiFi.h>
#include <Preferences.h>
#include <SPI.h>
#include <MFRC522.h>
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
MFRC522 mfrc522(RFID_SS_PIN, RFID_RST_PIN);

String qrBuffer = "";
unsigned long lastCachePurge = 0;
std::map<String, bool> userInFacility; // true = IN, false = OUT

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n--- ESP32 QR Access Control System ---");

    // Initialize Hardware
    hwController.init();
    logManager.init();
    securityManager.init();

    // Initialize SPI and RFID
    SPI.begin();
    mfrc522.PCD_Init();

    // Initialize Scanner Serial
    ScannerSerial.begin(9600, SERIAL_8N1, QR_RX_PIN, QR_TX_PIN);

    // Read WiFi credentials from NVS
    preferences.begin("library-app", false);
    String ssid = preferences.getString("ssid", "");
    String password = preferences.getString("password", "");
    String libId = preferences.getString("libId", "");
    preferences.end();

    if (ssid == "") {
        Serial.println("No WiFi credentials found in NVS. Waiting for Provisioning QR...");
    } else {
        hwController.showWiFiConnecting();
        Serial.print("Connecting to WiFi: ");
        Serial.println(ssid);
        
        WiFi.begin(ssid.c_str(), password.c_str());
        
        // Wait up to 30 seconds for connection
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 30) {
            delay(1000);
            Serial.print(".");
            attempts++;
        }
        
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("\nFailed to connect to WiFi. Operating in OFFLINE mode.");
            hwController.showError("WiFi Offline");
            delay(2000);
            hwController.showIdle();
        } else {
            Serial.println("\nConnected to WiFi!");
            hwController.showMessage(" WiFi Connected ", " IP Assigned ", 2000);
            Serial.print("IP Address: ");
            Serial.println(WiFi.localIP());
            
            // Sync NTP Time if connected
            Serial.println("Syncing NTP Time...");
            configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
            
            struct tm timeinfo;
            if(!getLocalTime(&timeinfo)){
                Serial.println("Failed to obtain time");
            } else {
                Serial.println(&timeinfo, "Time synced: %A, %B %d %Y %H:%M:%S");
            }
        }
    }
}

void loop() {
    // 1. Process Hardware Non-Blocking Delays (Door Unlock)
    hwController.process();

    // 2. Read from GM67 Scanner
    while (ScannerSerial.available()) {
        char c = ScannerSerial.read();
        if (c == '\n' || c == '\r') {
            if (qrBuffer.length() > 0) {
                // We have a full QR code payload
                Serial.print("Scanned: ");
                Serial.println(qrBuffer);
                
                QRPayload result = securityManager.processQR(qrBuffer);
                
                if (result.isValid) {
                    if (result.cmd == "PROVISION") {
                        Serial.println("PROVISION COMMAND RECEIVED.");
                        
                        preferences.begin("library-app", false);
                        preferences.putString("ssid", result.ssid);
                        preferences.putString("password", result.pass);
                        preferences.putString("libId", result.libId);
                        preferences.end();
                        
                        Serial.println("Credentials saved to NVS. Restarting...");
                        hwController.showMessage(" Saved WiFi!  ", "  Restarting... ", 3000);
                        delay(1500);
                        ESP.restart();
                    } else if (result.cmd == "ADD_RFID") {
                        Serial.println("ADD_RFID COMMAND RECEIVED.");
                        securityManager.addRfidToNVS(result.rfid, result.exp);
                        hwController.showMessage("  RFID Added!   ", "ID: " + result.rfid, 3000);
                    } else if (result.cmd == "REVOKE_RFID") {
                        Serial.println("REVOKE_RFID COMMAND RECEIVED.");
                        securityManager.removeRfidFromNVS(result.rfid);
                        hwController.showMessage(" RFID Revoked!  ", "ID: " + result.rfid, 3000);
                    } else {
                        Serial.println("QR Valid -> Access Granted");
                        
                        bool isCurrentlyIn = userInFacility[result.uid];
                        time_t currentScanTime;
                        time(&currentScanTime);
                        
                        if (isCurrentlyIn) {
                            userInFacility[result.uid] = false; // Mark OUT
                            Serial.println("Checking OUT -> Not unlocking door.");
                            hwController.showMessage(" Checked OUT!   ", " See you again! ", 3000);
                            logManager.addLog(result.uid, result.doorId, currentScanTime, "OUT", "");
                        } else {
                            userInFacility[result.uid] = true; // Mark IN
                            Serial.println("Checking IN -> Unlocking door.");
                            hwController.showWelcome();
                            hwController.unlockDoor();
                            logManager.addLog(result.uid, result.doorId, currentScanTime, "IN", "");
                        }
                    }
                } else {
                    Serial.print("QR Invalid -> Access Denied. Reason: ");
                    Serial.println(result.failReason);
                    hwController.showError(result.failReason);
                    
                    if (result.uid != "UNKNOWN") {
                        time_t currentScanTime;
                        time(&currentScanTime);
                        // Log the failure to backend so dashboard can flag it
                        logManager.addLog(result.uid, result.doorId, currentScanTime, "DENIED", result.failReason);
                    }
                }
                
                qrBuffer = ""; // Reset buffer
            }
        } else {
            qrBuffer += c;
        }
    }

    // 3. Read from RFID
    if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
        String uidStr = "";
        for (byte i = 0; i < mfrc522.uid.size; i++) {
            uidStr += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
            uidStr += String(mfrc522.uid.uidByte[i], HEX);
        }
        uidStr.toUpperCase();
        
        Serial.print("RFID Scanned: ");
        Serial.println(uidStr);
        
        int authResult = securityManager.checkRfidAuthorization(uidStr);
        
        time_t now;
        time(&now);

        if (authResult == 1) {
            Serial.println("RFID Valid -> Access Granted");
            
            bool isCurrentlyIn = userInFacility[uidStr];
            if (isCurrentlyIn) {
                userInFacility[uidStr] = false; // Mark OUT
                Serial.println("Checking OUT -> Not unlocking door.");
                hwController.showMessage(" Checked OUT!   ", " See you again! ", 3000);
                logManager.addLog(uidStr, String(DOOR_ID), now, "OUT", "RFID");
            } else {
                userInFacility[uidStr] = true; // Mark IN
                Serial.println("Checking IN -> Unlocking door.");
                hwController.showWelcome();
                hwController.unlockDoor();
                logManager.addLog(uidStr, String(DOOR_ID), now, "IN", "RFID");
            }
        } else if (authResult == -1) {
            Serial.println("RFID Expired -> Access Denied");
            hwController.showMessage("  Plan Expired  ", uidStr, 4000);
            logManager.addLog(uidStr, String(DOOR_ID), now, "DENIED", "Expired RFID");
        } else {
            Serial.println("RFID Unknown -> Access Denied");
            hwController.showMessage(" Access Denied! ", "Unknown: " + uidStr, 4000);
            logManager.addLog(uidStr, String(DOOR_ID), now, "DENIED", "Unknown RFID");
        }
        
        mfrc522.PICC_HaltA();
        mfrc522.PCD_StopCrypto1();
    }

    // 4. Periodic Background Tasks
    // Sync offline logs
    logManager.sync();
    
    // Purge Replay Cache every 10 seconds to save RAM
    if (millis() - lastCachePurge > 10000) {
        securityManager.purgeReplayCache();
        lastCachePurge = millis();
    }
}

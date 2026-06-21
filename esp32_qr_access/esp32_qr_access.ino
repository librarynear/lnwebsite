#include <Arduino.h>
#include <WiFiManager.h>
#include "config.h"
#include "SecurityManager.h"
#include "LogManager.h"
#include "HardwareController.h"

// Hardware Serial for GM67 Scanner
HardwareSerial ScannerSerial(2);

SecurityManager securityManager;
LogManager logManager;
HardwareController hwController;

String qrBuffer = "";
unsigned long lastCachePurge = 0;

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n--- ESP32 QR Access Control System ---");

    // Initialize Hardware
    hwController.init();
    logManager.init();
    securityManager.init();

    // Initialize Scanner Serial
    ScannerSerial.begin(9600, SERIAL_8N1, QR_RX_PIN, QR_TX_PIN);

    // Connect to WiFi using WiFiManager
    WiFiManager wm;
    // Set a timeout so it doesn't block forever if power is lost and router is down
    wm.setConfigPortalTimeout(180); 
    
    Serial.println("Connecting to WiFi...");
    bool connected = wm.autoConnect("FocusDesk_Door_AP");
    
    if (!connected) {
        Serial.println("Failed to connect to WiFi and hit timeout. Operating in OFFLINE mode.");
    } else {
        Serial.println("Connected to WiFi!");
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
                    Serial.println("QR Valid -> Access Granted");
                    hwController.unlockDoor();
                    
                    // Add to log queue (handles offline automatically)
                    logManager.addLog(result.uid, result.doorId, result.iat);
                } else {
                    Serial.println("QR Invalid -> Access Denied");
                }
                
                qrBuffer = ""; // Reset buffer
            }
        } else {
            qrBuffer += c;
        }
    }

    // 3. Periodic Background Tasks
    // Sync offline logs
    logManager.sync();
    
    // Purge Replay Cache every 10 seconds to save RAM
    if (millis() - lastCachePurge > 10000) {
        securityManager.purgeReplayCache();
        lastCachePurge = millis();
    }
}

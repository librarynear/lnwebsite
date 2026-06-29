#include "HardwareController.h"
#include "config.h"
#include <Wire.h>

HardwareController::HardwareController() : lcd(0x27, 16, 2) {}

void HardwareController::init() {
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW); // Assume active HIGH relay
    
    // Initialize LCD
    Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);
    lcd.init();
    lcd.backlight();
    showIdle();
}

void HardwareController::unlockDoor() {
    Serial.println("Unlocking Door!");
    digitalWrite(RELAY_PIN, HIGH);
    isDoorUnlocked = true;
    unlockStartTime = millis();
}

void HardwareController::process() {
    if (isDoorUnlocked) {
        if (millis() - unlockStartTime >= DOOR_UNLOCK_TIME_MS) {
            Serial.println("Locking Door.");
            digitalWrite(RELAY_PIN, LOW);
            isDoorUnlocked = false;
        }
    }
    
    if (isTemporaryMessage && lcdMessageTimeout > 0) {
        if (millis() - lcdMessageStartTime >= lcdMessageTimeout) {
            showIdle();
        }
    }
}

void HardwareController::showMessage(const String& line1, const String& line2, int timeoutMs) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(line1);
    lcd.setCursor(0, 1);
    lcd.print(line2);
    
    if (timeoutMs > 0) {
        isTemporaryMessage = true;
        lcdMessageStartTime = millis();
        lcdMessageTimeout = timeoutMs;
    } else {
        isTemporaryMessage = false;
    }
}

void HardwareController::showIdle() {
    showMessage("  Scan QR Code  ", " Or Tap RFID ID ", 0);
}

void HardwareController::showWelcome() {
    showMessage(" Access Granted ", "    Welcome!    ", 3000);
}

void HardwareController::showError(const String& error) {
    String line2 = error;
    if (line2.length() > 16) {
        line2 = line2.substring(0, 16);
    }
    showMessage(" Access Denied! ", line2, 4000);
}

void HardwareController::showWiFiConnecting() {
    showMessage(" Connecting...  ", "  Please Wait   ", 0);
}

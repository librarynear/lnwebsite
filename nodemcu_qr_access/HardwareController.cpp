#include "HardwareController.h"
#include "config.h"

HardwareController::HardwareController() : unlockTime(0), isUnlocked(false) {}

void HardwareController::init() {
    pinMode(RELAY_PIN, OUTPUT);
    lockDoor(); // Ensure locked on boot
}

void HardwareController::unlockDoor() {
    digitalWrite(RELAY_PIN, LOW); // Active Low Relay
    isUnlocked = true;
    unlockTime = millis();
    Serial.println("[DOOR] Unlocked");
}

void HardwareController::lockDoor() {
    digitalWrite(RELAY_PIN, HIGH);
    isUnlocked = false;
    Serial.println("[DOOR] Locked");
}

void HardwareController::update() {
    if (isUnlocked && (millis() - unlockTime >= DOOR_UNLOCK_TIME_MS)) {
        lockDoor();
    }
}

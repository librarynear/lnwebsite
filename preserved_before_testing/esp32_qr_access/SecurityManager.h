#ifndef SECURITY_MANAGER_H
#define SECURITY_MANAGER_H

#include <Arduino.h>
#include <vector>

struct ReplayEntry {
    String qid;
    time_t expiry;
};

struct QRPayload {
    String uid;
    time_t iat;
    String qid;
    String doorId;
    String sig;
    bool isValid;
};

struct WiFiConfigPayload {
    String ssid;
    String pass;
    time_t iat;
    String qid;
    String sig;
    bool isValid;
};

struct RFIDCommandPayload {
    String cmd;
    String rfid;
    time_t exp; // 0 if revoke
    String uid;
    time_t iat;
    String qid;
    String doorId;
    String sig;
    bool isValid;
};

class SecurityManager {
public:
    SecurityManager();
    void init();
    
    // Check if the QR is for WiFi config or Student Access
    String detectQRType(const String& rawJson);

    // Parse JSON, verify ECDSA signature, age, and replay
    QRPayload processQR(const String& rawJson);
    WiFiConfigPayload processWiFiQR(const String& rawJson);
    RFIDCommandPayload processRFIDCommandQR(const String& rawJson);
    
    // Purge expired QIDs from RAM
    void purgeReplayCache();

private:
    std::vector<ReplayEntry> replayCache;
    
    bool verifyECDSASignature(const String& payload, const String& signatureBase64);
    bool checkReplay(const String& qid, time_t expiry);
};

#endif // SECURITY_MANAGER_H

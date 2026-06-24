#ifndef SECURITY_MANAGER_H
#define SECURITY_MANAGER_H

#include <Arduino.h>
#include <vector>

struct QRPayload {
    bool isValid;
    String failReason;
    
    // Core payload
    String uid;
    time_t iat;
    String qid;
    String doorId;
    String sig;

    // Optional Provisioning fields
    String cmd;
    String ssid;
    String pass;
    String libId;
};

struct ReplayEntry {
    String qid;
    time_t expiry;
};

class SecurityManager {
public:
    SecurityManager();
    void init();
    
    // Parses and validates the QR code
    QRPayload processQR(const String& rawJson);
    
    // Purges old IDs from cache
    void purgeReplayCache();

private:
    std::vector<ReplayEntry> replayCache;
    
    bool checkReplay(const String& qid, time_t expiry);
    bool verifyECDSASignature(const String& payloadStr, const String& signatureBase64);
};

#endif // SECURITY_MANAGER_H

#include "SecurityManager.h"
#include "config.h"
#include <ArduinoJson.h>
#include <mbedtls/md.h>
#include <mbedtls/pk.h>
#include <mbedtls/error.h>
#include <mbedtls/base64.h>
#include <time.h>

SecurityManager::SecurityManager() {}

void SecurityManager::init() {
    // Initialization if required
}

String SecurityManager::detectQRType(const String& rawJson) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, rawJson);
    
    if (error) {
        return "unknown";
    }
    
    if (doc.containsKey("type")) {
        return doc["type"].as<String>();
    }
    
    // No "type" field = access QR (backward compatible)
    return "access";
}

WiFiConfigPayload SecurityManager::processWiFiQR(const String& rawJson) {
    WiFiConfigPayload result;
    result.isValid = false;

    // 1. Parse JSON
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, rawJson);

    if (error) {
        Serial.print("[WiFi QR] JSON parse failed: ");
        Serial.println(error.c_str());
        return result;
    }

    if (!doc.containsKey("ssid") || !doc.containsKey("pass") || 
        !doc.containsKey("iat") || !doc.containsKey("qid") || !doc.containsKey("sig")) {
        Serial.println("[WiFi QR] Missing required fields");
        return result;
    }

    result.ssid = doc["ssid"].as<String>();
    result.pass = doc["pass"].as<String>();
    result.iat  = doc["iat"].as<time_t>();
    result.qid  = doc["qid"].as<String>();
    result.sig  = doc["sig"].as<String>();

    // 2. Verify Time validity (3-minute window)
    time_t now;
    time(&now);
    
    if (now > result.iat + WIFI_QR_VALIDITY_SECONDS) {
        Serial.println("[WiFi QR] QR Code Expired!");
        return result;
    }
    
    if (now < result.iat - 60) {
        Serial.println("[WiFi QR] QR Code is from the future? Check NTP sync.");
        return result;
    }

    // 3. Verify ECDSA Signature (payload = ssid + pass + iat + qid)
    String payloadStr = result.ssid + result.pass + String((unsigned long)result.iat) + result.qid;
    if (!verifyECDSASignature(payloadStr, result.sig)) {
        Serial.println("[WiFi QR] Signature verification failed!");
        return result;
    }

    // 4. Check Replay Attack
    time_t expiry = result.iat + WIFI_QR_VALIDITY_SECONDS;
    if (!checkReplay(result.qid, expiry)) {
        Serial.println("[WiFi QR] Replay attack detected!");
        return result;
    }

    result.isValid = true;
    return result;
}

QRPayload SecurityManager::processQR(const String& rawJson) {
    QRPayload result;
    result.isValid = false;

    // 1. Parse JSON
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, rawJson);

    if (error) {
        Serial.print("JSON parse failed: ");
        Serial.println(error.c_str());
        return result;
    }

    if (!doc.containsKey("uid") || !doc.containsKey("iat") || !doc.containsKey("qid") || !doc.containsKey("sig")) {
        Serial.println("Missing required QR fields");
        return result;
    }

    result.uid = doc["uid"].as<String>();
    result.iat = doc["iat"].as<time_t>();
    result.qid = doc["qid"].as<String>();
    result.doorId = doc.containsKey("door") ? doc["door"].as<String>() : String(DOOR_ID);
    result.sig = doc["sig"].as<String>();

    // 2. Verify Time validity
    time_t now;
    time(&now);
    
    // Check if QR is too old (or from the future by a large margin)
    if (now > result.iat + QR_VALIDITY_SECONDS) {
        Serial.println("QR Code Expired!");
        return result;
    }
    
    if (now < result.iat - 60) {
        // NTP drift allowance
        Serial.println("QR Code is from the future? Check NTP sync.");
        return result;
    }

    // 3. Verify ECDSA Signature
    // Payload to verify: uid + iat + qid
    String payloadStr = result.uid + String(result.iat) + result.qid;
    if (!verifyECDSASignature(payloadStr, result.sig)) {
        Serial.println("Signature verification failed!");
        return result;
    }

    // 4. Check Replay Attack
    time_t expiry = result.iat + QR_VALIDITY_SECONDS;
    if (!checkReplay(result.qid, expiry)) {
        Serial.println("Replay attack detected!");
        return result;
    }

    result.isValid = true;
    return result;
}

bool SecurityManager::checkReplay(const String& qid, time_t expiry) {
    // Check if already used
    for (const auto& entry : replayCache) {
        if (entry.qid == qid) {
            return false; // Used!
        }
    }
    // Valid, add to cache
    replayCache.push_back({qid, expiry});
    return true;
}

void SecurityManager::purgeReplayCache() {
    time_t now;
    time(&now);
    
    for (auto it = replayCache.begin(); it != replayCache.end(); ) {
        if (now > it->expiry) {
            it = replayCache.erase(it);
        } else {
            ++it;
        }
    }
}

bool SecurityManager::verifyECDSASignature(const String& payloadStr, const String& signatureBase64) {
    int ret;
    mbedtls_pk_context pk;
    mbedtls_pk_init(&pk);

    // Parse the embedded public key
    ret = mbedtls_pk_parse_public_key(&pk, (const unsigned char*)ECDSA_PUBLIC_KEY, strlen(ECDSA_PUBLIC_KEY) + 1);
    if (ret != 0) {
        Serial.printf("Failed to parse public key: -0x%04x\n", -ret);
        mbedtls_pk_free(&pk);
        return false;
    }

    // Hash the payload with SHA256
    unsigned char hash[32];
    ret = mbedtls_md(mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), (const unsigned char*)payloadStr.c_str(), payloadStr.length(), hash);
    if (ret != 0) {
        Serial.println("Failed to hash payload");
        mbedtls_pk_free(&pk);
        return false;
    }

    // Decode Base64 signature
    unsigned char sigBuf[128];
    size_t sigLen = 0;
    ret = mbedtls_base64_decode(sigBuf, sizeof(sigBuf), &sigLen, (const unsigned char*)signatureBase64.c_str(), signatureBase64.length());
    if (ret != 0) {
        Serial.println("Failed to decode base64 signature");
        mbedtls_pk_free(&pk);
        return false;
    }

    // Verify ECDSA signature
    ret = mbedtls_pk_verify(&pk, MBEDTLS_MD_SHA256, hash, sizeof(hash), sigBuf, sigLen);
    
    mbedtls_pk_free(&pk);

    if (ret != 0) {
        Serial.printf("Signature mismatch: -0x%04x\n", -ret);
        return false;
    }

    return true;
}

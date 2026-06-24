#include "SecurityManager.h"
#include "config.h"
#include <ArduinoJson.h>
#include <time.h>
#include <BearSSLHelpers.h>
#include <PolledTimeout.h>
#include <base64.h>

// BearSSL
#include "bearssl/bearssl_hash.h"
#include "bearssl/bearssl_ec.h"
#include "bearssl/bearssl_pem.h"

SecurityManager::SecurityManager() {}

void SecurityManager::init() {
}

QRPayload SecurityManager::processQR(const String& rawJson) {
    QRPayload result;
    result.isValid = false;
    result.failReason = "Unknown Error";

    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, rawJson);

    if (error) {
        Serial.print("JSON parse failed: ");
        Serial.println(error.c_str());
        result.failReason = "Invalid JSON";
        result.uid = "UNKNOWN";
        return result;
    }

    if (!doc.containsKey("uid") || !doc.containsKey("iat") || !doc.containsKey("qid") || !doc.containsKey("sig")) {
        Serial.println("Missing required QR fields");
        result.failReason = "Missing Fields";
        result.uid = doc.containsKey("uid") ? doc["uid"].as<String>() : "UNKNOWN";
        return result;
    }

    result.uid = doc["uid"].as<String>();
    result.iat = doc["iat"].as<time_t>();
    result.qid = doc["qid"].as<String>();
    result.doorId = doc.containsKey("door") ? doc["door"].as<String>() : String(DOOR_ID);
    result.sig = doc["sig"].as<String>();
    
    if (doc.containsKey("cmd")) result.cmd = doc["cmd"].as<String>();
    if (doc.containsKey("ssid")) result.ssid = doc["ssid"].as<String>();
    if (doc.containsKey("pass")) result.pass = doc["pass"].as<String>();
    if (doc.containsKey("libId")) result.libId = doc["libId"].as<String>();

    time_t now;
    time(&now);
    
    if (now > result.iat + QR_VALIDITY_SECONDS) {
        Serial.println("QR Code Expired!");
        result.failReason = "Expired QR";
        return result;
    }
    
    if (now < result.iat - 60) {
        Serial.println("QR Code is from the future? Check NTP sync.");
        result.failReason = "Future Timestamp (NTP Out of Sync?)";
        return result;
    }

    String payloadStr = result.uid + String(result.iat) + result.qid;
    
    if (doc.containsKey("cmd") && doc["cmd"].as<String>() == "PROVISION") {
        if (!doc.containsKey("ssid") || !doc.containsKey("pass") || !doc.containsKey("libId")) {
            result.failReason = "Provisioning QR Missing Fields";
            return result;
        }
        payloadStr += doc["ssid"].as<String>() + doc["pass"].as<String>() + doc["libId"].as<String>();
    }

    if (!verifyECDSASignature(payloadStr, result.sig)) {
        Serial.println("Signature verification failed!");
        result.failReason = "Invalid Signature (Forged/Tampered)";
        return result;
    }

    time_t expiry = result.iat + QR_VALIDITY_SECONDS;
    if (!checkReplay(result.qid, expiry)) {
        Serial.println("Replay attack detected!");
        result.failReason = "Replay Attack (Already Scanned)";
        return result;
    }

    result.isValid = true;
    result.failReason = "";
    return result;
}

bool SecurityManager::checkReplay(const String& qid, time_t expiry) {
    for (const auto& entry : replayCache) {
        if (entry.qid == qid) {
            return false;
        }
    }
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

// Helper context for PEM decoding
struct PemDecodeCtx {
    br_x509_pkey* pkey;
    br_skey_decoder_context skey_ctx;
    bool in_pkey;
};

size_t decodeBase64(const char* input, unsigned char* output) {
    static const unsigned char b64_table[256] = {
        0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
        0,0,0,0, 0,0,0,0, 0,0,0,62,0,0,0,63,52,53,54,55,56,57,58,59,60,61,0,0,
        0,0,0,0, 0,0,1,2, 3,4,5,6, 7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,
        23,24,25,0,0,0,0,0, 0,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,
        43,44,45,46,47,48,49,50,51,0,0,0,0,0
    };
    
    size_t in_len = strlen(input);
    size_t out_len = 0;
    int val = 0, valb = -8;
    for (size_t i = 0; i < in_len; i++) {
        unsigned char c = input[i];
        if (c == '=') break;
        if (c < 43 || c > 122) continue;
        val = (val << 6) + b64_table[c];
        valb += 6;
        if (valb >= 0) {
            output[out_len++] = (val >> valb) & 0xFF;
            valb -= 8;
        }
    }
    return out_len;
}

bool SecurityManager::verifyECDSASignature(const String& payloadStr, const String& signatureBase64) {
    // 1. Hash the payload with SHA256
    br_sha256_context hash_ctx;
    br_sha256_init(&hash_ctx);
    br_sha256_update(&hash_ctx, payloadStr.c_str(), payloadStr.length());
    unsigned char hash[32];
    br_sha256_out(&hash_ctx, hash);

    // 2. Decode the Base64 signature
    unsigned char decodedSig[128];
    size_t decodedSigLen = decodeBase64(signatureBase64.c_str(), decodedSig);
    if (decodedSigLen == 0) {
        Serial.println("Failed to decode base64 signature");
        return false;
    }

    // 3. Decode the PEM Public Key using BearSSL
    BearSSL::PublicKey* pubKey = new BearSSL::PublicKey(ECDSA_PUBLIC_KEY);
    if (!pubKey->isEC()) {
        Serial.println("Public key is not EC");
        delete pubKey;
        return false;
    }
    
    const br_ec_public_key* ec_key = pubKey->getEC();
    if (ec_key == nullptr) {
        Serial.println("Failed to get EC public key");
        delete pubKey;
        return false;
    }

    // 4. Verify signature using i15 implementation
    const br_ec_impl* ec_impl = br_ec_get_default();
    int verify_result = br_ecdsa_i15_vrfy_asn1(ec_impl, hash, sizeof(hash), ec_key, decodedSig, decodedSigLen);

    delete pubKey;
    return verify_result == 1;
}

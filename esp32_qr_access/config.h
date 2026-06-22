#ifndef CONFIG_H
#define CONFIG_H

// ==========================================
// PINS CONFIGURATION
// ==========================================
// GM67 UART Pins
#define QR_RX_PIN 16
#define QR_TX_PIN 17
// Relay Pin
#define RELAY_PIN 4

// ==========================================
// DOOR / LIBRARY CONFIGURATION
// ==========================================
// Set these for each specific physical installation
const char* LIBRARY_ID = "f6cd1770-e936-4457-b2ef-bf17bce9f730";
const char* DOOR_ID = "MAIN_GATE";
const int DOOR_UNLOCK_TIME_MS = 3000;

// ==========================================
// SECURITY CONFIGURATION
// ==========================================
// How long a QR code is valid from its 'iat' timestamp
const int QR_VALIDITY_SECONDS = 30;

// ECDSA P-256 Public Key (Embed the generated key here)
const char* ECDSA_PUBLIC_KEY = 
"-----BEGIN PUBLIC KEY-----\n"
"MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEC85xxeLkVs63ZhRsQhw1qY+Dg1oC\n"
"9vywPPmk6HS/QM6n9asB4qrMdfXDuHqEYcM5PN/q2Ndjk7qe/CVwHmHHEQ==\n"
"-----END PUBLIC KEY-----\n";

// ==========================================
// NETWORK CONFIGURATION
// ==========================================
// NTP Server
const char* NTP_SERVER = "pool.ntp.org";
const long  GMT_OFFSET_SEC = 19800; // GMT+5:30 (India)
const int   DAYLIGHT_OFFSET_SEC = 0;

// API Endpoints
const char* API_LOG_ENDPOINT = "https://www.focusx.in/api/hardware/log";
// Note: Put the hardware API key here. Ensure it matches the RELAY_API_KEY in the backend.
const char* API_HARDWARE_KEY = "my_secret_library_door_key_123";

#endif // CONFIG_H

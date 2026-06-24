#ifndef CONFIG_H
#define CONFIG_H

// ==========================================
// PINS CONFIGURATION FOR NODEMCU (ESP8266)
// ==========================================
// SoftwareSerial Pins for GM67 Scanner
// D1 (GPIO 5) as RX (connect to TX of GM67)
// D2 (GPIO 4) as TX (connect to RX of GM67)
#define QR_RX_PIN 5
#define QR_TX_PIN 4

// Relay Pin
// D5 (GPIO 14)
#define RELAY_PIN 14

// ==========================================
// DOOR / LIBRARY CONFIGURATION
// ==========================================
const char* LIBRARY_ID = "f6cd1770-e936-4457-b2ef-bf17bce9f730";
const char* DOOR_ID = "MAIN_GATE";
const int DOOR_UNLOCK_TIME_MS = 3000;

// ==========================================
// SECURITY CONFIGURATION
// ==========================================
// How long a QR code is valid from its 'iat' timestamp
const int QR_VALIDITY_SECONDS = 30;

// ECDSA P-256 Public Key (Matched with Vercel backend)
const char* ECDSA_PUBLIC_KEY = 
"-----BEGIN PUBLIC KEY-----\n"
"MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEW/PFKOgkA5hCa8UX9Hvvd2zhwBZw\n"
"dEUzSEUpsDMlhztFicJt02ZPe/nH5wiRFhG3bKlwEFk9ejlEJ9By7/w5YQ==\n"
"-----END PUBLIC KEY-----\n";

// ==========================================
// NETWORK CONFIGURATION
// ==========================================
const char* NTP_SERVER = "pool.ntp.org";
const long  GMT_OFFSET_SEC = 19800; // GMT+5:30 (India)
const int   DAYLIGHT_OFFSET_SEC = 0;

// API Endpoints
const char* API_LOG_ENDPOINT = "https://www.focusx.in/api/hardware/log";
const char* API_HARDWARE_KEY = "my_secret_library_door_key_123";

#endif // CONFIG_H

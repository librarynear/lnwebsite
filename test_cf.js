const crypto = require('crypto');
const fs = require('fs');

const clientId = 'CF11106039D8MIUCPNBP8S73BD77T0';
const clientSecret = 'cfsk_ma_test_8c076c72be35c1433a5e311da0ec0701_2f674e93';
const publicKey = fs.readFileSync('cashfree_public_key.pem', 'utf8');

const timestamp = Math.floor(Date.now() / 1000);
const dataToSign = `${clientId}.${timestamp}`;

const encrypted = crypto.publicEncrypt(
  {
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  },
  Buffer.from(dataToSign)
);

const signature = encrypted.toString('base64');

fetch('https://sandbox.cashfree.com/verification/digilocker', {
  method: 'POST',
  headers: {
    'x-client-id': clientId,
    'x-client-secret': clientSecret,
    'x-cf-signature': signature,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'Test User' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);

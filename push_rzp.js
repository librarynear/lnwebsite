const { execSync } = require('child_process');

const keys = [
  { key: 'NEXT_PUBLIC_RAZORPAY_KEY_ID', value: 'rzp_live_T0EyusPjkCnyoa' },
  { key: 'RAZORPAY_KEY_SECRET', value: '8c69g4uPsyjFWDYw3y4ygco1' }
];

for (const { key, value } of keys) {
  console.log(`Pushing ${key}...`);
  try {
    try {
      // Ignore errors if it doesn't exist
      execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' });
    } catch(e) {}
    
    execSync(`npx vercel env add ${key} production`, {
      input: value,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    console.log(`Successfully added ${key}`);
  } catch (e) {
    console.log(`Failed to add ${key}:`, e.message);
  }
}
console.log("Done pushing Razorpay keys!");

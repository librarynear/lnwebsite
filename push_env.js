const fs = require('fs');
const { execSync } = require('child_process');

console.log("Reading .env file...");
const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');

for (const line of lines) {
  if (!line || line.trim() === '' || line.startsWith('#')) continue;
  
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    // Remove surrounding quotes if they exist
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }

    console.log(`Pushing ${key}...`);
    try {
      // Pipe the value into vercel env add for production environment
      execSync(`npx vercel env add ${key} production`, {
        input: value,
        stdio: ['pipe', 'inherit', 'inherit'] // pipe stdin, inherit stdout/stderr
      });
      console.log(`Successfully added ${key}`);
    } catch (e) {
      console.log(`Failed to add ${key}:`, e.message);
    }
  }
}
console.log("Done pushing environment variables!");

const { readFileSync } = require('fs');
const { PrismaClient } = require('@prisma/client');

const env = readFileSync('.env.local', 'utf-8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1]] = val;
  }
});

const prisma = new PrismaClient();
prisma.library.findMany({ select: { id: true, name: true } }).then(console.log).finally(() => process.exit(0));

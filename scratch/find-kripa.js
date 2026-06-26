require('dotenv').config({ path: '.env.prod' });
const { Client } = require('pg');

async function findKripaLibrary() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query("SELECT id, name FROM \"Library\" WHERE name ILIKE '%kripa%'");
    
    if (res.rows.length > 0) {
      const library = res.rows[0];
      console.log(`Library found: ${library.name}`);
      console.log(`Library ID: ${library.id}`);
    } else {
      console.log("No library containing 'kripa' was found in the database.");
    }
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

findKripaLibrary();

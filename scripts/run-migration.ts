import { Client } from "pg";
import * as fs from "fs";

const dbUrl = process.env.DATABASE_URL;

async function runMigration() {
  if (!dbUrl) {
    console.error("No DATABASE_URL found.");
    return;
  }
  
  const client = new Client({
    connectionString: dbUrl,
  });

  try {
    await client.connect();
    console.log("Connected to database.");
    
    const sql = fs.readFileSync("supabase/migrations/20260710011000_geospatial_search_fix.sql", "utf-8");
    console.log("Applying migration...");
    
    await client.query(sql);
    console.log("Migration applied successfully!");
    
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.end();
  }
}

runMigration();

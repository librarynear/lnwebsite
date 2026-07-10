import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

// Load environment variables manually since this is a script
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE_URL = "https://www.librarynear.com"; // Adjust if different

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const keyFile = path.resolve(process.cwd(), "service-account.json");
if (!fs.existsSync(keyFile)) {
  console.error("❌ Error: service-account.json not found in the root directory.");
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: keyFile,
  scopes: ["https://www.googleapis.com/auth/indexing"],
});

async function main() {
  console.log("🚀 Starting Google Indexing API push...");
  
  // Get an authenticated client
  const authClient = await auth.getClient();
  const indexing = google.indexing({ version: "v3", auth: authClient as any });

  // 1. Fetch the 200 most recently updated libraries
  const { data: libraries, error } = await supabase
    .from("library_branches")
    .select("slug, city, updated_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error || !libraries) {
    console.error("❌ Database error:", error);
    return;
  }

  console.log(`✅ Found ${libraries.length} libraries to index. (Quota max is 200/day by default).`);

  let successCount = 0;
  let errorCount = 0;

  for (const lib of libraries) {
    const url = `${SITE_URL}/${lib.city.toLowerCase()}/library/${lib.slug}`;
    
    try {
      const res = await indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: "URL_UPDATED",
        },
      });
      
      console.log(`[OK] Indexed: ${url}`);
      successCount++;
    } catch (err: any) {
      console.error(`[ERROR] Failed to index ${url}:`, err.message);
      errorCount++;
      // If we hit a 429 Too Many Requests, break out of the loop
      if (err.message && err.message.includes("Quota exceeded")) {
        console.error("⚠️ Quota exceeded! Stopping early.");
        break;
      }
    }

    // Delay slightly to prevent rate limits (Google recommends staggering)
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`\n🎉 Finished! Successfully pinged Google with ${successCount} URLs. (${errorCount} failed).`);
}

main().catch(console.error);

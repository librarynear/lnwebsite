import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  console.log("🧹 Scanning for anomalies (Temples, Hospitals, Clinics)...");

  const keywords = ["mandir", "temple", "hospital", "clinic"];
  
  // Construct the .or() query string dynamically
  const orQuery = keywords.map(kw => `display_name.ilike.%${kw}%`).join(',');

  const { data: anomalies, error } = await supabase
    .from("library_branches")
    .select("id, display_name")
    .or(orQuery);

  if (error) {
    console.error("❌ Database error:", error);
    return;
  }

  if (!anomalies || anomalies.length === 0) {
    console.log("✅ No anomalies found! The database is clean.");
    return;
  }

  console.log(`⚠️ Found ${anomalies.length} anomalous records. Deleting them now...`);

  let deletedCount = 0;
  for (const record of anomalies) {
    console.log(`   DELETING: ${record.display_name}`);
    
    // Delete related reviews and images manually
    await supabase.from("library_reviews").delete().eq("library_branch_id", record.id);
    await supabase.from("library_images").delete().eq("library_branch_id", record.id);
    
    // Delete the main record
    const { error: delError } = await supabase.from("library_branches").delete().eq("id", record.id);
    if (delError) {
      console.error(`   ❌ Failed to delete ${record.display_name}:`, delError);
    } else {
      deletedCount++;
    }
  }

  console.log(`\n🎉 Anomaly cleanup complete! Deleted ${deletedCount} non-library records.`);
}

main().catch(console.error);

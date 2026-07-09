import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Resetting Data Enrichment State...");

  // 1. Delete all Google reviews to ensure a clean slate
  console.log("Deleting Google reviews...");
  const { error: reviewError } = await supabase
    .from("library_reviews")
    .delete()
    .eq("source", "google");

  if (reviewError) {
    console.error("Failed to delete reviews:", reviewError);
    return;
  }

  // 2. Set all libraries back to is_enriched = false
  console.log("Resetting is_enriched flags...");
  const { error: libError } = await supabase
    .from("library_branches")
    .update({ is_enriched: false })
    .not("is_enriched", "is", null);
  
  if (libError) {
    console.error("Failed to reset library flags:", libError);
    return;
  }

  console.log("Database reset complete! Ready for perfect re-fetch.");
}

main().catch(console.error);

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nmlcevndnmdgewdvlkou.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbGNldm5kbm1kZ2V3ZHZsa291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ4OTgyNiwiZXhwIjoyMDkxMDY1ODI2fQ.PXou5SPnnnFd-wm8GA7WXvLWzhpiCaQIkscHarr1QUM";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inspectDB() {
  console.log("Inspecting library_branches...");
  const { data: totalBranches, error: err1, count: totalCount } = await supabase
    .from("library_branches")
    .select("id", { count: "exact" });
    
  if (err1) {
      console.error(err1);
      return;
  }
  
  const { count: latLngCount, error: err2 } = await supabase
    .from("library_branches")
    .select("id", { count: "exact" })
    .not("latitude", "is", null);

  const { data: sampleLibraries, error: err3 } = await supabase
    .from("library_branches")
    .select("display_name, latitude, longitude, formatted_address, aggregate_rating, review_count, locality")
    .limit(3);

  console.log(`Total Libraries: ${totalCount}`);
  console.log(`Libraries with Lat/Lng: ${latLngCount}`);
  console.log("Sample Data:", JSON.stringify(sampleLibraries, null, 2));
  
  console.log("\nInspecting library_images...");
  const { count: totalImages } = await supabase
    .from("library_images")
    .select("id", { count: "exact" });
    
  console.log(`Total Images: ${totalImages}`);
}

inspectDB();

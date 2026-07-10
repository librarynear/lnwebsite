import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: libs } = await supabase
    .from("library_branches")
    .select("id, display_name")
    .ilike("display_name", "%Achievers’ Library, Dwarka%");
    
  if (libs && libs.length > 0) {
    const lib = libs[0];
    console.log(`Checking DB for: ${lib.display_name} (ID: ${lib.id})`);
    
    const { data: dbImages } = await supabase.from("library_images").select("*").eq("library_branch_id", lib.id);
    const { data: dbReviews } = await supabase.from("library_reviews").select("*").eq("library_branch_id", lib.id);
    
    console.log("DB Images Count:", dbImages?.length);
    console.log("DB Reviews Count:", dbReviews?.length);
  }
}

main();

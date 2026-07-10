import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data } = await supabase
    .from("library_reviews")
    .select("id, reviewer_name, review_text, source")
    .ilike("review_text", "%Very poor study environment%");
    
  console.log(JSON.stringify(data, null, 2));
}

main();

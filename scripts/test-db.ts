import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data } = await supabase
    .from("library_reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);
    
  console.log(JSON.stringify(data, null, 2));
}

main();

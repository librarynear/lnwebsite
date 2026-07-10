import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: libs } = await supabase
    .from("library_branches")
    .select("id, display_name, city, formatted_address")
    .ilike("display_name", "Achievers Library%")
    .eq("city", "Delhi");
    
  console.log(libs);
}

main();

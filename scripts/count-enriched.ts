import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { count: enrichedCount } = await supabase
    .from("library_branches")
    .select("*", { count: "exact", head: true })
    .eq("is_enriched", true);
    
  const { count: totalCount } = await supabase
    .from("library_branches")
    .select("*", { count: "exact", head: true });

  console.log(`Enriched: ${enrichedCount} / ${totalCount}`);
}

main();

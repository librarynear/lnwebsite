import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: images, error } = await supabase
    .from("library_images")
    .select("library_branch_id");

  if (error) {
    console.error(error);
    return;
  }

  const counts: Record<string, number> = {};
  for (const img of images) {
    counts[img.library_branch_id] = (counts[img.library_branch_id] || 0) + 1;
  }

  const dist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const libId in counts) {
    const c = counts[libId];
    dist[c] = (dist[c] || 0) + 1;
  }

  console.log("Distribution of image counts per library:");
  console.log(dist);
}

main();

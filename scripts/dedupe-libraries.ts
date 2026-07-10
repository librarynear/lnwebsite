import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  console.log("🔍 Scanning for duplicate libraries by formatted_address...");

  let allLibraries: any[] = [];
  let page = 0;
  const pageSize = 1000;

  // Fetch all libraries that have been enriched
  while (true) {
    const { data, error } = await supabase
      .from("library_branches")
      .select("id, display_name, formatted_address, created_at")
      .not("formatted_address", "is", null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("❌ Database error:", error);
      return;
    }

    if (!data || data.length === 0) break;
    allLibraries = allLibraries.concat(data);

    if (data.length < pageSize) break;
    page++;
  }

  console.log(`✅ Fetched ${allLibraries.length} enriched libraries.`);

  // Group by formatted_address
  const addressGroups: { [address: string]: any[] } = {};
  for (const lib of allLibraries) {
    // Normalize address for better matching (lowercase, trim)
    const normalizedAddress = lib.formatted_address.toLowerCase().trim();
    if (!addressGroups[normalizedAddress]) {
      addressGroups[normalizedAddress] = [];
    }
    addressGroups[normalizedAddress].push(lib);
  }

  let totalDuplicatesDeleted = 0;

  for (const [address, group] of Object.entries(addressGroups)) {
    if (group.length > 1) {
      console.log(`\n⚠️ Found ${group.length} duplicates for address: "${address.substring(0, 50)}..."`);
      
      // Sort the group by the length of the display_name, ascending.
      // E.g., "Achievers Library" (17) is kept over "Achievers Library, Rohini" (25)
      group.sort((a, b) => a.display_name.length - b.display_name.length);

      const keep = group[0];
      const duplicates = group.slice(1);

      console.log(`   KEEPING: ${keep.display_name} (ID: ${keep.id})`);

      for (const dup of duplicates) {
        console.log(`   DELETING: ${dup.display_name} (ID: ${dup.id})`);
        
        // Delete related reviews and images manually to avoid foreign key constraint errors if CASCADE isn't set
        await supabase.from("library_reviews").delete().eq("library_branch_id", dup.id);
        await supabase.from("library_images").delete().eq("library_branch_id", dup.id);
        
        // Delete the main record
        const { error: delError } = await supabase.from("library_branches").delete().eq("id", dup.id);
        if (delError) {
          console.error(`   ❌ Failed to delete ${dup.id}:`, delError);
        } else {
          totalDuplicatesDeleted++;
        }
      }
    }
  }

  console.log(`\n🎉 Deduplication complete! Deleted ${totalDuplicatesDeleted} duplicate libraries.`);
}

main().catch(console.error);

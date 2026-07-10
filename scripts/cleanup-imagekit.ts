import { createClient } from "@supabase/supabase-js";
import ImageKit from "imagekit";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY!;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY!;
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const imagekit = new ImageKit({
  publicKey: IMAGEKIT_PUBLIC_KEY,
  privateKey: IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: IMAGEKIT_URL_ENDPOINT,
});

async function main() {
  console.log("🧹 Starting ImageKit Orphaned File Cleanup...");

  // 1. Fetch ALL valid image URLs from Supabase
  console.log("Fetching valid image URLs from Database...");
  let allValidUrls = new Set<string>();
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("library_images")
      .select("imagekit_url")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("❌ Database error:", error);
      return;
    }

    if (!data || data.length === 0) break;

    data.forEach((row) => {
      if (row.imagekit_url) {
        // Just store the actual URL to compare against ImageKit's url
        allValidUrls.add(row.imagekit_url.split("?")[0]); // Ignore query params if any
      }
    });

    if (data.length < pageSize) break;
    page++;
  }

  console.log(`✅ Found ${allValidUrls.size} valid images linked in the database.`);

  // 2. Fetch all files from ImageKit
  console.log("Fetching files from ImageKit /library-photos folder...");
  let skip = 0;
  const limit = 100;
  let orphanedFiles: any[] = [];
  let totalScanned = 0;

  while (true) {
    try {
      const files: any = await imagekit.listFiles({
        skip: skip,
        limit: limit,
        path: "/library-photos",
      });

      if (!files || files.length === 0) break;
      
      for (const file of files) {
        totalScanned++;
        const fileUrl = file.url.split("?")[0];
        
        if (!allValidUrls.has(fileUrl)) {
          orphanedFiles.push({ fileId: file.fileId, url: file.url, name: file.name });
        }
      }

      skip += limit;
    } catch (err) {
      console.error("❌ ImageKit list files error:", err);
      break;
    }
  }

  console.log(`🔍 Scanned ${totalScanned} total files in ImageKit.`);
  console.log(`🗑️ Found ${orphanedFiles.length} orphaned files to delete.`);

  // 3. Delete orphaned files
  let deletedCount = 0;
  for (const orphan of orphanedFiles) {
    try {
      await imagekit.deleteFile(orphan.fileId);
      deletedCount++;
      if (deletedCount % 50 === 0) {
        console.log(`Deleted ${deletedCount} / ${orphanedFiles.length}...`);
      }
    } catch (err: any) {
      console.error(`Failed to delete ${orphan.name}:`, err.message);
    }
  }

  console.log(`\n🎉 Cleanup complete! Successfully deleted ${deletedCount} orphaned photos from ImageKit.`);
}

main().catch(console.error);

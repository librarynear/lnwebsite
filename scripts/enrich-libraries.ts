import { createClient } from "@supabase/supabase-js";
import ImageKit from "imagekit";
import fetch from "node-fetch";

// Load environment variables (assuming this is run via `tsx --env-file=.env.local`)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY!;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY!;
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const imagekit = new ImageKit({
  publicKey: IMAGEKIT_PUBLIC_KEY,
  privateKey: IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: IMAGEKIT_URL_ENDPOINT,
});

async function findPlaceId(libraryName: string, lat: number, lng: number) {
  const query = encodeURIComponent(`${libraryName}`);
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?fields=place_id&input=${query}&inputtype=textquery&locationbias=circle:1000@${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json() as any;
  
  if (data.status === "OK" && data.candidates && data.candidates.length > 0) {
    return data.candidates[0].place_id;
  }
  return null;
}

async function getPlaceDetails(placeId: string) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,formatted_phone_number,formatted_address,reviews,photos,user_ratings_total,opening_hours&key=${GOOGLE_MAPS_API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json() as any;
  
  if (data.status === "OK") {
    return data.result;
  }
  return null;
}

async function uploadToImageKit(photoReference: string, libraryName: string, index: number) {
  const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
  
  // Clean up name for filename
  const cleanName = libraryName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const fileName = `${cleanName}-photo-${index}.jpg`;

  try {
    const uploadResponse = await imagekit.upload({
      file: photoUrl, // ImageKit supports uploading directly from URL
      fileName: fileName,
      folder: "/library-photos",
    });
    return uploadResponse.url;
  } catch (error) {
    console.error(`Failed to upload photo to ImageKit for ${libraryName}:`, error);
    return null;
  }
}

async function processLibrary(library: any) {
  console.log(`Processing: ${library.display_name} (ID: ${library.id})`);
  
  // 1. Find Place ID
  const placeId = await findPlaceId(library.display_name, library.latitude, library.longitude);
  if (!placeId) {
    console.log(`❌ Place not found on Google Maps: ${library.display_name}`);
    await supabase.from("library_branches").update({ is_enriched: true }).eq("id", library.id);
    return;
  }
  
  // 2. Get Details
  const details = await getPlaceDetails(placeId);
  if (!details) {
    console.log(`❌ Could not fetch details for place ID: ${placeId}`);
    return;
  }

  const updates: any = {
    is_enriched: true,
  };

  if (details.formatted_address) updates.formatted_address = details.formatted_address;
  if (details.rating) updates.aggregate_rating = details.rating;
  if (details.user_ratings_total) updates.review_count = details.user_ratings_total;
  if (details.formatted_phone_number) updates.phone_number = details.formatted_phone_number;
  
  // 3. Delete old images
  await supabase.from("library_images").delete().eq("library_branch_id", library.id);

  // 4. Upload & Insert New Photos (Max 3)
  if (details.photos && details.photos.length > 0) {
    const photosToProcess = details.photos.slice(0, 3);
    let sortOrder = 1;
    
    for (const photo of photosToProcess) {
      const ikUrl = await uploadToImageKit(photo.photo_reference, library.display_name, sortOrder);
      if (ikUrl) {
        await supabase.from("library_images").insert({
          library_branch_id: library.id,
          imagekit_url: ikUrl,
          is_cover: sortOrder === 1,
          sort_order: sortOrder,
        });
        sortOrder++;
      }
    }
  }

  // 5. Insert Reviews
  if (details.reviews && details.reviews.length > 0) {
    // Delete any existing google reviews for this library
    await supabase.from("library_reviews").delete().eq("library_branch_id", library.id).eq("source", "google");
    
    const reviewInserts = details.reviews.map((r: any) => ({
      library_branch_id: library.id,
      rating: r.rating,
      review_text: r.text,
      status: "published",
      reviewer_name: r.author_name,
      reviewer_photo_url: r.profile_photo_url,
      source: "google",
      created_at: r.time ? new Date(r.time * 1000).toISOString() : new Date().toISOString()
    }));

    if (reviewInserts.length > 0) {
      await supabase.from("library_reviews").insert(reviewInserts);
    }
  }

  // 6. Update Library
  await supabase.from("library_branches").update(updates).eq("id", library.id);
  console.log(`✅ Successfully enriched: ${library.display_name}`);
}

async function main() {
  console.log("Starting Data Enrichment Script...");
  
  let totalProcessed = 0;
  
  while (true) {
    // Supabase has a default API limit of 1,000 rows per query. 
    // We will keep fetching batches of 1000 until none are left.
    const { data: libraries, error } = await supabase
      .from("library_branches")
      .select("id, display_name, latitude, longitude")
      .is("is_enriched", false)
      .limit(1000);

    if (error) {
      console.error("Error fetching libraries:", error);
      break;
    }

    if (!libraries || libraries.length === 0) {
      console.log(`\n🎉 No more libraries to enrich! Total processed this session: ${totalProcessed}`);
      break;
    }

    console.log(`\nFetched batch of ${libraries.length} libraries. Starting processing...`);
    
    for (const lib of libraries) {
      await processLibrary(lib);
      totalProcessed++;
    }
  }
}

main().catch(console.error);

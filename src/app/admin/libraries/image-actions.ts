"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

export async function uploadLibraryImage(libraryId: string, formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) return { success: false, error: "No file provided" };

  try {
    // 1. Upload to ImageKit via REST API
    const imagekitFormData = new FormData();
    imagekitFormData.append("file", file);
    imagekitFormData.append("fileName", file.name || "admin_upload.jpg");
    imagekitFormData.append("folder", `/libraries/${libraryId}/`);

    // Basic auth: Private key as username, empty password
    const authHeader = "Basic " + Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY! + ":").toString("base64");

    const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: imagekitFormData,
    });

    if (!uploadResponse.ok) {
      const errData = await uploadResponse.json();
      console.error("ImageKit upload error:", errData);
      return { success: false, error: "Failed to upload to ImageKit" };
    }

    const { url, fileId } = await uploadResponse.json();

    // 2. Insert into Supabase
    const { error: dbError } = await supabaseServer.from("library_images").insert({
      library_branch_id: libraryId,
      imagekit_url: url,
    });

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return { success: false, error: "Failed to save image record to database" };
    }

    revalidatePath("/admin/libraries");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (err: any) {
    console.error("Upload error:", err);
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}

export async function deleteLibraryImage(imageId: string) {
  const { error } = await supabaseServer.from("library_images").delete().eq("id", imageId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath("/admin/libraries");
  revalidatePath("/", "layout");
  return { success: true };
}

"use server";

import { supabaseServer } from "@/lib/supabase-server";
import type { Tables } from "@/types/supabase";
import { refreshLibraryProfileCompletenessScore } from "@/lib/library-profile-score-server";
import {
  getLibraryCacheTarget,
  revalidateLibraryContent,
} from "@/lib/revalidate-library-content";
import { requireApprovedStaff, requireLibraryMutationAccess } from "@/lib/staff-access";
import { uploadImageKitFile } from "@/lib/server/imagekit";

type LibraryImage = Tables<"library_images">;

export async function uploadLibraryImage(libraryId: string, formData: FormData) {
  await requireLibraryMutationAccess(libraryId);
  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file provided" };

  try {
    const { url } = await uploadImageKitFile({
      file,
      fileName: (file.name || "admin_upload.jpg").replace(/[^\w.-]+/g, "-").replace(/\.{2,}/g, "."),
      folder: `/libraries/${libraryId}/`,
    });

    const { data: insertedImage, error: dbError } = await supabaseServer
      .from("library_images")
      .insert({
        library_branch_id: libraryId,
        imagekit_url: url,
      })
      .select("*")
      .single<LibraryImage>();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return { success: false, error: "Failed to save image record to database" };
    }

    await refreshLibraryProfileCompletenessScore(libraryId);
    revalidateLibraryContent(await getLibraryCacheTarget(libraryId));

    return { success: true, image: insertedImage };
  } catch (err: unknown) {
    console.error("Upload error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

export async function deleteLibraryImage(imageId: string) {
  await requireApprovedStaff(["admin", "sales"]);

  const { data: imageRecord, error: fetchError } = await supabaseServer
    .from("library_images")
    .select("library_branch_id")
    .eq("id", imageId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!imageRecord?.library_branch_id) {
    return { success: false, error: "Image not found." };
  }

  await requireLibraryMutationAccess(imageRecord.library_branch_id);

  const { error } = await supabaseServer.from("library_images").delete().eq("id", imageId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  if (imageRecord?.library_branch_id) {
    await refreshLibraryProfileCompletenessScore(imageRecord.library_branch_id);
  }

  revalidateLibraryContent(
    imageRecord?.library_branch_id
      ? await getLibraryCacheTarget(imageRecord.library_branch_id)
      : null,
  );
  return { success: true };
}

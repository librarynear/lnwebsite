import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase-server";
import { uploadImageKitFile } from "@/lib/server/imagekit";
import { refreshLibraryProfileCompletenessScore } from "@/lib/library-profile-score-server";
import { getLibraryCacheTarget, revalidateLibraryContent } from "@/lib/revalidate-library-content";
import type { Tables } from "@/types/supabase";

type LibraryImage = Tables<"library_images">;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: staffUser } = await supabaseServer
    .from("staff_users")
    .select("role, is_approved")
    .eq("user_id", user.id)
    .maybeSingle();

  const allowed = staffUser?.is_approved && (staffUser.role === "admin" || staffUser.role === "sales");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const libraryId = String(formData.get("libraryId") ?? "").trim();
  const file = formData.get("file");
  if (!libraryId || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing upload data" }, { status: 400 });
  }

  try {
    const uploaded = await uploadImageKitFile({
      file,
      fileName: file.name || "admin_upload.jpg",
      folder: `/libraries/${libraryId}/`,
    });

    const { data: insertedImage, error: dbError } = await supabaseServer
      .from("library_images")
      .insert({
        library_branch_id: libraryId,
        imagekit_url: uploaded.url,
      })
      .select("*")
      .single<LibraryImage>();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json({ error: "Failed to save image record to database" }, { status: 500 });
    }

    await refreshLibraryProfileCompletenessScore(libraryId);
    revalidateLibraryContent(await getLibraryCacheTarget(libraryId));

    return NextResponse.json({ success: true, image: insertedImage });
  } catch (error) {
    console.error("Admin library image upload failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

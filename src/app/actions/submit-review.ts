"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import type { Database } from "@/types/supabase";

export async function submitReview(
  libraryBranchId: string,
  rating: number,
  reviewText: string,
  pathname: string
) {
  const supabase = createServerActionClient<Database>({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to leave a review." };
  }

  if (rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5." };
  }

  if (!reviewText.trim()) {
    return { error: "Review text cannot be empty." };
  }

  const { error } = await supabase
    .from("library_reviews")
    .upsert(
      {
        library_branch_id: libraryBranchId,
        user_id: user.id,
        rating,
        review_text: reviewText.trim(),
        status: "published",
      },
      { onConflict: "library_branch_id,user_id" }
    );

  if (error) {
    console.error("Failed to submit review:", error);
    if (error.code === '23505') {
       return { error: "You have already reviewed this library." };
    }
    return { error: "Failed to submit your review. Please try again later." };
  }

  revalidateTag("library-cards");
  revalidatePath(pathname);
  
  return { success: true };
}

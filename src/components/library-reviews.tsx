"use client";

import { useState } from "react";
import { Star, User } from "lucide-react";
import { ReviewModal } from "./review-modal";
import { Button } from "./ui/button";

export type ReviewType = {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

export function LibraryReviews({
  libraryBranchId,
  reviews,
  aggregateRating,
  reviewCount,
}: {
  libraryBranchId: string;
  reviews: ReviewType[];
  aggregateRating: number;
  reviewCount: number;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
    return { star, count, percentage };
  });

  return (
    <section className="py-8 md:py-12 border-t border-gray-100" id="reviews">
      <div className="flex flex-col md:flex-row gap-10">
        {/* Left column: Summary */}
        <div className="md:w-1/3">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Reviews</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="text-6xl font-bold tracking-tighter text-gray-900">
              {aggregateRating > 0 ? aggregateRating.toFixed(1) : "0.0"}
            </div>
            <div>
              <div className="flex text-amber-400 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i <= Math.round(aggregateRating) ? "fill-current" : "text-gray-200 fill-gray-200"}`}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-gray-500">Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            {distribution.map(({ star, percentage }) => (
              <div key={star} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                <span className="w-2">{star}</span>
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            ))}
          </div>

          <Button onClick={() => setIsModalOpen(true)} size="lg" className="w-full rounded-full font-semibold shadow-md shadow-primary/20 text-md h-12">
            Write a Review
          </Button>
        </div>

        {/* Right column: Review List */}
        <div className="md:w-2/3 space-y-6 md:mt-16">
          {reviews.length === 0 ? (
            <div className="text-center py-16 bg-gray-50/50 rounded-3xl border border-gray-100">
              <p className="text-gray-500 font-medium text-lg">No reviews yet. Be the first to review this library!</p>
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="pb-6 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-gray-200">
                    {review.profiles?.avatar_url ? (
                      <img src={review.profiles.avatar_url} alt={review.profiles.full_name || "User"} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{review.profiles?.full_name || "Anonymous Student"}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i <= review.rating ? "fill-current" : "text-gray-200 fill-gray-200"}`} />
                        ))}
                      </div>
                      <span>•</span>
                      <span className="font-medium">{new Date(review.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap ml-16">{review.review_text}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        libraryBranchId={libraryBranchId}
      />
    </section>
  );
}

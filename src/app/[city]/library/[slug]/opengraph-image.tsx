import { ImageResponse } from "next/og";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "edge";
export const alt = "Library Details";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { slug, city } = await params;

  // Capitalize city
  const cityFormatted = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();

  // Fetch library details
  const { data: library } = await supabaseServer
    .from("library_branches")
    .select("display_name, locality, verification_status")
    .eq("slug", slug)
    .single();

  const title = library?.display_name || "Study Library";
  const locality = library?.locality || "Top Rated";
  const isVerified = library?.verification_status === "verified";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
          backgroundImage: "linear-gradient(to bottom right, #f8fafc, #e2e8f0)",
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.05,
            backgroundImage: "radial-gradient(#000 2px, transparent 2px)",
            backgroundSize: "30px 30px",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "40px",
            background: "rgba(255, 255, 255, 0.8)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
            borderRadius: "24px",
            border: "1px solid rgba(0,0,0,0.05)",
            maxWidth: "85%",
            textAlign: "center",
          }}
        >
          {isVerified && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#022c22", // emerald-950
                color: "#10b981", // emerald-500
                padding: "8px 24px",
                borderRadius: "9999px",
                fontSize: 24,
                fontWeight: "bolder",
                marginBottom: "20px",
              }}
            >
              ✓ Verified Library
            </div>
          )}

          <h1
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#0f172a", // slate-900
              marginTop: 0,
              marginBottom: "20px",
              lineHeight: 1.1,
              whiteSpace: "pre-wrap",
            }}
          >
            {title}
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 36,
              color: "#475569", // slate-600
              fontWeight: 500,
            }}
          >
            {locality}, {cityFormatted}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            fontSize: 32,
            fontWeight: "bold",
            color: "#64748b", // slate-500
          }}
        >
          StudyStash.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

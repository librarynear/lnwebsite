import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const PRIVATE_PATHS = [
  "/admin",
  "/api/",
  "/sales",
  "/studio",
  "/saved",
  "/profile",
  "/staff-access",
  "/auth/",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: [
          "Bytespider",
          "CCBot",
          "ClaudeBot",
          "GPTBot",
          "ChatGPT-User",
          "SemrushBot",
          "AhrefsBot",
          "DotBot",
          "PetalBot",
          "DataForSeoBot",
        ],
        disallow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

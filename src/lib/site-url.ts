const DEFAULT_SITE_URL = "https://librarynear.com";

export function getSiteUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    DEFAULT_SITE_URL;

  return rawUrl.replace(/\/+$/, "");
}

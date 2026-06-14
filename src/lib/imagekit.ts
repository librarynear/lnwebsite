import ImageKit from "imagekit";

const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "";
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "";

export const imagekitConfigured = Boolean(publicKey && privateKey && urlEndpoint);

const imagekit = imagekitConfigured
  ? new ImageKit({ publicKey, privateKey, urlEndpoint })
  : null;

/**
 * Upload an image to ImageKit and return its CDN URL.
 *
 * Accepts a Buffer or a base64 string. Storing images on a CDN (instead of as
 * base64 in Postgres) keeps rows small and responses fast at scale.
 *
 * Falls back to an inline data URL only when ImageKit isn't configured (e.g.
 * local dev) so the feature still works without external creds.
 */
export async function uploadImage(
  data: Buffer | string,
  fileName: string,
  folder = "/uploads",
  mimeTypeForFallback = "image/jpeg",
): Promise<string> {
  if (imagekit) {
    const res = await imagekit.upload({
      file: data,
      fileName,
      folder,
      useUniqueFileName: true,
    });
    return res.url;
  }

  // Dev fallback: inline data URL (never used in production where IK is set).
  const base64 = Buffer.isBuffer(data) ? data.toString("base64") : data;
  return `data:${mimeTypeForFallback};base64,${base64}`;
}

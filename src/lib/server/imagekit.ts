import "server-only";

const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const IMAGEKIT_FILE_API_URL = "https://api.imagekit.io/v1/files";

/** Maximum allowed upload size (10 MB) — covers admin and owner uploads. */
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Verify a stored image URL really points at our ImageKit account and, when a
 * userId is given, at that user's owner-submission folder. Prevents an attacker
 * from injecting arbitrary external URLs through hidden form fields.
 */
export function isOwnerSubmissionImageUrl(url: string, userId: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname !== "ik.imagekit.io") return false;
    return parsed.pathname.includes(`/owner-submissions/${userId}/`);
  } catch {
    return false;
  }
}

/** Validate a File is a non-empty image within the size limit. Throws on failure. */
export function assertValidImageFile(file: File, maxBytes: number = MAX_IMAGE_UPLOAD_BYTES) {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No image provided");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }
  if (file.size > maxBytes) {
    throw new Error(`Image must be under ${Math.floor(maxBytes / (1024 * 1024))} MB`);
  }
}

function getImageKitAuthHeader() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("ImageKit private key is not configured");
  }

  return "Basic " + Buffer.from(`${privateKey}:`).toString("base64");
}

export async function uploadImageKitFile({
  file,
  fileName,
  folder,
}: {
  file: File;
  fileName: string;
  folder: string;
}) {
  assertValidImageFile(file);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("folder", folder);

  const response = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: getImageKitAuthHeader(),
    },
    body: formData,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to upload image (${response.status})`);
  }

  const payload = (await response.json()) as { url?: string; fileId?: string };
  if (!payload.url || !payload.fileId) {
    throw new Error("Image upload did not return the expected metadata");
  }

  return {
    url: payload.url,
    fileId: payload.fileId,
  };
}

export async function deleteImageKitFile(fileId: string) {
  if (!fileId) return;

  const response = await fetch(`${IMAGEKIT_FILE_API_URL}/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: {
      Authorization: getImageKitAuthHeader(),
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete image (${response.status})`);
  }
}

export async function getImageKitFileDetails(fileId: string): Promise<{ filePath?: string } | null> {
  if (!fileId) return null;

  const response = await fetch(`${IMAGEKIT_FILE_API_URL}/${encodeURIComponent(fileId)}/details`, {
    method: "GET",
    headers: {
      Authorization: getImageKitAuthHeader(),
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) return null;
  return (await response.json()) as { filePath?: string };
}

export async function cleanupImageKitFiles(fileIds: string[]) {
  for (const fileId of fileIds) {
    try {
      await deleteImageKitFile(fileId);
    } catch (error) {
      console.error(`Failed to clean up ImageKit file ${fileId}:`, error);
    }
  }
}

import "server-only";

const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const IMAGEKIT_FILE_API_URL = "https://api.imagekit.io/v1/files";

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

export async function cleanupImageKitFiles(fileIds: string[]) {
  for (const fileId of fileIds) {
    try {
      await deleteImageKitFile(fileId);
    } catch (error) {
      console.error(`Failed to clean up ImageKit file ${fileId}:`, error);
    }
  }
}

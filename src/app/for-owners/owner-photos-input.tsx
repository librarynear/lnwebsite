"use client";

import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

const MAX_PHOTOS = 3;
const MAX_PHOTO_MB = 5;
const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;

type PhotoPreview = {
  id: string;
  name: string;
  size: number;
  url: string;
};

function fileId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function OwnerPhotosInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [previews, setPreviews] = useState<PhotoPreview[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function setInputFiles(files: File[]) {
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    if (inputRef.current) {
      inputRef.current.files = dataTransfer.files;
    }
  }

  function setValidatedFiles(files: File[]) {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];

    const nextPreviews = files.map((file) => {
      const url = URL.createObjectURL(file);
      previewUrlsRef.current.push(url);
      return {
        id: fileId(file),
        name: file.name,
        size: file.size,
        url,
      };
    });

    setInputFiles(files);
    setPreviews(nextPreviews);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const incomingFiles = Array.from(event.target.files ?? []);
    const existingFiles = Array.from(inputRef.current?.files ?? []);
    setError(null);

    const mergedFiles = [...existingFiles, ...incomingFiles].filter(
      (file, index, current) =>
        current.findIndex((candidate) => fileId(candidate) === fileId(file)) === index,
    );

    const acceptedFiles: File[] = [];
    for (const file of mergedFiles) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed.");
        continue;
      }

      if (file.size > MAX_PHOTO_BYTES) {
        setError(`Each photo must be under ${MAX_PHOTO_MB} MB.`);
        continue;
      }

      acceptedFiles.push(file);
    }

    const nextFiles = [...acceptedFiles].slice(0, MAX_PHOTOS);
    if (acceptedFiles.length > MAX_PHOTOS) {
      setError(`You can upload up to ${MAX_PHOTOS} photos.`);
    }

    setValidatedFiles(nextFiles);
  }

  function removePhoto(id: string) {
    const currentFiles = Array.from(inputRef.current?.files ?? []);
    const nextFiles = currentFiles.filter((file) => fileId(file) !== id);
    setValidatedFiles(nextFiles);
    setError(null);
  }

  function clearPhotos() {
    setValidatedFiles([]);
    setError(null);
  }

  return (
    <div className="space-y-3">
      <label htmlFor="photos" className="text-sm font-medium text-black">Photos <span className="text-destructive">*</span></label>
      <input
        ref={inputRef}
        id="photos"
        name="photos"
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/3 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/6"
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
          <UploadCloud className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold text-black">
          Choose library photos
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          Choose one at a time or multiple together. Up to {MAX_PHOTOS} images, {MAX_PHOTO_MB} MB each
        </span>
      </button>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}

      {previews.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {previews.length} photo{previews.length === 1 ? "" : "s"} selected
            </p>
            <button
              type="button"
              onClick={clearPhotos}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {previews.map((photo) => (
              <div key={photo.id} className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="relative aspect-square bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black shadow-sm backdrop-blur transition-colors hover:bg-white"
                    aria-label={`Remove ${photo.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 px-3 py-2">
                  <ImagePlus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-black">{photo.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatFileSize(photo.size)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

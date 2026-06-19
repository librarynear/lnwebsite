import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("server-only", () => ({}));

import {
  escapePostgrestFilter,
  sanitizeSearchTerm,
  boundSearchTerm,
  MAX_SEARCH_QUERY_LENGTH,
} from "@/lib/postgrest";
import {
  parsePlanDraftsJson,
  normalizePlanDrafts,
  MAX_FEE_PLANS,
  MAX_FEE_PLANS_JSON_BYTES,
} from "@/lib/library-plans";
import { extractCoordinatesFromMapLink } from "@/lib/maps-coordinates";
import { hasValidPlanDescriptions } from "@/lib/owner-form-validation";

describe("Shared PostgREST search helpers", () => {
  it("escapes filter-injection characters", () => {
    const escaped = escapePostgrestFilter("%,id.eq.secret");
    expect(escaped).not.toContain(",id.eq.");
    expect(escaped).toContain("\\,");
  });

  it("sanitizeSearchTerm escapes AND truncates", () => {
    const long = "a".repeat(MAX_SEARCH_QUERY_LENGTH + 50);
    const result = sanitizeSearchTerm(long);
    expect(result.length).toBe(MAX_SEARCH_QUERY_LENGTH);

    const malicious = sanitizeSearchTerm("x%,id.eq.1");
    expect(malicious).toContain("\\,");
  });

  it("boundSearchTerm truncates without escaping", () => {
    const long = "b".repeat(MAX_SEARCH_QUERY_LENGTH + 100);
    expect(boundSearchTerm(long).length).toBe(MAX_SEARCH_QUERY_LENGTH);
    expect(boundSearchTerm("a.b.c")).toBe("a.b.c");
  });

  it("handles null/undefined safely", () => {
    expect(sanitizeSearchTerm(null)).toBe("");
    expect(sanitizeSearchTerm(undefined)).toBe("");
    expect(boundSearchTerm(null)).toBe("");
  });
});

describe("Fee-plan payload caps (DoS protection)", () => {
  it("rejects oversized raw JSON before parsing", () => {
    const huge = JSON.stringify(
      Array.from({ length: 5000 }, () => ({ base_price: 1, duration_key: "monthly" })),
    );
    expect(huge.length).toBeGreaterThan(MAX_FEE_PLANS_JSON_BYTES);
    expect(parsePlanDraftsJson(huge)).toEqual([]);
  });

  it("caps the number of plans normalized", () => {
    const many = Array.from({ length: MAX_FEE_PLANS + 25 }, () => ({
      base_price: 100,
      duration_key: "monthly",
      seat_type: "reserved",
    }));
    const result = normalizePlanDrafts(many);
    expect(result.length).toBeLessThanOrEqual(MAX_FEE_PLANS);
  });

  it("returns [] for malformed JSON", () => {
    expect(parsePlanDraftsJson("{not json")).toEqual([]);
    expect(parsePlanDraftsJson(null)).toEqual([]);
  });

  it("hasValidPlanDescriptions rejects oversized JSON", () => {
    const huge = "x".repeat(MAX_FEE_PLANS_JSON_BYTES + 1);
    expect(hasValidPlanDescriptions(huge)).toBe(false);
  });
});

describe("Map link parsing robustness", () => {
  it("does not throw on malformed percent-encoding", () => {
    expect(() => extractCoordinatesFromMapLink("https://maps.google.com/?q=%E0%A4")).not.toThrow();
    expect(() => extractCoordinatesFromMapLink("%")).not.toThrow();
    expect(() => extractCoordinatesFromMapLink("%zz")).not.toThrow();
  });

  it("returns null for oversized links", () => {
    const huge = "https://maps.google.com/?q=" + "1".repeat(5000);
    expect(extractCoordinatesFromMapLink(huge)).toBeNull();
  });

  it("still extracts valid coordinates", () => {
    const result = extractCoordinatesFromMapLink("https://www.google.com/maps/@28.6139,77.2090,15z");
    expect(result).toEqual({ latitude: 28.6139, longitude: 77.209 });
  });
});

describe("ImageKit URL allowlist", () => {
  let isOwnerSubmissionImageUrl: (url: string, userId: string) => boolean;

  beforeAll(async () => {
    const mod = await import("@/lib/server/imagekit");
    isOwnerSubmissionImageUrl = mod.isOwnerSubmissionImageUrl;
  });

  it("accepts a URL in the user's own owner-submissions folder", () => {
    expect(
      isOwnerSubmissionImageUrl(
        "https://ik.imagekit.io/lib/owner-submissions/user-123/photo.jpg",
        "user-123",
      ),
    ).toBe(true);
  });

  it("rejects another user's folder", () => {
    expect(
      isOwnerSubmissionImageUrl(
        "https://ik.imagekit.io/lib/owner-submissions/user-999/photo.jpg",
        "user-123",
      ),
    ).toBe(false);
  });

  it("rejects non-ImageKit hosts", () => {
    expect(
      isOwnerSubmissionImageUrl("https://evil.com/owner-submissions/user-123/x.jpg", "user-123"),
    ).toBe(false);
  });

  it("rejects non-https and malformed URLs", () => {
    expect(
      isOwnerSubmissionImageUrl("http://ik.imagekit.io/owner-submissions/user-123/x.jpg", "user-123"),
    ).toBe(false);
    expect(isOwnerSubmissionImageUrl("not a url", "user-123")).toBe(false);
  });
});

describe("ImageKit file validation", () => {
  let assertValidImageFile: (file: File, maxBytes?: number) => void;

  beforeAll(async () => {
    const mod = await import("@/lib/server/imagekit");
    assertValidImageFile = mod.assertValidImageFile;
  });

  it("accepts a small image file", () => {
    const file = new File([new Uint8Array(10)], "a.png", { type: "image/png" });
    expect(() => assertValidImageFile(file)).not.toThrow();
  });

  it("rejects non-image files", () => {
    const file = new File([new Uint8Array(10)], "a.exe", { type: "application/octet-stream" });
    expect(() => assertValidImageFile(file)).toThrow(/image/i);
  });

  it("rejects files over the size limit", () => {
    const file = new File([new Uint8Array(20)], "a.png", { type: "image/png" });
    expect(() => assertValidImageFile(file, 10)).toThrow(/MB/);
  });

  it("rejects empty files", () => {
    const file = new File([], "a.png", { type: "image/png" });
    expect(() => assertValidImageFile(file)).toThrow();
  });
});

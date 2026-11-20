import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ supabaseServer: { from: query } }));
vi.mock("@/lib/cities-server", () => ({ getActiveCities: vi.fn(async () => []) }));
vi.mock("@/lib/aspirant-pages", () => ({ getCoachingPlaces: vi.fn(), getPublishedHubs: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ client: {} }));

import { buildLibraryEntries, buildPlacesEntries, countActiveLibraries, renderSitemapIndex } from "@/lib/sitemap-data";

describe("sitemap reliability", () => {
  beforeEach(() => vi.clearAllMocks());

  function databaseResult(result: object) {
    const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue({ ...chain, then: (resolve: (value: object) => void) => resolve(result) });
    chain.order.mockReturnValue(chain);
    chain.range.mockResolvedValue(result);
    query.mockReturnValue(chain);
  }

  it("does not turn a failed count into an empty database", async () => {
    databaseResult({ count: null, error: { message: "Unavailable" } });
    await expect(countActiveLibraries()).rejects.toThrow("Unable to count");
  });

  it("does not publish empty library and place sitemaps after database failures", async () => {
    databaseResult({ data: null, error: { message: "Unavailable" } });
    await expect(buildLibraryEntries(0)).rejects.toThrow("Unable to load sitemap libraries");
    await expect(buildPlacesEntries()).rejects.toThrow("Unable to load sitemap places");
  });

  it("omits unsupported modification dates and escapes XML locations", () => {
    const xml = renderSitemapIndex(["https://www.librarynear.com/sitemaps/pages.xml?a=1&b=2"]);
    expect(xml).not.toContain("<lastmod>");
    expect(xml).toContain("?a=1&amp;b=2</loc>");
  });
});

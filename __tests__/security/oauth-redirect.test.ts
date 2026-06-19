import { describe, it, expect } from "vitest";

describe("OAuth Callback - Redirect Validation", () => {
  const SAFE_PATH_PREFIXES = ["/profile", "/saved", "/for-owners", "/"];

  function isSafeRedirect(path: string): boolean {
    if (!path.startsWith("/")) return false;
    if (path.startsWith("//") || path.startsWith("/\\")) return false;
    if (path.includes("..")) return false;
    if (path.startsWith("/admin") || path.startsWith("/staff-access")) return false;
    return SAFE_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?"),
    );
  }

  describe("blocks malicious redirects", () => {
    it("blocks protocol-relative URLs (//evil.com)", () => {
      expect(isSafeRedirect("//evil.com")).toBe(false);
    });

    it("blocks backslash-relative URLs (/\\evil.com)", () => {
      expect(isSafeRedirect("/\\evil.com")).toBe(false);
    });

    it("blocks absolute URLs (https://evil.com)", () => {
      expect(isSafeRedirect("https://evil.com")).toBe(false);
    });

    it("blocks path traversal (/../etc/passwd)", () => {
      expect(isSafeRedirect("/../etc/passwd")).toBe(false);
    });

    it("blocks redirect to /admin", () => {
      expect(isSafeRedirect("/admin")).toBe(false);
    });

    it("blocks redirect to /admin/team", () => {
      expect(isSafeRedirect("/admin/team")).toBe(false);
    });

    it("blocks redirect to /staff-access", () => {
      expect(isSafeRedirect("/staff-access")).toBe(false);
    });

    it("blocks javascript: protocol", () => {
      expect(isSafeRedirect("javascript:alert(1)")).toBe(false);
    });

    it("blocks data: protocol", () => {
      expect(isSafeRedirect("data:text/html,<script>")).toBe(false);
    });

    it("blocks empty string", () => {
      expect(isSafeRedirect("")).toBe(false);
    });

    it("blocks plain domain without protocol", () => {
      expect(isSafeRedirect("evil.com")).toBe(false);
    });
  });

  describe("allows safe redirects", () => {
    it("allows /profile", () => {
      expect(isSafeRedirect("/profile")).toBe(true);
    });

    it("allows /saved", () => {
      expect(isSafeRedirect("/saved")).toBe(true);
    });

    it("allows /for-owners", () => {
      expect(isSafeRedirect("/for-owners")).toBe(true);
    });

    it("allows / (homepage)", () => {
      expect(isSafeRedirect("/")).toBe(true);
    });

    it("allows /profile with query params", () => {
      expect(isSafeRedirect("/profile?tab=settings")).toBe(true);
    });

    it("allows nested paths under /for-owners", () => {
      expect(isSafeRedirect("/for-owners/submit")).toBe(true);
    });
  });
});

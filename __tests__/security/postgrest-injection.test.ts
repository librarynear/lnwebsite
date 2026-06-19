import { describe, it, expect } from "vitest";

/** Escape characters that have special meaning in PostgREST filter strings */
function escapePostgrestFilter(value: string): string {
  return value.replace(/[\\%_,.()"*]/g, (ch) => `\\${ch}`);
}

describe("PostgREST Filter Injection Prevention", () => {
  describe("escapePostgrestFilter", () => {
    it("escapes commas that could add filter clauses", () => {
      const malicious = "test%,id.eq.secret-uuid";
      const escaped = escapePostgrestFilter(malicious);
      expect(escaped).not.toContain(",id.eq.");
      expect(escaped).toContain("\\,");
    });

    it("escapes dots that could modify operators", () => {
      const malicious = "test.eq.true";
      const escaped = escapePostgrestFilter(malicious);
      expect(escaped).toBe("test\\.eq\\.true");
    });

    it("escapes percent signs", () => {
      const malicious = "100%";
      const escaped = escapePostgrestFilter(malicious);
      expect(escaped).toBe("100\\%");
    });

    it("escapes parentheses (used for grouping in PostgREST)", () => {
      const malicious = "test(or)";
      const escaped = escapePostgrestFilter(malicious);
      expect(escaped).toBe("test\\(or\\)");
    });

    it("escapes double quotes", () => {
      const malicious = 'test"value';
      const escaped = escapePostgrestFilter(malicious);
      expect(escaped).toBe('test\\"value');
    });

    it("escapes asterisks (wildcard)", () => {
      const malicious = "test*";
      const escaped = escapePostgrestFilter(malicious);
      expect(escaped).toBe("test\\*");
    });

    it("escapes backslashes", () => {
      const malicious = "test\\value";
      const escaped = escapePostgrestFilter(malicious);
      expect(escaped).toBe("test\\\\value");
    });

    it("handles combined injection attempts", () => {
      const malicious = "%,is_active.eq.false,display_name.ilike.%";
      const escaped = escapePostgrestFilter(malicious);
      expect(escaped).not.toContain(",is_active");
      expect(escaped).toContain("\\,");
    });

    it("preserves safe characters", () => {
      expect(escapePostgrestFilter("hello world")).toBe("hello world");
      expect(escapePostgrestFilter("café-123")).toBe("café-123");
      expect(escapePostgrestFilter("delhi")).toBe("delhi");
    });

    it("handles empty string", () => {
      expect(escapePostgrestFilter("")).toBe("");
    });

    it("handles unicode", () => {
      expect(escapePostgrestFilter("लाइब्रेरी")).toBe("लाइब्रेरी");
    });

    it("produces safe filter string when interpolated", () => {
      const userInput = "%,id.eq.secret,display_name.ilike.%";
      const escaped = escapePostgrestFilter(userInput);
      const filterStr = `display_name.ilike.%${escaped}%,locality.ilike.%${escaped}%`;

      const commaCount = (filterStr.match(/(?<!\\),/g) || []).length;
      expect(commaCount).toBe(1);
    });
  });
});

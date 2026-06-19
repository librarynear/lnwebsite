import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, getClientIp, type RateLimitConfig } from "@/lib/rate-limit";

vi.mock("server-only", () => ({}));

describe("Rate Limiter", () => {
  const config: RateLimitConfig = {
    id: "test-limiter",
    maxRequests: 3,
    windowMs: 60_000,
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows requests under the limit", () => {
    const result1 = checkRateLimit("192.168.1.1", config);
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = checkRateLimit("192.168.1.1", config);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = checkRateLimit("192.168.1.1", config);
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    checkRateLimit("10.0.0.1", config);
    checkRateLimit("10.0.0.1", config);
    checkRateLimit("10.0.0.1", config);

    const blocked = checkRateLimit("10.0.0.1", config);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    checkRateLimit("10.0.0.2", config);
    checkRateLimit("10.0.0.2", config);
    checkRateLimit("10.0.0.2", config);

    const blocked = checkRateLimit("10.0.0.2", config);
    expect(blocked.success).toBe(false);

    vi.advanceTimersByTime(60_001);

    const afterReset = checkRateLimit("10.0.0.2", config);
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(2);
  });

  it("tracks different IPs independently", () => {
    checkRateLimit("1.1.1.1", config);
    checkRateLimit("1.1.1.1", config);
    checkRateLimit("1.1.1.1", config);

    const blockedIp1 = checkRateLimit("1.1.1.1", config);
    expect(blockedIp1.success).toBe(false);

    const differentIp = checkRateLimit("2.2.2.2", config);
    expect(differentIp.success).toBe(true);
  });

  it("tracks different limiter IDs independently", () => {
    const config2: RateLimitConfig = { id: "other-limiter", maxRequests: 3, windowMs: 60_000 };

    checkRateLimit("3.3.3.3", config);
    checkRateLimit("3.3.3.3", config);
    checkRateLimit("3.3.3.3", config);

    const blocked = checkRateLimit("3.3.3.3", config);
    expect(blocked.success).toBe(false);

    const otherLimiter = checkRateLimit("3.3.3.3", config2);
    expect(otherLimiter.success).toBe(true);
  });

  it("handles extremely high request volumes", () => {
    const strictConfig: RateLimitConfig = { id: "strict", maxRequests: 1, windowMs: 1000 };
    const first = checkRateLimit("flood-ip", strictConfig);
    expect(first.success).toBe(true);

    for (let i = 0; i < 1000; i++) {
      const result = checkRateLimit("flood-ip", strictConfig);
      expect(result.success).toBe(false);
    }
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("extracts IP from x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "9.8.7.6" });
    expect(getClientIp(headers)).toBe("9.8.7.6");
  });

  it("extracts IP from cf-connecting-ip", () => {
    const headers = new Headers({ "cf-connecting-ip": "11.22.33.44" });
    expect(getClientIp(headers)).toBe("11.22.33.44");
  });

  it("returns 'unknown' when no IP headers present", () => {
    const headers = new Headers({});
    expect(getClientIp(headers)).toBe("unknown");
  });

  it("prioritizes x-forwarded-for over other headers", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1",
      "x-real-ip": "2.2.2.2",
      "cf-connecting-ip": "3.3.3.3",
    });
    expect(getClientIp(headers)).toBe("1.1.1.1");
  });

  it("trims whitespace from forwarded IP", () => {
    const headers = new Headers({ "x-forwarded-for": "  4.4.4.4  , 5.5.5.5" });
    expect(getClientIp(headers)).toBe("4.4.4.4");
  });
});

import { describe, expect, it } from "vitest";
import { detectFileType } from "@/lib/storage/file-type";
import { OBJECT_KEY_PATTERN } from "@/lib/storage/drivers";
import { formatYearRange } from "@/lib/format";
import { lifecycleAction, nextPublishedAt } from "@/lib/services/content";
import { looksLikeSpam } from "@/lib/services/contact";
import { referrerDomain } from "@/lib/services/analytics";
import { windowStart } from "@/lib/security/rate-limit";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)).concat(new Array(16).fill(0)));

describe("upload type detection", () => {
  it("recognises allowed formats by magic bytes", () => {
    expect(detectFileType(bytes([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(detectFileType(bytes([0x89], "PNG"))?.ext).toBe("png");
    expect(detectFileType(bytes("RIFF", [0, 0, 0, 0], "WEBP"))?.ext).toBe("webp");
    expect(detectFileType(bytes("%PDF-1.7"))?.isImage).toBe(false);
  });
  it("rejects SVG, HTML and unknown content regardless of file name", () => {
    expect(detectFileType(bytes("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    expect(detectFileType(bytes("<!doctype html><script>"))).toBeNull();
    expect(detectFileType(new Uint8Array(4))).toBeNull();
  });
  it("only accepts server-generated object keys", () => {
    expect(OBJECT_KEY_PATTERN.test("0b9f6a1c-1234-4abc-8def-0123456789ab.png")).toBe(true);
    expect(OBJECT_KEY_PATTERN.test("../../etc/passwd")).toBe(false);
    expect(OBJECT_KEY_PATTERN.test("0b9f6a1c-1234-4abc-8def-0123456789ab.svg")).toBe(false);
  });
});

describe("date ranges", () => {
  it("formats only the dates that exist", () => {
    expect(formatYearRange("2024-01-01T00:00:00Z", null, true)).toBe("2024 – Present");
    expect(formatYearRange("2023-01-01T00:00:00Z", "2024-06-01T00:00:00Z")).toBe("2023 – 2024");
    expect(formatYearRange("2024-01-01T00:00:00Z", "2024-06-01T00:00:00Z")).toBe("2024");
    expect(formatYearRange(null, null)).toBeNull();
  });
});

describe("publication rules", () => {
  it("names lifecycle transitions for the audit log", () => {
    expect(lifecycleAction(null, "DRAFT", true)).toBe("create");
    expect(lifecycleAction("DRAFT", "PUBLISHED", false)).toBe("publish");
    expect(lifecycleAction("PUBLISHED", "DRAFT", false)).toBe("unpublish");
    expect(lifecycleAction("PUBLISHED", "PUBLISHED", false)).toBe("update");
  });
  it("keeps the first publication date and clears it when unpublished", () => {
    const first = new Date("2025-01-01");
    expect(nextPublishedAt("PUBLISHED", first)).toBe(first);
    expect(nextPublishedAt("PUBLISHED", null, first)).toBe(first);
    expect(nextPublishedAt("DRAFT", first)).toBeNull();
  });
});

describe("abuse heuristics", () => {
  const now = 1_000_000;
  it("flags honeypot and instant submissions", () => {
    expect(looksLikeSpam("http://spam", String(now - 60_000), now)).toBe(true);
    expect(looksLikeSpam("", String(now - 500), now)).toBe(true);
    expect(looksLikeSpam("", String(now - 60_000), now)).toBe(false);
  });
  it("does not block visitors without JavaScript", () => {
    expect(looksLikeSpam(null, "", now)).toBe(false);
  });
  it("buckets rate-limit windows", () => {
    expect(windowStart(125_000, 60_000).getTime()).toBe(120_000);
  });
});

describe("analytics privacy", () => {
  it("keeps only external referrer hosts", () => {
    expect(referrerDomain("https://www.google.com/search?q=secret", "example.com")).toBe("google.com");
    expect(referrerDomain("https://example.com/projects", "example.com")).toBeNull();
    expect(referrerDomain("not a url", "example.com")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE, sessionIsFresh } from "@/lib/auth/session";

describe("admin session lifetime", () => {
  const loginAt = 1_800_000_000;
  const at = (seconds: number) => (loginAt + seconds) * 1000;

  it("lasts 10 minutes from sign-in", () => {
    expect(SESSION_MAX_AGE).toBe(600);
    expect(sessionIsFresh(loginAt, at(0))).toBe(true);
    expect(sessionIsFresh(loginAt, at(599))).toBe(true);
    expect(sessionIsFresh(loginAt, at(600))).toBe(false);
  });

  it("treats tokens without a sign-in time (issued before this rule) as expired", () => {
    expect(sessionIsFresh(undefined)).toBe(false);
    expect(sessionIsFresh("1800000000")).toBe(false);
  });
});

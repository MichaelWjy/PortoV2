import { describe, expect, it } from "vitest";
import { googleIdentity } from "@/lib/auth/google";

describe("Google identity", () => {
  it("accepts a verified e-mail and normalises it", () => {
    expect(googleIdentity({ sub: "1234", email: "Owner@Gmail.com", email_verified: true, name: "Owner" })).toEqual({ subject: "1234", email: "owner@gmail.com", name: "Owner" });
  });

  it.each([
    ["an unverified e-mail", { sub: "1", email: "a@b.co", email_verified: false }],
    ["a missing verification flag", { sub: "1", email: "a@b.co" }],
    ["a string verification flag", { sub: "1", email: "a@b.co", email_verified: "true" }],
    ["a missing subject", { email: "a@b.co", email_verified: true }],
    ["a missing e-mail", { sub: "1", email_verified: true }],
  ])("refuses %s", (_label, profile) => {
    expect(googleIdentity(profile)).toBeNull();
  });

  it("refuses an absent profile", () => {
    expect(googleIdentity(undefined)).toBeNull();
  });
});

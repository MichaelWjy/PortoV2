export type OAuthIdentity = { subject: string; email: string; name: string | null };

/**
 * Identity from a Google ID token, or null when it cannot be trusted for the allow-list:
 * Google must have verified the e-mail address, and `sub` (the stable account ID) must be present.
 */
export function googleIdentity(profile: Record<string, unknown> | null | undefined): OAuthIdentity | null {
  if (!profile) return null;
  const { sub, email, email_verified, name } = profile;
  if (typeof sub !== "string" || !sub) return null;
  if (typeof email !== "string" || !email.includes("@")) return null;
  if (email_verified !== true) return null;
  return { subject: sub, email: email.trim().toLowerCase(), name: typeof name === "string" ? name : null };
}

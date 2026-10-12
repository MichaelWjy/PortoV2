import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { findActiveAdmin } from "@/lib/services/admin-users";
import { adminSessionActive } from "@/lib/services/admin-sessions";

export type Admin = { id: string; email: string; name: string | null };

/**
 * The single authorization check for admin pages, Server Actions and Route Handlers.
 * The session only proves identity; the database decides whether that identity is still an active admin,
 * so revoking a user takes effect on their next request. The session must also still have its refresh session
 * (lib/services/admin-sessions.ts), so signing out ends every copy of the session cookie at once.
 */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const session = (await auth()) as { user?: { id?: string }; sid?: string } | null;
  const id = session?.user?.id;
  if (!id || !session?.sid) return null;
  const [user, live] = await Promise.all([findActiveAdmin(id), adminSessionActive(session.sid)]);
  return user && live ? { id: user.id, email: user.email, name: user.name } : null;
});

export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

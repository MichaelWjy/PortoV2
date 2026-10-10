import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { findActiveAdmin } from "@/lib/services/admin-users";

export type Admin = { id: string; email: string; name: string | null };

/**
 * The single authorization check for admin pages, Server Actions and Route Handlers.
 * The session only proves identity; the database decides whether that identity is still an active admin,
 * so revoking a user takes effect on their next request.
 */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await findActiveAdmin(id);
  return user ? { id: user.id, email: user.email, name: user.name } : null;
});

export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

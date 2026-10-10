import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/portfolio/Logo";
import { ThemeToggle } from "@/components/portfolio/ThemeToggle";
import { signOutAction } from "./actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await connection();
  // Server-side gate for every page below. Actions re-check on their own (see lib/admin/actions.ts).
  const admin = await requireAdmin();
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-head">
          <a href="/" className="logo" target="_blank" rel="noopener" aria-label="MW, open the public site">
            <Logo />
          </a>
          <ThemeToggle />
        </div>
        <AdminNav />
        <div className="who">
          <span>{admin.name ?? admin.email}</span>
          <form action={signOutAction}>
            <button className="adm-btn adm-btn-sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}

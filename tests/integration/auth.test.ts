import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => auth(), signOut: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

import { prisma } from "@/lib/db";
import { authorizeOAuthSignIn } from "@/lib/services/admin-users";
import { getAdmin } from "@/lib/auth/guard";
import { deleteRecord, saveProject, setAdminActive } from "@/app/admin/(panel)/actions";
import { createAdmin, resetDatabase } from "../support/db";

beforeEach(async () => {
  await resetDatabase();
  auth.mockReset();
});

const isRedirectTo = (path: string) => (e: unknown) => String((e as { digest?: string }).digest ?? "").includes(path);

describe("Google sign-in authorization", () => {
  it("rejects identities that are not on the allow-list", async () => {
    expect(await authorizeOAuthSignIn({ subject: "sub-1", email: "stranger@example.test", name: null })).toBeNull();
    expect(await prisma.user.count()).toBe(0);
  });

  it("links an allow-listed e-mail to its Google account on first sign-in", async () => {
    await createAdmin("Owner@Example.test".toLowerCase());
    const user = await authorizeOAuthSignIn({ subject: "sub-1", email: "OWNER@example.test", name: null });
    expect(user?.providerSubject).toBe("sub-1");
    expect(user?.lastLoginAt).not.toBeNull();
  });

  it("refuses a different Google account that reuses a linked e-mail", async () => {
    await createAdmin("owner@example.test");
    await authorizeOAuthSignIn({ subject: "sub-1", email: "owner@example.test", name: null });
    expect(await authorizeOAuthSignIn({ subject: "sub-attacker", email: "owner@example.test", name: null })).toBeNull();
  });

  it("refuses revoked administrators", async () => {
    const u = await createAdmin("owner@example.test");
    await prisma.user.update({ where: { id: u.id }, data: { isActive: false } });
    expect(await authorizeOAuthSignIn({ subject: "sub-1", email: "owner@example.test", name: null })).toBeNull();
  });
});

describe("server-side admin guard", () => {
  it("returns null without a session", async () => {
    auth.mockResolvedValue(null);
    expect(await getAdmin()).toBeNull();
  });

  it("re-checks the database, so revocation applies to existing sessions", async () => {
    const u = await createAdmin();
    auth.mockResolvedValue({ user: { id: u.id } });
    expect((await getAdmin())?.id).toBe(u.id);
    await prisma.user.update({ where: { id: u.id }, data: { isActive: false } });
    expect(await getAdmin()).toBeNull();
  });

  it("blocks unauthenticated Server Action calls before touching data", async () => {
    auth.mockResolvedValue(null);
    const fd = new FormData();
    for (const [k, v] of Object.entries({ title: "X", slug: "x", projectType: "t", shortDescription: "s", description: "d", status: "PUBLISHED" })) fd.set(k, v);
    await expect(saveProject({}, fd)).rejects.toSatisfy(isRedirectTo("/admin/login"));
    await expect(deleteRecord("project", "ckxxxxxxxxxxxxxxxxxxxxxxx")).rejects.toSatisfy(isRedirectTo("/admin/login"));
    expect(await prisma.project.count()).toBe(0);
  });

  it("validates input and creates content for an authorized admin", async () => {
    const u = await createAdmin();
    auth.mockResolvedValue({ user: { id: u.id } });
    const bad = new FormData();
    bad.set("slug", "Not A Slug");
    const res = await saveProject({}, bad);
    expect(res.errors?.slug).toBeTruthy();
    expect(res.errors?.title).toBeTruthy();
  });

  it("prevents an admin from deactivating themselves", async () => {
    const u = await createAdmin();
    auth.mockResolvedValue({ user: { id: u.id } });
    expect((await setAdminActive(u.id, false)).ok).toBeFalsy();
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.isActive).toBe(true);
  });
});

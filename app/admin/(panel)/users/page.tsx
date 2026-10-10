import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/admin/ui";
import { RecordButton } from "@/components/admin/RecordButton";
import { EntityForm } from "@/components/admin/EntityForm";
import { addAdmin, setAdminActive } from "../actions";

export const metadata = { title: "Administrators" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader
        title="Administrators"
        description="Only these e-mail addresses may sign in, and only with Google. The first sign-in links the address to that Google account."
      />
      <div className="adm-table-wrap" style={{ marginBottom: 28 }}>
        <table className="adm-table">
          <thead>
            <tr>
              <th scope="col">E-mail</th>
              <th scope="col">Name</th>
              <th scope="col">Google linked</th>
              <th scope="col">Last sign-in</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.name ?? "—"}</td>
                <td>{u.providerSubject ? "Yes" : "Not yet"}</td>
                <td>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                <td>{u.isActive ? "Active" : "Revoked"}</td>
                <td className="actions">
                  {u.id === me.id ? (
                    <span className="adm-muted">You</span>
                  ) : (
                    <RecordButton
                      action={setAdminActive.bind(null, u.id, !u.isActive)}
                      label={u.isActive ? "Revoke" : "Restore"}
                      variant={u.isActive ? "danger" : "default"}
                      confirm={u.isActive ? `Revoke admin access for ${u.email}?` : undefined}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 12 }}>Allow another administrator</h2>
      <EntityForm
        fields={[
          { name: "email", label: "Google account e-mail", type: "email", required: true },
          { name: "name", label: "Name", type: "text" },
        ]}
        values={{}}
        action={addAdmin}
        submitLabel="Allow"
      />
    </>
  );
}

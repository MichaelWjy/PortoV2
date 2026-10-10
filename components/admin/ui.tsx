import Link from "next/link";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: { href: string; label: string } }) {
  return (
    <div className="adm-head">
      <div>
        <h1>{title}</h1>
        {description && <p className="adm-muted">{description}</p>}
      </div>
      {action && (
        <Link className="adm-btn adm-btn-primary" href={action.href}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "PUBLISHED" || status === "NEW" ? "on" : status === "ARCHIVED" ? "off" : "";
  return <span className={`adm-badge ${tone}`}>{status.toLowerCase()}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="adm-empty">{children}</p>;
}

export function Saved({ show }: { show: boolean }) {
  return show ? (
    <p role="status" className="adm-ok" style={{ marginBottom: 16 }}>
      Saved.
    </p>
  ) : null;
}

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

/** Previous/next links for server-paginated admin lists. `href(n)` builds the URL of page n, keeping filters. */
export function Pager({ page, pages, href, prev = "← Previous", next = "Next →" }: { page: number; pages: number; href: (n: number) => string; prev?: string; next?: string }) {
  if (pages <= 1) return null;
  return (
    <nav className="adm-filters" aria-label="Pagination" style={{ marginTop: 16 }}>
      {page > 1 && (
        <Link className="adm-btn adm-btn-sm" href={href(page - 1)}>
          {prev}
        </Link>
      )}
      <span className="adm-muted" aria-current="page">
        Page {page} of {pages}
      </span>
      {page < pages && (
        <Link className="adm-btn adm-btn-sm" href={href(page + 1)}>
          {next}
        </Link>
      )}
    </nav>
  );
}

/** Reads ?page= safely: a positive whole number, otherwise 1. */
export const pageParam = (v: string | string[] | undefined) => Math.max(1, Math.floor(Number(v)) || 1);

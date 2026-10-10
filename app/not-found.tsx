import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap" style={{ minHeight: "100svh", display: "grid", placeContent: "center", gap: 20, textAlign: "center" }}>
      <span className="mono" style={{ color: "var(--mut)" }}>
        404
      </span>
      <h1 className="h">Wrong turn.</h1>
      <p className="lead">This page does not exist or is no longer published.</p>
      <div>
        <Link className="btn w" href="/">
          Back to the start
        </Link>
      </div>
    </main>
  );
}

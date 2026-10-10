"use client";

/** Generic error boundary: never shows error details to visitors (the digest helps match server logs). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="wrap" style={{ minHeight: "100svh", display: "grid", placeContent: "center", gap: 20, textAlign: "center" }}>
      <h1 className="h">Something went wrong.</h1>
      <p className="lead">Please try again in a moment.{error.digest ? ` (Reference ${error.digest})` : ""}</p>
      <div>
        <button className="btn w" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}

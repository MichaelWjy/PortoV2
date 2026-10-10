/** Runs once when the server starts: exit on bad configuration instead of serving errors. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./instrumentation-node");
}

/** Server errors go to stdout as one structured line (picked up by Docker logs / any log shipper). */
export async function onRequestError(error: unknown, request: { path: string; method: string }) {
  const e = error as { message?: string; digest?: string };
  console.error(JSON.stringify({ level: "error", msg: e.message, digest: e.digest, method: request.method, path: request.path.split("?")[0] }));
}

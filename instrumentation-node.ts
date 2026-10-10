// Node.js-only startup check, loaded from instrumentation.ts.
try {
  await import("./lib/env");
} catch (e) {
  // Next.js logs hook errors but keeps serving; a misconfigured server must not stay up.
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
export {};

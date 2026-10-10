/** An expected failure whose message is safe to show to the admin or visitor. */
export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceError";
  }
}

/** Maps Prisma constraint errors to safe messages; anything else is logged and hidden. */
export function toSafeMessage(e: unknown, context: string): string {
  if (e instanceof ServiceError) return e.message;
  const code = (e as { code?: string })?.code;
  if (code === "P2002") return "That value is already used by another record (it must be unique).";
  if (code === "P2003") return "This record is referenced elsewhere or references a missing record.";
  if (code === "P2025") return "The record no longer exists.";
  console.error(`[${context}]`, e);
  return "Something went wrong. Please try again.";
}

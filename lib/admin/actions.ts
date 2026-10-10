import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { idSchema, toFieldErrors } from "@/lib/validation/schemas";
import { toSafeMessage } from "@/lib/services/errors";
import type { FormState } from "./form-state";

/** Reads only the keys the schema knows about (no mass assignment); `arrays` are multi-value fields. */
export function formToObject(fd: FormData, keys: string[], arrays: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = arrays.includes(k) ? fd.getAll(k).map(String) : (fd.get(k) ?? undefined);
  return out;
}

function schemaKeys(schema: z.ZodType): string[] {
  // Object schemas (optionally wrapped by superRefine, which keeps the same `shape` in zod 4).
  const shape = (schema as unknown as { shape?: Record<string, unknown> }).shape;
  if (!shape) throw new Error("Admin form schemas must be object schemas");
  return Object.keys(shape);
}

/**
 * Shared Server Action body for admin create/update forms: authorize, validate, save, then either
 * redirect to the list (create) or report success (update).
 */
export async function handleSave<S extends z.ZodType>(
  fd: FormData,
  schema: S,
  save: (id: string | null, data: z.output<S>, actorId: string) => Promise<{ id: string }>,
  opts: { listPath: string; arrays?: string[]; singleton?: boolean },
): Promise<FormState> {
  const admin = await requireAdmin();
  const rawId = opts.singleton ? null : fd.get("id");
  const id = rawId ? idSchema.safeParse(rawId) : null;
  if (id && !id.success) return { message: "Invalid record id." };

  const parsed = schema.safeParse(formToObject(fd, schemaKeys(schema), opts.arrays));
  if (!parsed.success) return { message: "Please fix the highlighted fields.", errors: toFieldErrors(parsed.error) };

  try {
    await save(id?.data ?? null, parsed.data, admin.id);
  } catch (e) {
    return { message: toSafeMessage(e, `admin:${opts.listPath}`) };
  }
  revalidatePath(opts.listPath);
  if (!id && !opts.singleton) redirect(`${opts.listPath}?saved=1`);
  return { ok: true, message: "Saved." };
}

/** Shared body for single-record actions (delete, publish, status). Returns a message on failure. */
export async function handleRecordAction(rawId: unknown, run: (id: string, actorId: string) => Promise<unknown>, listPath: string): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(rawId);
  if (!id.success) return { message: "Invalid record id." };
  try {
    await run(id.data, admin.id);
  } catch (e) {
    return { message: toSafeMessage(e, `admin:${listPath}`) };
  }
  revalidatePath(listPath);
  return { ok: true };
}

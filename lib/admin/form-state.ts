import type { FieldErrors } from "@/lib/validation/schemas";

export type FormState = { ok?: boolean; message?: string; errors?: FieldErrors };
export const initialFormState: FormState = {};

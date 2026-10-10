"use server";

import { contactSchema, toFieldErrors, type FieldErrors } from "@/lib/validation/schemas";
import { createContactMessage, looksLikeSpam } from "@/lib/services/contact";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { clientIp, hashValue } from "@/lib/security/request";

export type ContactState = { status: "idle" | "success" | "error"; message?: string; errors?: FieldErrors; values?: Record<string, string> };

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return { status: "error", message: "Please fix the highlighted fields.", errors: toFieldErrors(parsed.error), values };

  // Bots get the same success response so they learn nothing; nothing is stored.
  if (looksLikeSpam(formData.get("website"), formData.get("startedAt"))) {
    return { status: "success", message: "Thanks! Your message has been sent." };
  }

  try {
    if (!(await consumeRateLimit(`contact:${hashValue(await clientIp())}`, RATE_LIMITS.contact))) {
      return { status: "error", message: "Too many messages from your network. Please try again in a few minutes.", values };
    }
    await createContactMessage(parsed.data);
    return { status: "success", message: "Thanks! Your message has been sent." };
  } catch (e) {
    console.error("[contact] failed to store message", e);
    return { status: "error", message: "Your message could not be sent right now. Please try again later.", values };
  }
}

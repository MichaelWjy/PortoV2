"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContact, type ContactState } from "@/app/(public)/actions";

const initial: ContactState = { status: "idle" };

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initial);
  // Written after mount so server markup stays deterministic; feeds the "too fast to be human" check.
  const startedAt = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (startedAt.current) startedAt.current.value = String(Date.now());
  }, []);

  const err = (name: string) => state.errors?.[name];
  const field = (name: string) => ({
    name,
    id: `contact-${name}`,
    defaultValue: state.status === "success" ? "" : state.values?.[name],
    "aria-invalid": err(name) ? true : undefined,
    "aria-describedby": err(name) ? `contact-${name}-error` : undefined,
  });
  const error = (name: string) =>
    err(name) && (
      <span className="err" id={`contact-${name}-error`}>
        {err(name)}
      </span>
    );

  return (
    <form className="form" action={action} noValidate key={state.status === "success" ? "sent" : "form"} aria-label="Contact form">
      <label htmlFor="contact-name">
        <span className="mono">Name</span>
        <input {...field("name")} autoComplete="name" required maxLength={100} />
        {error("name")}
      </label>
      <label htmlFor="contact-email">
        <span className="mono">E-mail</span>
        <input {...field("email")} type="email" autoComplete="email" required maxLength={200} />
        {error("email")}
      </label>
      <label htmlFor="contact-subject">
        <span className="mono">Subject (optional)</span>
        <input {...field("subject")} maxLength={150} />
        {error("subject")}
      </label>
      <label htmlFor="contact-message">
        <span className="mono">Message</span>
        <textarea {...field("message")} required minLength={10} maxLength={5000} />
        {error("message")}
      </label>
      <div className="hp" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="startedAt" ref={startedAt} defaultValue="" />
      <div>
        <button className="btn w" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send message"} <span aria-hidden="true">↗</span>
        </button>
      </div>
      <p role="status" aria-live="polite" className={state.status === "success" ? "ok" : state.status === "error" ? "err" : ""}>
        {state.message}
      </p>
    </form>
  );
}

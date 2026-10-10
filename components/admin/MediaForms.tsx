"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/admin/form-state";

type Action = (s: FormState, fd: FormData) => Promise<FormState>;

function Status({ state }: { state: FormState }) {
  const msg = state.message ?? Object.values(state.errors ?? {})[0];
  return msg ? (
    <small role="status" className={state.ok ? "adm-ok" : "adm-error"}>
      {msg}
    </small>
  ) : null;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf";

export function UploadForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="adm-card" style={{ maxWidth: 640, marginBottom: 24 }}>
      <h2>Upload</h2>
      <label className="adm-field">
        <span className="adm-muted">File (JPEG, PNG, WebP, GIF, AVIF or PDF, max 4 MB)</span>
        <input className="adm-input" type="file" name="file" accept={ACCEPT} required />
      </label>
      <label className="adm-field">
        <span className="adm-muted">Alt text (describe the image for screen readers)</span>
        <input className="adm-input" name="altText" maxLength={300} />
      </label>
      <div className="adm-inline">
        <button className="adm-btn adm-btn-primary" type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function AltForm({ action, id, altText }: { action: Action; id: string; altText: string }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} style={{ display: "grid", gap: 6 }}>
      <input type="hidden" name="id" value={id} />
      <label className="adm-muted" htmlFor={`alt-${id}`} style={{ fontSize: 12 }}>
        Alt text
      </label>
      <div className="adm-inline">
        <input id={`alt-${id}`} className="adm-input" name="altText" defaultValue={altText} maxLength={300} />
        <button className="adm-btn adm-btn-sm" type="submit" disabled={pending}>
          Save
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function ReplaceForm({ action, id }: { action: Action; id: string }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} style={{ display: "grid", gap: 6 }}>
      <input type="hidden" name="id" value={id} />
      <label className="adm-muted" htmlFor={`rep-${id}`} style={{ fontSize: 12 }}>
        Replace file (references keep working)
      </label>
      <div className="adm-inline">
        <input id={`rep-${id}`} className="adm-input" type="file" name="file" accept={ACCEPT} required />
        <button className="adm-btn adm-btn-sm" type="submit" disabled={pending}>
          {pending ? "…" : "Replace"}
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import type { FormState } from "@/lib/admin/form-state";

type Props = {
  /** A bound Server Action (e.g. deleteRecord.bind(null, "project", id)). */
  action: () => Promise<FormState>;
  label: string;
  confirm?: string;
  variant?: "danger" | "default";
};

/** Small button for single-record actions with an optional confirmation and inline error. */
export function RecordButton({ action, label, confirm, variant = "default" }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="adm-inline">
      <button
        type="button"
        className={`adm-btn adm-btn-sm ${variant === "danger" ? "adm-btn-danger" : ""}`}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            const res = await action();
            if (!res.ok) setError(res.message ?? "Action failed.");
          });
        }}
      >
        {pending ? "…" : label}
      </button>
      {error && (
        <span role="alert" className="adm-error">
          {error}
        </span>
      )}
    </span>
  );
}

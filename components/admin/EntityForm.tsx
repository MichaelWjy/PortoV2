"use client";

import { startTransition, useActionState, useState } from "react";
import { initialFormState, type FormState } from "@/lib/admin/form-state";
import type { AssetOption, Field, RouteStop, Values } from "./fields";
import { RouteEditor } from "./RouteEditor";
import { AssetPicker } from "./AssetPicker";

type Props = {
  fields: Field[];
  values: Values;
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  id?: string;
  submitLabel?: string;
  assets?: AssetOption[];
  routeStops?: RouteStop[];
  /** Shows a live preview of the journey-map card next to the form. */
  milestonePreview?: boolean;
};

const str = (v: Values[string]) => (typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : "");

/** Schema-driven admin form. Validation happens on the server (Zod); errors come back per field. */
export function EntityForm({ fields, values, action, id, submitLabel = "Save", assets = [], routeStops = [], milestonePreview }: Props) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [live, setLive] = useState<Values>(values);
  const set = (name: string, v: Values[string]) => setLive((prev) => ({ ...prev, [name]: v }));

  const err = (name: string) => state.errors?.[name];
  const describedBy = (f: Field) => [("help" in f && f.help) ? `${f.name}-help` : null, err(f.name) ? `${f.name}-error` : null].filter(Boolean).join(" ") || undefined;
  const common = (f: Field) => ({
    id: `f-${f.name}`,
    name: f.name,
    "aria-invalid": err(f.name) ? true : undefined,
    "aria-describedby": describedBy(f),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(f.name, e.target.value),
  });

  const control = (f: Field) => {
    switch (f.type) {
      case "textarea":
      case "lines":
        return <textarea className="adm-input" rows={f.rows ?? (f.type === "lines" ? 4 : 5)} defaultValue={Array.isArray(values[f.name]) ? (values[f.name] as string[]).join("\n") : str(values[f.name])} required={f.required} {...common(f)} />;
      case "tags":
        return <input className="adm-input" defaultValue={str(values[f.name])} {...common(f)} />;
      case "checkbox":
        return <input type="checkbox" id={`f-${f.name}`} name={f.name} defaultChecked={Boolean(values[f.name])} onChange={(e) => set(f.name, e.target.checked)} />;
      case "status":
        return (
          <select className="adm-input" defaultValue={str(values[f.name]) || "DRAFT"} {...common(f)}>
            <option value="DRAFT">Draft (hidden from the public site)</option>
            <option value="PUBLISHED">Published</option>
          </select>
        );
      case "select":
        return (
          <select className="adm-input" defaultValue={str(values[f.name])} required={f.required} {...common(f)}>
            {f.allowEmpty !== false && <option value="">—</option>}
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case "multiselect": {
        // Image choices (project gallery) get the searchable thumbnail picker.
        if (f.options.some((o) => o.thumb)) {
          return (
            <AssetPicker
              name={f.name}
              inputId={`f-${f.name}`}
              label={f.label}
              multiple
              items={f.options.map((o) => ({ value: o.value, label: o.label, thumb: o.thumb }))}
              defaultValue={Array.isArray(values[f.name]) ? (values[f.name] as string[]) : []}
              describedBy={describedBy(f)}
            />
          );
        }
        const selected = new Set(Array.isArray(values[f.name]) ? (values[f.name] as string[]) : []);
        return (
          <fieldset className="adm-checks" aria-describedby={describedBy(f)}>
            <legend className="sr-only">{f.label}</legend>
            {f.options.length === 0 && <span className="adm-muted">Nothing to choose yet.</span>}
            {f.options.map((o) => (
              <label key={o.value}>
                <input type="checkbox" name={f.name} value={o.value} defaultChecked={selected.has(o.value)} />
                {o.label}
              </label>
            ))}
          </fieldset>
        );
      }
      case "asset": {
        const options = assets.filter((a) => (f.accept === "any" ? true : f.accept === "pdf" ? a.url.endsWith(".pdf") : a.isImage));
        return (
          <div className="adm-asset">
            <AssetPicker
              name={f.name}
              inputId={`f-${f.name}`}
              label={f.label}
              items={options.map((a) => ({ value: a.id, label: a.label, thumb: a.isImage ? a.url : undefined }))}
              defaultValue={[str(values[f.name])]}
              describedBy={describedBy(f)}
              onChange={(v) => set(f.name, v)}
            />
            <a href="/admin/media" className="adm-link" target="_blank">
              Upload or manage files ↗
            </a>
          </div>
        );
      }
      case "route":
        return (
          <RouteEditor
            name={f.name}
            value={Number(live[f.name] ?? 0)}
            onChange={(v) => set(f.name, String(v))}
            others={routeStops.filter((s) => s.id !== id)}
            title={str(live.title)}
          />
        );
      default:
        return <input className="adm-input" type={f.type} defaultValue={str(values[f.name])} required={f.required} placeholder={"placeholder" in f ? f.placeholder : undefined} step={f.type === "number" ? 1 : undefined} {...common(f)} />;
    }
  };

  return (
    <div className={milestonePreview ? "adm-form-split" : undefined}>
      <form
        className="adm-form"
        noValidate
        onSubmit={(e) => {
          // Submitting manually keeps the admin's input after a failed validation (form actions reset fields).
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        {id && <input type="hidden" name="id" value={id} />}
        {fields.map((f) => (
          <div key={f.name} className={`adm-field ${f.type === "checkbox" ? "adm-field-check" : ""} ${f.type === "route" ? "adm-field-wide" : ""}`}>
            <label htmlFor={`f-${f.name}`}>
              {f.label}
              {"required" in f && f.required && <span aria-hidden="true"> *</span>}
            </label>
            {control(f)}
            {"help" in f && f.help && (
              <small id={`${f.name}-help`} className="adm-muted">
                {f.help}
              </small>
            )}
            {err(f.name) && (
              <small id={`${f.name}-error`} className="adm-error">
                {err(f.name)}
              </small>
            )}
          </div>
        ))}
        <div className="adm-actions">
          <button className="adm-btn adm-btn-primary" type="submit" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </button>
          <p role="status" aria-live="polite" className={state.ok ? "adm-ok" : "adm-error"}>
            {state.message}
          </p>
        </div>
      </form>
      {milestonePreview && (
        <aside className="adm-preview" aria-label="Card preview">
          <span className="adm-muted">Preview of the map card</span>
          <div className="journey" style={{ height: "auto", minHeight: 0, background: "none", overflow: "visible" }}>
            <div className="card open" style={{ position: "static", width: "100%" }}>
              <small>{str(live.category) || "Category"}</small>
              <h3>{str(live.title) || "Title"}</h3>
              <p>{str(live.shortDescription) || "Short description"}</p>
              <div className="tags">
                {str(live.tags)
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => (
                    <span key={t}>{t}</span>
                  ))}
              </div>
            </div>
          </div>
          <span className="adm-muted">Status: {str(live.status) === "PUBLISHED" ? "published" : "draft (not on the public map)"}</span>
        </aside>
      )}
    </div>
  );
}

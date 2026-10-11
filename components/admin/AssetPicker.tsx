"use client";

import { useState } from "react";

export type PickItem = { value: string; label: string; thumb?: string };

type Props = {
  name: string;
  /** Id for the search box, so the field's <label> points at it. */
  inputId: string;
  label: string;
  items: PickItem[];
  multiple?: boolean;
  defaultValue: string[];
  describedBy?: string;
  onChange?: (value: string) => void;
};

/**
 * Visual file picker: click a thumbnail, or type to narrow the list. Filtered-out choices are only hidden,
 * so they still submit with the form, and selected files always stay visible.
 */
export function AssetPicker({ name, inputId, label, items, multiple, defaultValue, describedBy, onChange }: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(() => new Set(defaultValue.filter(Boolean)));
  const needle = q.trim().toLowerCase();
  const shown = items.filter((i) => !needle || i.label.toLowerCase().includes(needle) || selected.has(i.value));

  const pick = (value: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(multiple ? prev : []);
      if (checked && value) next.add(value);
      else next.delete(value);
      return next;
    });
    onChange?.(value);
  };

  return (
    <div className="adm-pick">
      <input
        id={inputId}
        className="adm-input"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${items.length} file${items.length === 1 ? "" : "s"}…`}
        aria-label={`Search files for ${label}`}
        aria-describedby={describedBy}
      />
      <fieldset aria-describedby={describedBy}>
        <legend className="sr-only">{label}</legend>
        <p className="adm-muted" aria-live="polite">
          {multiple ? `${selected.size} selected` : selected.size ? "1 selected" : "Nothing selected"}
          {needle && ` · ${shown.length} shown`}
        </p>
        <div className="adm-pick-grid">
          {!multiple && (
            <label className="adm-pick-item">
              <input type="radio" name={name} value="" defaultChecked={selected.size === 0} onChange={(e) => pick("", e.target.checked)} />
              <span className="adm-pick-thumb">None</span>
              <span>No file</span>
            </label>
          )}
          {items.map((i) => (
            <label key={i.value} className="adm-pick-item" hidden={!shown.includes(i)}>
              <input
                type={multiple ? "checkbox" : "radio"}
                name={name}
                value={i.value}
                defaultChecked={selected.has(i.value)}
                onChange={(e) => pick(i.value, e.target.checked)}
              />
              {i.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of a managed asset
                <img className="adm-pick-thumb" src={i.thumb} alt="" loading="lazy" />
              ) : (
                <span className="adm-pick-thumb">PDF</span>
              )}
              <span>{i.label}</span>
            </label>
          ))}
        </div>
        {items.length === 0 && <p className="adm-muted">Nothing uploaded yet.</p>}
        {items.length > 0 && shown.length === 0 && <p className="adm-muted">No file matches “{q}”.</p>}
      </fieldset>
    </div>
  );
}

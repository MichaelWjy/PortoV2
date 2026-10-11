"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Sidebar shell. On wide screens everything shows; at ≤900px the navigation and account block fold behind a
 * burger button in the brand row. Closes on a link click or Esc; focus is never trapped.
 */
export function AdminMenu({ brand, children }: { brand: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      burger.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="adm-brand">
        {brand}
        <button ref={burger} type="button" className="adm-burger" aria-expanded={open} aria-controls="admin-menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>
      <div id="admin-menu" className={`adm-menu ${open ? "open" : ""}`} onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
        {children}
      </div>
    </>
  );
}

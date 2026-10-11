"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  labels: { work: string; about: string; experience: string; contact: string };
  availability: { label: string; status: "AVAILABLE" | "LIMITED" | "UNAVAILABLE" } | null;
  /** "" on the home page so links scroll in place; "/" elsewhere so they navigate home first. */
  base: "" | "/";
};

const SECTIONS = ["work", "about", "experience", "contact"] as const;

export function SiteNav({ labels, availability, base }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [overMap, setOverMap] = useState(false);
  // Small screens only: the links fold into a menu behind the burger button.
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

  useEffect(() => {
    const map = document.getElementById("journey");
    if (!map) return;
    // True while the map passes under the nav strip at the top of the viewport.
    const io = new IntersectionObserver(([e]) => setOverMap(e.isIntersecting), { rootMargin: "0px 0px -92% 0px" });
    io.observe(map);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (base) return;
    const els = SECTIONS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [base]);

  const link = (id: (typeof SECTIONS)[number], label: string) => (
    <a href={`${base}#${id}`} aria-current={active === id ? "true" : undefined}>
      {label}
    </a>
  );

  return (
    <nav className={`nav ${overMap ? "over-map" : ""} ${open ? "menu-open" : ""}`} aria-label="Main">
      <a href={base || "#top"} className="logo" aria-label="MW, back to top">
        <Logo />
      </a>
      <div id="site-menu" className={`links mono ${open ? "open" : ""}`} onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
        {link("work", labels.work)}
        {link("about", labels.about)}
        {link("experience", labels.experience)}
        {link("contact", labels.contact)}
        {availability && availability.status !== "UNAVAILABLE" && (
          <span className={`av mono menu-av ${availability.status === "LIMITED" ? "limited" : ""}`}>
            <i aria-hidden="true" />
            {availability.label}
          </span>
        )}
      </div>
      <div className="nav-end">
        {availability && availability.status !== "UNAVAILABLE" ? (
          <span className={`av mono ${availability.status === "LIMITED" ? "limited" : ""}`}>
            <i aria-hidden="true" />
            {availability.label}
          </span>
        ) : null}
        <ThemeToggle />
        <button ref={burger} type="button" className="burger" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>
    </nav>
  );
}

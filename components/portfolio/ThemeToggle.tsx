"use client";

import { Moon, Sun } from "lucide-react";
import { THEME_COOKIE } from "@/lib/theme";

/**
 * Switches between the default dark theme and light. The choice is stored in a cookie, which the root
 * layout reads to render <html data-theme> on the server (no flash on load). Which icon and label show is
 * decided by CSS from data-theme, so the button needs no client state and cannot mismatch on hydration.
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    if (next === "light") root.dataset.theme = "light";
    else delete root.dataset.theme;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <button type="button" className="theme-toggle" onClick={toggle}>
      <Sun className="t-to-light" size={15} aria-hidden="true" />
      <Moon className="t-to-dark" size={15} aria-hidden="true" />
      <span className="sr-only t-to-light">Switch to light mode</span>
      <span className="sr-only t-to-dark">Switch to dark mode</span>
    </button>
  );
}

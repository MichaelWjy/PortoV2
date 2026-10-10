const year = (iso: string) => new Date(iso).getUTCFullYear().toString();

/** "2024 – Present", "2023 – 2024", "2024", or null when no dates are known (never invented). */
export function formatYearRange(start: string | null, end: string | null, isCurrent = false): string | null {
  if (!start && !end) return isCurrent ? "Present" : null;
  const from = start ? year(start) : null;
  const to = isCurrent ? "Present" : end ? year(end) : null;
  if (from && to) return from === to ? from : `${from} – ${to}`;
  return from ?? to;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatDateTime(iso: string | Date): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
}

export function toDateInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

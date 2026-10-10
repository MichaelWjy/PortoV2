export type Option = { value: string; label: string; thumb?: string };

export type Field =
  | { name: string; label: string; type: "text" | "url" | "email" | "date" | "number"; required?: boolean; help?: string; placeholder?: string }
  | { name: string; label: string; type: "textarea" | "lines" | "tags"; required?: boolean; help?: string; rows?: number }
  | { name: string; label: string; type: "checkbox"; help?: string }
  | { name: string; label: string; type: "select"; options: Option[]; required?: boolean; help?: string; allowEmpty?: boolean }
  | { name: string; label: string; type: "multiselect"; options: Option[]; help?: string }
  | { name: string; label: string; type: "status" }
  | { name: string; label: string; type: "asset"; accept: "image" | "pdf"; help?: string }
  | { name: string; label: string; type: "route"; help?: string };

/** Serializable form values: strings, booleans and string arrays. */
export type Values = Record<string, string | boolean | string[] | null | undefined>;

export type AssetOption = { id: string; label: string; url: string; isImage: boolean };
export type RouteStop = { id: string; title: string; position: number };

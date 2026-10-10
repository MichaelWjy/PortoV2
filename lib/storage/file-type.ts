export type DetectedType = { mime: string; ext: "jpg" | "png" | "webp" | "gif" | "avif" | "pdf"; isImage: boolean };

// 4 MB keeps uploads under Vercel's 4.5 MB request limit (the form adds some overhead).
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const ascii = (buf: Uint8Array, start: number, end: number) => String.fromCharCode(...buf.subarray(start, end));

/**
 * Detects the real file type from magic bytes; the browser-supplied MIME type and file name are not trusted.
 * SVG and HTML are deliberately unsupported because they can carry scripts.
 */
export function detectFileType(buf: Uint8Array): DetectedType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg", isImage: true };
  if (buf[0] === 0x89 && ascii(buf, 1, 4) === "PNG") return { mime: "image/png", ext: "png", isImage: true };
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp", isImage: true };
  if (ascii(buf, 0, 6) === "GIF87a" || ascii(buf, 0, 6) === "GIF89a") return { mime: "image/gif", ext: "gif", isImage: true };
  if (ascii(buf, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(buf, 8, 12))) return { mime: "image/avif", ext: "avif", isImage: true };
  if (ascii(buf, 0, 5) === "%PDF-") return { mime: "application/pdf", ext: "pdf", isImage: false };
  return null;
}

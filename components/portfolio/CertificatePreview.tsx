"use client";

import Image from "next/image";
import { useRef } from "react";
import { ArrowUpRight, X } from "lucide-react";

type File = { url: string; alt: string; width: number | null; height: number | null; isPdf: boolean };

/**
 * "View certificate": images open in an in-page preview (native <dialog>: focus handling and Esc for free);
 * PDFs open in the browser's own viewer in a new tab, which works on every device.
 */
export function CertificatePreview({ file, name }: { file: File; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);

  if (file.isPdf) {
    return (
      <a className="verify mono" href={file.url} target="_blank" rel="noopener" aria-label={`View ${name} certificate (PDF, opens in a new tab)`}>
        View certificate <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    );
  }

  return (
    <>
      <button type="button" className="verify mono" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
        View certificate
      </button>
      <dialog
        ref={dialog}
        className="cert-dialog"
        aria-label={`${name} certificate`}
        // A click on the backdrop lands on the dialog element itself.
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <button type="button" className="cert-dialog-close" onClick={() => dialog.current?.close()} aria-label="Close preview">
          <X size={18} aria-hidden="true" />
        </button>
        <Image src={file.url} alt={file.alt || `${name} certificate`} width={file.width ?? 1600} height={file.height ?? 1200} sizes="(max-width: 900px) 92vw, 900px" />
      </dialog>
    </>
  );
}

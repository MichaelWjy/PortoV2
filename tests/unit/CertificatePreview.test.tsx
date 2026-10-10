// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CertificatePreview } from "@/components/portfolio/CertificatePreview";

vi.mock("next/image", () => ({ default: (p: { alt: string }) => <span role="img" aria-label={p.alt} /> }));
afterEach(cleanup);

const file = (isPdf: boolean) => ({ url: isPdf ? "/media/a.pdf" : "/media/a.png", alt: "", width: 800, height: 600, isPdf });

describe("CertificatePreview", () => {
  it("opens PDFs in a new tab", () => {
    render(<CertificatePreview file={file(true)} name="AWS" />);
    const link = screen.getByRole("link", { name: /View AWS certificate/ });
    expect(link.getAttribute("href")).toBe("/media/a.pdf");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("previews images in a dialog", () => {
    // jsdom has no <dialog> modal support; record the call instead.
    const showModal = vi.fn();
    HTMLDialogElement.prototype.showModal = showModal;
    render(<CertificatePreview file={file(false)} name="AWS" />);
    fireEvent.click(screen.getByRole("button", { name: "View certificate" }));
    expect(showModal).toHaveBeenCalledOnce();
  });
});

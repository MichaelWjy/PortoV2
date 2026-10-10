import { Fragment } from "react";

/** Renders admin-entered line breaks as <br>, e.g. "Michael\nWijaya." */
export function Multiline({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  return lines.map((line, i) => (
    <Fragment key={i}>
      {line}
      {i < lines.length - 1 && <br />}
    </Fragment>
  ));
}

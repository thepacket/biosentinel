"use client";

import type { ReactNode } from "react";

export type Band = { start: number; end: number; className: string };

// Per-base coloured sequence with highlight bands (protospacer / PAM / window).
// Long sequences render a window around `focus` with truncation markers.
export default function SequenceView({
  seq, highlights = [], focus, context = 24, maxRender = 900, legend,
}: {
  seq: string;
  highlights?: Band[];
  focus?: { start: number; end: number };
  context?: number;
  maxRender?: number;
  legend?: ReactNode;
}) {
  const len = seq.length;
  let from = 0, to = len, windowed = false;
  if (len > maxRender && focus) {
    from = Math.max(0, focus.start - context);
    to = Math.min(len, focus.end + context);
    windowed = true;
  } else if (len > maxRender) {
    to = maxRender;
    windowed = true;
  }

  // window classes first so proto/pam (defined later in CSS) win on overlap
  const sorted = [...highlights].sort((a, b) => (a.className === "hl-window" ? -1 : 1));
  const cls = new Array<string>(len).fill("");
  for (const h of sorted) {
    for (let i = Math.max(0, h.start); i < Math.min(len, h.end); i++) {
      cls[i] = (cls[i] + " " + h.className).trim();
    }
  }

  const nodes: ReactNode[] = [];
  if (windowed && from > 0) nodes.push(<span key="l" className="seqctx">…{from} </span>);
  for (let i = from; i < to; i++) {
    const b = seq[i] ?? "";
    nodes.push(<span key={i} className={`b-${b.toUpperCase()} ${cls[i]}`.trim()}>{b}</span>);
  }
  if (windowed && to < len) nodes.push(<span key="r" className="seqctx"> {to}…</span>);

  return (
    <>
      <div className="seqview">{nodes}</div>
      {legend}
    </>
  );
}

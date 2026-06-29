"use client";

import type { DetectionGuide } from "@/lib/crispr-dx/biosensor";

function scoreColor(s: number): string {
  if (s >= 80) return "#86efac";
  if (s >= 60) return "#3fb6a8";
  if (s >= 40) return "#f4b860";
  return "#fca5a5";
}

// Linear map of the target: a tick per guide at its protospacer midpoint, +
// strand above / − (and rna) below the axis, coloured by detection score; the
// RPA amplicon is shaded. Click a tick to select that guide.
export default function DetectionMapTrack({
  guides, selected, onSelect, seqLen, amplicon,
}: {
  guides: DetectionGuide[];
  selected?: DetectionGuide | null;
  onSelect: (g: DetectionGuide) => void;
  seqLen: number;
  amplicon?: { start: number; end: number } | null;
}) {
  const W = 1000, H = 120, mid = H / 2;
  const x = (pos: number) => (seqLen <= 1 ? 10 : (pos / seqLen) * (W - 20) + 10);
  const step = Math.max(1, Math.round(seqLen / 6 / 10) * 10);
  const ticks: number[] = [];
  for (let p = 0; p <= seqLen; p += step) ticks.push(p);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", marginBottom: 8 }} role="img">
      <title>Map of detection guides and the amplicon along the target</title>
      {amplicon && (
        <rect x={x(amplicon.start)} y={mid - 9} width={Math.max(2, x(amplicon.end) - x(amplicon.start))} height={18} fill="#3fb6a8" opacity={0.16} rx={3} />
      )}
      <line x1={10} y1={mid} x2={W - 10} y2={mid} stroke="#243044" strokeWidth={1.5} />
      {ticks.map((p) => (
        <g key={p}>
          <line x1={x(p)} y1={mid - 3} x2={x(p)} y2={mid + 3} stroke="#8b9bb0" strokeWidth={1} />
          <text x={x(p)} y={mid + 18} fill="#8b9bb0" fontSize={9} textAnchor="middle">{p}</text>
        </g>
      ))}
      {guides.map((g) => {
        const cx = x((g.protospacerStart + g.protospacerEnd) / 2);
        const up = g.strand === "+";
        const isSel = g.id === selected?.id;
        const len = isSel ? 42 : 26;
        return (
          <line
            key={g.id} x1={cx} y1={mid} x2={cx} y2={up ? mid - len : mid + len}
            stroke={scoreColor(g.detection.score)} strokeWidth={isSel ? 2.6 : 1}
            opacity={isSel ? 1 : 0.55} style={{ cursor: "pointer" }}
            onClick={() => onSelect(g)}
          />
        );
      })}
    </svg>
  );
}

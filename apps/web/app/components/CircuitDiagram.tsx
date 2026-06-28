"use client";

import { shortName, type CircuitProps } from "@/lib/designer";
import ZoomableSvg from "./ZoomableSvg";

// Palette (matches globals.css). SVG presentation attributes don't reliably
// resolve CSS var(), so the fixed dark-theme hexes are used directly.
const C = {
  bg: "#0b0f14",
  panel: "#121822",
  border: "#243044",
  text: "#e6edf3",
  muted: "#8b9bb0",
  edge: "#3a4760",
  accent: "#3fb6a8",
  accent2: "#6ea8fe",
  repress: "#fca5a5",
  activate: "#86efac",
};

const CAT_COLOR: Record<string, string> = {
  environmental: "#86efac",
  pathogen: "#fca5a5",
  "clinical-gut": "#f0abfc",
  chemical: "#fcd34d",
};

const OUT_COLOR: Record<string, string> = {
  fluorescent: "#86efac",
  pigment: "#c084fc",
  luminescent: "#fcd34d",
  colorimetric: "#7fd1ff",
  electrochemical: "#7fd1ff",
  growth: "#8b9bb0",
};

function trunc(s: string | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

const CX = [70, 216, 362, 508, 654, 800];
const BW = 110;

function Node({
  cx,
  stripe,
  kicker,
  title,
  sub,
}: {
  cx: number;
  stripe: string;
  kicker: string;
  title: string;
  sub: string;
}) {
  const x = cx - BW / 2;
  return (
    <g>
      <rect x={x} y={72} width={BW} height={66} rx={10} fill={C.panel} stroke={C.border} />
      <rect x={x} y={72} width={BW} height={5} rx={2.5} fill={stripe} />
      <text x={cx} y={95} textAnchor="middle" fontSize={9} fill={C.muted} letterSpacing={1}>{kicker}</text>
      <text x={cx} y={113} textAnchor="middle" fontSize={12.5} fill={C.text} fontWeight={700}>{title}</text>
      <text x={cx} y={128} textAnchor="middle" fontSize={10} fill={C.muted}>{sub}</text>
    </g>
  );
}

export default function CircuitDiagram(p: CircuitProps) {
  const activate = /crispra|activation/i.test(p.strategy);
  const actionColor = activate ? C.activate : C.repress;
  const outColor = OUT_COLOR[p.outputType] ?? C.accent;
  const catColor = CAT_COLOR[p.category] ?? C.accent;
  const casName = activate ? "dCas9-ω" : "dCas9";

  // thin connectors at indices 0-1, 1-2, 2-3, 4-5; the 3-4 edge is the action
  const thin = [0, 1, 2, 4];

  const svg = (
    <svg viewBox="0 0 900 215" xmlns="http://www.w3.org/2000/svg" role="img" style={{ width: "100%", height: "auto", display: "block" }}>
      <title>CRISPR biosensor circuit for {p.analyte}</title>
      <desc>
        {p.analyte} is sensed by {p.regulator ?? "the sensor"}, which drives an sgRNA that guides {casName} to{" "}
        {activate ? "activate" : "repress"} the {p.reporterGene ?? "reporter"}.
      </desc>
      <rect x={0} y={0} width={900} height={215} rx={14} fill={C.bg} />

      <defs>
        <marker id="cd-ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={C.muted} />
        </marker>
        <marker id="cd-act" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={actionColor} />
        </marker>
      </defs>

      {/* thin connectors */}
      <g stroke={C.edge} strokeWidth={2} fill="none">
        {thin.map((i) => (
          <line key={i} x1={CX[i] + 57} y1={105} x2={CX[i + 1] - 57} y2={105} markerEnd="url(#cd-ah)" />
        ))}
      </g>

      {/* action connector dCas9 -> reporter */}
      {activate ? (
        <line x1={CX[3] + 57} y1={105} x2={CX[4] - 57} y2={105} stroke={actionColor} strokeWidth={3} markerEnd="url(#cd-act)" />
      ) : (
        <g>
          <line x1={CX[3] + 57} y1={105} x2={CX[4] - 58} y2={105} stroke={actionColor} strokeWidth={3} />
          <line x1={CX[4] - 58} y1={99} x2={CX[4] - 58} y2={111} stroke={actionColor} strokeWidth={2.6} />
        </g>
      )}

      {/* connector labels — sit in a row above the blocks */}
      <g fontSize={10} fill={C.muted} textAnchor="middle">
        <text x={(CX[0] + CX[1]) / 2} y={60}>binds</text>
        <text x={(CX[1] + CX[2]) / 2} y={60}>transcribes</text>
        <text x={(CX[2] + CX[3]) / 2} y={60}>guides</text>
        <text x={(CX[4] + CX[5]) / 2} y={60}>produces</text>
        <text x={(CX[3] + CX[4]) / 2} y={60} fill={actionColor} fontWeight={700}>
          {activate ? "ACTIVATES" : "REPRESSES"}
        </text>
      </g>

      {/* nodes */}
      <Node cx={CX[0]} stripe={catColor} kicker="INPUT" title={trunc(p.analyte, 14)} sub={p.category.replace("-", " / ")} />
      <Node cx={CX[1]} stripe={C.accent} kicker="SENSOR" title={shortName(p.regulator ?? "sensor", 14)} sub={shortName(p.sensorPromoter ?? "promoter", 14)} />
      <Node cx={CX[2]} stripe={C.accent} kicker="GUIDE" title="sgRNA" sub="spacer + scaffold" />
      <Node cx={CX[3]} stripe={C.accent2} kicker="CRISPR" title={casName} sub="catalytically dead" />
      <Node cx={CX[4]} stripe={outColor} kicker="REPORTER" title={trunc(p.reporterGene ?? "reporter", 13)} sub={activate ? "activated" : "repressed"} />
      <Node cx={CX[5]} stripe={outColor} kicker="OUTPUT" title={trunc(p.outputType, 13)} sub={trunc(p.readout ?? "", 16)} />

      {/* legend */}
      <g fontSize={10} fill={C.muted}>
        <line x1={20} y1={196} x2={40} y2={196} stroke={C.repress} strokeWidth={3} />
        <line x1={40} y1={191} x2={40} y2={201} stroke={C.repress} strokeWidth={2.4} />
        <text x={48} y={200}>CRISPRi represses (NOT)</text>
        <line x1={230} y1={196} x2={250} y2={196} stroke={C.activate} strokeWidth={3} markerEnd="url(#cd-ah)" />
        <text x={258} y={200}>CRISPRa activates (amplify)</text>
      </g>
    </svg>
  );

  return <ZoomableSvg label="genetic circuit diagram">{svg}</ZoomableSvg>;
}

"use client";

import { shortName, type CircuitProps } from "@/lib/designer";
import ZoomableSvg from "./ZoomableSvg";

const C = {
  bg: "#0b0f14",
  text: "#e6edf3",
  muted: "#8b9bb0",
  backbone: "#3a4760",
  accent: "#3fb6a8",
  accent2: "#6ea8fe",
  repress: "#fca5a5",
  activate: "#86efac",
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

// SBOL-style genetic construct: three transcription units (sensing, CRISPR,
// reporter) with standard part glyphs (promoter, RBS, CDS, ncRNA, terminator).
export default function PartsTrack(p: CircuitProps) {
  const activate = /crispra|activation/i.test(p.strategy);
  const action = activate ? C.activate : C.repress;
  const outColor = OUT_COLOR[p.outputType] ?? C.accent;
  const casName = activate ? "dCas9-ω" : "dCas9";
  const repProm = activate ? "Pmin" : "Pconst";
  const sensorProm = shortName(p.sensorPromoter ?? "Psensor", 12);

  const Promoter = ({ x, y, color, mark }: { x: number; y: number; color: string; mark?: "bar" | "arrow" }) => (
    <g>
      <path d={`M${x},${y} L${x},${y - 20} L${x + 22},${y - 20}`} stroke={color} strokeWidth={2.4} fill="none" markerEnd="url(#pt-ah)" />
      {mark === "bar" && <line x1={x + 16} y1={y - 26} x2={x + 28} y2={y - 26} stroke={color} strokeWidth={2.2} />}
      {mark === "arrow" && <path d={`M${x + 14},${y - 26} L${x + 26},${y - 26} M${x + 22},${y - 29} L${x + 26},${y - 26} L${x + 22},${y - 23}`} stroke={color} strokeWidth={2} fill="none" />}
    </g>
  );
  const Rbs = ({ x, y }: { x: number; y: number }) => <path d={`M${x - 8},${y} a8,8 0 0 1 16,0 Z`} fill={C.muted} />;
  const Cds = ({ x, y, w, stroke, label }: { x: number; y: number; w: number; stroke: string; label: string }) => (
    <g>
      <polygon points={`${x},${y - 12} ${x + w - 14},${y - 12} ${x + w},${y} ${x + w - 14},${y + 12} ${x},${y + 12}`} fill="#13202e" stroke={stroke} />
      <text x={x + w / 2} y={y + 4} textAnchor="middle" fontSize={11} fill={C.text} fontWeight={700}>{label}</text>
    </g>
  );
  const Term = ({ x, y }: { x: number; y: number }) => (
    <g stroke={C.muted} strokeWidth={2.2}><line x1={x} y1={y} x2={x} y2={y - 18} /><line x1={x - 8} y1={y - 18} x2={x + 8} y2={y - 18} /></g>
  );

  const Y = [58, 138, 218];

  const svg = (
    <svg viewBox="0 0 900 288" xmlns="http://www.w3.org/2000/svg" role="img" style={{ width: "100%", height: "auto", display: "block" }}>
      <title>SBOL genetic construct for the {p.analyte} biosensor</title>
      <desc>
        Three transcription units: a sensing unit producing an sgRNA, a {casName} unit, and a reporter unit
        ({p.reporterGene}) whose promoter is {activate ? "activated" : "repressed"} by {casName}.
      </desc>
      <rect x={0} y={0} width={900} height={288} rx={14} fill={C.bg} />
      <defs>
        <marker id="pt-ah" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L5,3 L0,6 Z" fill={C.accent} />
        </marker>
      </defs>

      {/* backbones */}
      <g stroke={C.backbone} strokeWidth={2}>
        <line x1={120} y1={Y[0]} x2={470} y2={Y[0]} />
        <line x1={120} y1={Y[1]} x2={510} y2={Y[1]} />
        <line x1={120} y1={Y[2]} x2={500} y2={Y[2]} />
      </g>
      <g fontSize={10} fill={C.muted} textAnchor="end">
        <text x={108} y={Y[0] - 10}>TU1</text><text x={108} y={Y[0] + 3} fontWeight={700} fill={C.text}>Sensing</text>
        <text x={108} y={Y[1] - 10}>TU2</text><text x={108} y={Y[1] + 3} fontWeight={700} fill={C.text}>CRISPR</text>
        <text x={108} y={Y[2] - 10}>TU3</text><text x={108} y={Y[2] + 3} fontWeight={700} fill={C.text}>Reporter</text>
      </g>

      {/* TU1: sensor promoter -> sgRNA -> terminator */}
      <Promoter x={150} y={Y[0]} color={C.accent} />
      <text x={161} y={Y[0] + 18} textAnchor="middle" fontSize={9.5} fill={C.accent}>{sensorProm}</text>
      <rect x={250} y={Y[0] - 10} width={104} height={20} rx={10} fill="#0e1f1c" stroke={C.accent} />
      <path d={`M260,${Y[0]} q6,-6 12,0 t12,0 t12,0 t12,0`} stroke={C.accent} strokeWidth={1.6} fill="none" />
      <text x={302} y={Y[0] + 25} textAnchor="middle" fontSize={9.5} fill={C.muted}>sgRNA</text>
      <Term x={400} y={Y[0]} />

      {/* TU2: constitutive promoter -> RBS -> dCas9 -> terminator */}
      <Promoter x={150} y={Y[1]} color={C.accent} />
      <text x={161} y={Y[1] + 18} textAnchor="middle" fontSize={9.5} fill={C.accent}>Pconst</text>
      <Rbs x={231} y={Y[1]} />
      <Cds x={255} y={Y[1]} w={120} stroke={C.accent2} label={casName} />
      <Term x={430} y={Y[1]} />

      {/* TU3: reporter promoter (action-colored) -> RBS -> reporter -> terminator */}
      <Promoter x={150} y={Y[2]} color={action} mark={activate ? "arrow" : "bar"} />
      <text x={161} y={Y[2] + 18} textAnchor="middle" fontSize={9.5} fill={action}>{repProm}</text>
      <Rbs x={231} y={Y[2]} />
      <Cds x={255} y={Y[2]} w={110} stroke={outColor} label={trunc(p.reporterGene ?? "reporter", 11)} />
      <Term x={420} y={Y[2]} />

      {/* caption */}
      <text x={120} y={274} fontSize={10} fill={C.muted}>
        {casName} + sgRNA <tspan fill={action} fontWeight={700}>{activate ? "activate" : "repress"}</tspan> the reporter promoter ({activate ? "CRISPRa" : "CRISPRi"}). Glyphs follow SBOL Visual.
      </text>
    </svg>
  );

  return <ZoomableSvg label="SBOL genetic construct">{svg}</ZoomableSvg>;
}

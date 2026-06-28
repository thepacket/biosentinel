"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChassisSummary, SensorModule } from "@/lib/types";
import { REPORTERS, STRATEGIES, buildDraft, circuitPropsFromBiosensor } from "@/lib/designer";
import CircuitDiagram from "./CircuitDiagram";

const CATEGORY_LABEL: Record<string, string> = {
  environmental: "Environmental",
  pathogen: "Pathogen",
  "clinical-gut": "Clinical / gut",
  chemical: "Chemical",
};

export default function Designer({
  modules,
  chassis,
}: {
  modules: SensorModule[];
  chassis: ChassisSummary[];
}) {
  const [analyte, setAnalyte] = useState(modules[0]?.analyte ?? "");
  const [chassisSlug, setChassisSlug] = useState(chassis[0]?.slug ?? "");
  const [strategyId, setStrategyId] = useState(STRATEGIES[0].id);
  const [reporterId, setReporterId] = useState(REPORTERS[0].id);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  // Pre-load from URL params (e.g. "Open in designer" from a library design).
  // Read on mount via window.location to stay compatible with static export.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const a = sp.get("analyte");
    if (a && modules.some((m) => m.analyte === a)) setAnalyte(a);
    const c = sp.get("chassis");
    if (c && chassis.some((x) => x.slug === c)) setChassisSlug(c);
    const s = sp.get("strategy");
    if (s && STRATEGIES.some((x) => x.id === s)) setStrategyId(s);
    const r = sp.get("reporter");
    if (r && REPORTERS.some((x) => x.id === r)) setReporterId(r);
    const n = sp.get("name");
    if (n) setName(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moduleSel = modules.find((m) => m.analyte === analyte) ?? modules[0];
  const chassisSel = chassis.find((c) => c.slug === chassisSlug) ?? chassis[0];

  const draft = useMemo(() => {
    if (!moduleSel || !chassisSel) return null;
    return buildDraft({ name, module: moduleSel, chassis: chassisSel, strategyId, reporterId });
  }, [name, moduleSel, chassisSel, strategyId, reporterId]);

  // Recommend chassis whose bestFor matches the module category.
  const recommended = new Set(
    chassis.filter((c) => c.bestFor.includes(moduleSel?.category as any)).map((c) => c.slug),
  );

  function download() {
    if (!draft) return;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    if (!draft) return;
    await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!moduleSel || !chassisSel || !draft) return <p>No modules available.</p>;

  return (
    <div className="designer">
      <div className="designer-controls">
        {/* Step 1: analyte / module */}
        <div className="step">
          <h3><span className="step-n">1</span> What should it detect?</h3>
          <select className="search-input" value={analyte} onChange={(e) => setAnalyte(e.target.value)}>
            {modules.map((m) => (
              <option key={m.fromSlug} value={m.analyte}>
                {m.analyte} — {CATEGORY_LABEL[m.category]}
              </option>
            ))}
          </select>
          <p className="hint">
            Sensing module: <strong>{moduleSel.regulator}</strong> / {moduleSel.promoter}.{" "}
            <span className="src">Source: {moduleSel.source}</span>
          </p>
        </div>

        {/* Step 2: chassis */}
        <div className="step">
          <h3><span className="step-n">2</span> Safe chassis</h3>
          <div className="opt-grid">
            {chassis.map((c) => (
              <button
                key={c.slug}
                className={`opt ${chassisSlug === c.slug ? "active" : ""}`}
                onClick={() => setChassisSlug(c.slug)}
              >
                <div className="opt-title">{c.name}</div>
                <div className="opt-badges">
                  <span className="badge bsl1">BSL-1</span>
                  {c.gras && <span className="badge gras">GRAS</span>}
                  {c.probiotic && <span className="badge probiotic">probiotic</span>}
                  {recommended.has(c.slug) && <span className="badge published">recommended</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: strategy */}
        <div className="step">
          <h3><span className="step-n">3</span> CRISPR strategy</h3>
          <div className="opt-grid">
            {STRATEGIES.map((s) => (
              <button
                key={s.id}
                className={`opt ${strategyId === s.id ? "active" : ""}`}
                onClick={() => setStrategyId(s.id)}
              >
                <div className="opt-title">{s.label}</div>
                <div className="opt-desc">{s.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: reporter */}
        <div className="step">
          <h3><span className="step-n">4</span> Reporter / output</h3>
          <div className="opt-grid">
            {REPORTERS.map((r) => (
              <button
                key={r.id}
                className={`opt ${reporterId === r.id ? "active" : ""}`}
                onClick={() => setReporterId(r.id)}
              >
                <div className="opt-title">{r.label}</div>
                <div className="opt-desc">{r.instrumentFree ? "Instrument-free" : "Needs a reader"}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 5: name */}
        <div className="step">
          <h3><span className="step-n">5</span> Name <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></h3>
          <input
            className="search-input"
            placeholder={draft.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      {/* Live preview */}
      <aside className="designer-preview">
        <div className="preview-card">
          <div className="chips" style={{ marginBottom: 10 }}>
            <span className={`cat cat-${draft.input.category}`}>{CATEGORY_LABEL[draft.input.category]}</span>
            <span className="badge bsl1">BSL-1</span>
            {draft.safety.grasChassis && <span className="badge gras">GRAS</span>}
            <span className="badge experimental">draft</span>
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>{draft.name}</h2>
          <div className="pipeline" style={{ margin: "12px 0" }}>
            <div className="stage"><div className="label">Input</div><div className="value">{draft.input.analyte}</div></div>
            <div className="stage"><div className="label">Sense</div><div className="value">{draft.sensing.strategy.replace("-", " ")}</div></div>
            <div className="stage"><div className="label">Chassis</div><div className="value">{chassisSel.name}</div></div>
            <div className="stage"><div className="label">Output</div><div className="value">{draft.output.reporterGene}</div></div>
          </div>
          <div style={{ margin: "8px 0 12px" }}><CircuitDiagram {...circuitPropsFromBiosensor(draft)} /></div>
          <div className="signal-flow"><div className="lbl">Signal flow</div>{draft.sensing.signalFlow}</div>
          <div className="preview-actions">
            <button className="btn" onClick={download}>Download JSON</button>
            <button className="btn secondary" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
          </div>
          <p className="footnote" style={{ marginTop: 10 }}>
            Draft is schema-valid (<code>status: experimental</code>). Validate the biology and design the sgRNA before building.
            Drop the file into <code>data/biosensors/</code> and run <code>scripts/validate.py</code> to add it to the library.
          </p>
        </div>
      </aside>
    </div>
  );
}

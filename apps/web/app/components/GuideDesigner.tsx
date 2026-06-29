"use client";

import { Fragment, useState } from "react";
import Dna from "./Dna";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const CAS_OPTIONS = [
  { id: "spcas9", name: "dSpCas9 (NGG) — the usual choice", len: 20 },
  { id: "spcas9-ng", name: "dSpCas9-NG (NG)", len: 20 },
  { id: "sacas9", name: "dSaCas9 (NNGRRT)", len: 21 },
  { id: "ascas12a", name: "dAsCas12a (TTTV)", len: 23 },
];
const SCAFFOLD = "GTTTTAGAGCTAGAAATAGCAAGTTAAAATAAGGCTAGTCCGTTATCAACTTGAAAAAGTGGCACCGAGTCGGTGC";
const EXAMPLE =
  ">example reporter-promoter region (J23119 + B0034 + sfGFP start)\nTTGACAGCTAGCTCAGTCCTAGGTATAATGCTAGCAAAGAGGAGAAATACTAGATGCGTAAAGGCGAAGAGCTGTTCACTGGTGTCGTCCCTATTCTGGTGGAACTGGATGGTGATGTCAACGGTCATAAGTTTTCCGTGCGTGGCGAGGGTGAAGGT";

type TargetPart = { name: string; sequence: string; category: string };
type ChassisGenome = { slug: string; name: string; accession: string; fetchable: boolean };
type Candidate = { spacer: string; pam: string; strand: string; start: number; gc: number; score: number; warnings: string[] };
type Hit = { record: string; strand: string; start: number; mismatches: number; sequence: string; pam: string; mitScore: number; cfdScore: number | null };
type OT = { mitSpecificity: number; cfdSpecificity: number | null; cfdApplicable: boolean; offTargetCount: number; scannedBp?: number; host?: string; topHits?: Hit[] };

export default function GuideDesigner({ targetParts, chassisGenomes }: { targetParts: TargetPart[]; chassisGenomes: ChassisGenome[] }) {
  const [guided, setGuided] = useState(true);
  const [target, setTarget] = useState("");
  const [casId, setCasId] = useState("spcas9");
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [otSource, setOtSource] = useState<"genome" | "paste">("genome");
  const [reference, setReference] = useState("");
  const [hostSlug, setHostSlug] = useState(chassisGenomes.find((c) => c.fetchable)?.slug ?? "");
  const [ot, setOt] = useState<Record<string, OT | "loading" | "err">>({});

  // Advanced controls (hidden in guided mode)
  const [count, setCount] = useState(25);
  const [maxMismatches, setMaxMismatches] = useState(4);
  const [minGc, setMinGc] = useState(0);
  const [maxGc, setMaxGc] = useState(100);
  const [strandFilter, setStrandFilter] = useState<"both" | "+" | "-">("both");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function design() {
    setLoading(true); setErr(""); setCands(null); setOt({}); setExpanded(null);
    try {
      const res = await fetch(`${API_BASE}/api/guides/design`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, casId, count: guided ? 25 : count }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "design failed");
      setCands(d.candidates);
    } catch (e) { setErr(String(e)); } finally { setLoading(false); }
  }

  async function score(spacer: string) {
    setErr(""); setOt((o) => ({ ...o, [spacer]: "loading" }));
    const mm = guided ? 4 : maxMismatches;
    try {
      let d: any;
      if (otSource === "genome") {
        const res = await fetch(`${API_BASE}/api/guides/host-offtarget`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spacer, casId, chassisSlug: hostSlug, maxMismatches: mm }),
        });
        d = await res.json();
        if (!res.ok) throw new Error(d.detail || "scan failed");
      } else {
        if (!reference.trim()) { setErr("Paste a reference sequence first."); setOt((o) => { const n = { ...o }; delete n[spacer]; return n; }); return; }
        const res = await fetch(`${API_BASE}/api/guides/offtarget`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spacer, casId, reference, maxMismatches: mm }),
        });
        d = await res.json();
        if (!res.ok) throw new Error(d.detail || "scan failed");
      }
      setOt((o) => ({ ...o, [spacer]: d }));
    } catch (e) { setErr(String(e)); setOt((o) => ({ ...o, [spacer]: "err" })); }
  }

  function insertPart(name: string) {
    const p = targetParts.find((x) => x.name === name);
    if (p) setTarget(`>${p.name}\n${p.sequence}`);
  }

  const isSp = casId === "spcas9";
  const fetchableHosts = chassisGenomes.filter((c) => c.fetchable);
  const shown = (cands ?? []).filter((c) => c.gc >= minGc && c.gc <= maxGc && (strandFilter === "both" || c.strand === strandFilter));
  const spec = (o: OT) => (o.cfdApplicable && o.cfdSpecificity != null ? o.cfdSpecificity : o.mitSpecificity);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button className="btn secondary" style={{ padding: "5px 12px", fontSize: 13 }} onClick={() => setGuided((g) => !g)}>
          {guided ? "Switch to advanced" : "Switch to guided"}
        </button>
      </div>

      {guided && (
        <div className="signal-flow" style={{ marginBottom: 16 }}>
          <div className="lbl">What this does</div>
          A guide RNA is the “address” that steers dCas9 to one spot in your cell. For a CRISPRi sensor it lands on the
          reporter’s promoter to switch it off. Below: paste that promoter (or click <strong>Load example</strong>), and we’ll
          list good guides and check that each one is unique to your host.
        </div>
      )}

      <div className="step">
        <h3><span className="step-n">1</span> Target region</h3>
        {guided && <p className="hint" style={{ margin: "0 0 8px" }}>The DNA you want the guide to bind — usually the reporter’s promoter. Not sure? Click Load example.</p>}
        <textarea
          className="search-input" style={{ minHeight: 110, fontFamily: "var(--mono)", fontSize: 12.5 }}
          placeholder=">target&#10;ATGC…" value={target} onChange={(e) => setTarget(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
          <button className="btn secondary" style={{ padding: "6px 12px" }} onClick={() => setTarget(EXAMPLE)}>Load example</button>
          {targetParts.length > 0 && (
            <select className="search-input" style={{ maxWidth: 230 }} defaultValue="" onChange={(e) => { if (e.target.value) insertPart(e.target.value); e.currentTarget.selectedIndex = 0; }}>
              <option value="">Insert a part…</option>
              {targetParts.map((p) => <option key={p.name} value={p.name}>{p.name} ({p.category})</option>)}
            </select>
          )}
          <select className="search-input" style={{ maxWidth: 260 }} value={casId} onChange={(e) => setCasId(e.target.value)}>
            {CAS_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn" onClick={design} disabled={loading || !target.trim()}>{loading ? "Designing…" : "Design guides"}</button>
        </div>
      </div>

      {!guided && (
        <div className="step">
          <h3>Advanced options</h3>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-end", fontSize: 13 }}>
            <label>Guides to return
              <input className="search-input" type="number" min={1} max={100} value={count} onChange={(e) => setCount(Math.max(1, Math.min(100, +e.target.value || 1)))} style={{ width: 90, display: "block", marginTop: 4 }} />
            </label>
            <label>Off-target mismatch budget
              <select className="search-input" value={maxMismatches} onChange={(e) => setMaxMismatches(+e.target.value)} style={{ width: 90, display: "block", marginTop: 4 }}>
                {[0, 1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>GC filter (%)
              <span style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <input className="search-input" type="number" min={0} max={100} value={minGc} onChange={(e) => setMinGc(+e.target.value || 0)} style={{ width: 70 }} />
                <input className="search-input" type="number" min={0} max={100} value={maxGc} onChange={(e) => setMaxGc(+e.target.value || 100)} style={{ width: 70 }} />
              </span>
            </label>
            <label>Strand
              <select className="search-input" value={strandFilter} onChange={(e) => setStrandFilter(e.target.value as any)} style={{ width: 90, display: "block", marginTop: 4 }}>
                <option value="both">both</option><option value="+">+</option><option value="-">−</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {err && <div className="notice" style={{ marginTop: 12 }}>{err}</div>}

      {cands && (
        <section className="block">
          <h2>Candidate guides <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>({shown.length}{!guided && shown.length !== cands.length ? ` of ${cands.length}` : ""}, best first)</span></h2>
          {guided && <p className="hint" style={{ marginTop: 0 }}>Pick a guide with a high <strong>score</strong>, GC around 40–60%, and no warnings. Then check it’s unique with an off-target scan.</p>}

          <div className="step" style={{ marginBottom: 14 }}>
            <h3><span className="step-n">2</span> Off-target check <span style={{ color: "var(--muted)", fontWeight: 400 }}>(is the guide unique?)</span></h3>
            <div className="chips" style={{ marginBottom: 8 }}>
              <button className={`filter-btn ${otSource === "genome" ? "active" : ""}`} style={{ width: "auto" }} onClick={() => setOtSource("genome")}><span>Use host genome</span></button>
              <button className={`filter-btn ${otSource === "paste" ? "active" : ""}`} style={{ width: "auto" }} onClick={() => setOtSource("paste")}><span>Paste a reference</span></button>
            </div>
            {otSource === "genome" ? (
              <div>
                <select className="search-input" style={{ maxWidth: 360 }} value={hostSlug} onChange={(e) => setHostSlug(e.target.value)}>
                  {fetchableHosts.map((c) => <option key={c.slug} value={c.slug}>{c.name} — {c.accession}</option>)}
                </select>
                <p className="hint" style={{ marginTop: 6 }}>We fetch this host’s genome from NCBI and scan it. First scan can take ~10–30s.{chassisGenomes.some((c) => !c.fetchable) && " (Some hosts only have assembly accessions — paste a region for those.)"}</p>
              </div>
            ) : (
              <textarea className="search-input" style={{ minHeight: 70, fontFamily: "var(--mono)", fontSize: 12 }} placeholder=">reference (plasmid / host region)&#10;ACGT…" value={reference} onChange={(e) => setReference(e.target.value)} />
            )}
          </div>

          <table className="parts">
            <thead><tr><th>Spacer (5′→3′)</th><th>PAM</th><th>Strand</th><th>GC</th><th>Score</th><th>Unique?</th></tr></thead>
            <tbody>
              {shown.map((c) => {
                const o = ot[c.spacer];
                const obj = o && o !== "loading" && o !== "err" ? (o as OT) : null;
                return (
                  <Fragment key={c.spacer + c.strand + c.start}>
                    <tr>
                      <td>
                        <Dna seq={c.spacer} />
                        {c.warnings.length > 0 && <div style={{ color: "var(--warn)", fontSize: 11 }}>{c.warnings.join("; ")}</div>}
                      </td>
                      <td><Dna seq={c.pam} /></td>
                      <td>{c.strand}</td>
                      <td style={{ color: c.gc < 30 || c.gc > 75 ? "var(--warn)" : "var(--muted)" }}>{c.gc}%</td>
                      <td><strong>{c.score}</strong></td>
                      <td>
                        {o === "loading" ? "scanning…" : o === "err" ? <span className="warn-inline">error</span> : obj ? (
                          <span>
                            {spec(obj) >= 80 ? <span style={{ color: "#86efac" }}>✓ unique ({spec(obj)})</span> : <span className="warn-inline">⚠ {spec(obj)} ({obj.offTargetCount} hits)</span>}
                            {!guided && obj.offTargetCount > 0 && (
                              <button className="btn secondary" style={{ padding: "2px 8px", fontSize: 11, marginLeft: 8 }} onClick={() => setExpanded(expanded === c.spacer ? null : c.spacer)}>
                                {expanded === c.spacer ? "hide" : "details"}
                              </button>
                            )}
                          </span>
                        ) : (
                          <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => score(c.spacer)}>Check</button>
                        )}
                      </td>
                    </tr>
                    {!guided && obj && expanded === c.spacer && (
                      <tr>
                        <td colSpan={6} style={{ background: "var(--panel-2, #18202c)" }}>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                            Off-target sites in {obj.host ?? "reference"} ({obj.scannedBp?.toLocaleString()} bp scanned, ≤{maxMismatches} mismatches) — top {obj.topHits?.length ?? 0}:
                          </div>
                          {obj.topHits && obj.topHits.length > 0 ? (
                            <table className="parts" style={{ fontSize: 12 }}>
                              <thead><tr><th>Site</th><th>Strand</th><th>Pos</th><th>MM</th><th>Sequence</th><th>PAM</th><th>MIT</th><th>CFD</th></tr></thead>
                              <tbody>
                                {obj.topHits.map((h, i) => (
                                  <tr key={i}>
                                    <td>{h.record}</td><td>{h.strand}</td><td>{h.start.toLocaleString()}</td><td>{h.mismatches}</td>
                                    <td><Dna seq={h.sequence} /></td><td><Dna seq={h.pam} /></td>
                                    <td>{h.mitScore}</td><td>{h.cfdScore ?? "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : <div style={{ fontSize: 12, color: "var(--muted)" }}>No imperfect sites within the mismatch budget.</div>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {isSp && shown[0] && (
            <div className="seq-row" style={{ marginTop: 16 }}>
              <div className="seq-name">{guided ? "Order this — the full sgRNA for your top guide" : "Full sgRNA for the top guide (spacer + SpCas9 scaffold)"}</div>
              <div className="seq"><Dna seq={shown[0].spacer} className="" /><span style={{ color: "var(--muted)" }}>{SCAFFOLD}</span></div>
              {guided && <p className="footnote" style={{ marginTop: 6 }}>Copy this and order it as a synthetic gene / oligo from your DNA supplier, then clone it under an sgRNA promoter in your design.</p>}
            </div>
          )}

          <p className="footnote" style={{ marginTop: 12 }}>
            Score is a transparent on-target heuristic (GC window, no poly-T/homopolymer). “Unique?” uses the authentic MIT
            (Hsu 2013) + Doench/Fusi 2016 CFD models — higher (→100) = fewer off-target matches. Sensing uses dead Cas, so
            there’s no DNA cut; off-target <em>binding</em> is the risk to minimize.
          </p>
        </section>
      )}
    </div>
  );
}

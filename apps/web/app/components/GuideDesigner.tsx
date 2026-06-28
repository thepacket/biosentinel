"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const CAS_OPTIONS = [
  { id: "spcas9", name: "dSpCas9 (NGG) — CRISPRi/a default", len: 20 },
  { id: "spcas9-ng", name: "dSpCas9-NG (NG)", len: 20 },
  { id: "sacas9", name: "dSaCas9 (NNGRRT)", len: 21 },
  { id: "ascas12a", name: "dAsCas12a (TTTV)", len: 23 },
];

const SCAFFOLD = "GTTTTAGAGCTAGAAATAGCAAGTTAAAATAAGGCTAGTCCGTTATCAACTTGAAAAAGTGGCACCGAGTCGGTGC";

type Candidate = { spacer: string; pam: string; strand: string; start: number; gc: number; score: number; warnings: string[] };
type OT = { mitSpecificity: number; cfdSpecificity: number | null; cfdApplicable: boolean; onTargetCount: number; offTargetCount: number; truncated: boolean };

export default function GuideDesigner() {
  const [target, setTarget] = useState("");
  const [casId, setCasId] = useState("spcas9");
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [reference, setReference] = useState("");
  const [ot, setOt] = useState<Record<string, OT | "loading" | "err">>({});

  async function design() {
    setLoading(true); setErr(""); setCands(null); setOt({});
    try {
      const res = await fetch(`${API_BASE}/api/guides/design`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, casId, count: 25 }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "design failed");
      setCands(d.candidates);
    } catch (e) { setErr(String(e)); } finally { setLoading(false); }
  }

  async function checkOffTarget(spacer: string) {
    if (!reference.trim()) { setErr("Paste a reference sequence (host genome region or plasmid) to score off-targets."); return; }
    setErr(""); setOt((o) => ({ ...o, [spacer]: "loading" }));
    try {
      const res = await fetch(`${API_BASE}/api/guides/offtarget`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spacer, casId, reference, maxMismatches: 4 }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "off-target failed");
      setOt((o) => ({ ...o, [spacer]: d }));
    } catch { setOt((o) => ({ ...o, [spacer]: "err" })); }
  }

  const cas = CAS_OPTIONS.find((c) => c.id === casId)!;
  const isSp = casId === "spcas9";

  return (
    <div>
      <div className="step">
        <h3><span className="step-n">1</span> Target region</h3>
        <p className="hint" style={{ margin: "0 0 8px" }}>
          Paste the region to target — for CRISPRi, the reporter promoter / 5′ end to silence; for CRISPRa, the activation
          window upstream of a weak promoter. FASTA or raw sequence.
        </p>
        <textarea
          className="search-input" style={{ minHeight: 110, fontFamily: "var(--mono)", fontSize: 12.5 }}
          placeholder=">target&#10;ATGC..." value={target} onChange={(e) => setTarget(e.target.value)}
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
          <select className="search-input" style={{ maxWidth: 320 }} value={casId} onChange={(e) => setCasId(e.target.value)}>
            {CAS_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn" onClick={design} disabled={loading || !target.trim()}>{loading ? "Designing…" : "Design guides"}</button>
        </div>
      </div>

      {err && <div className="notice" style={{ marginTop: 12 }}>{err}</div>}

      {cands && (
        <section className="block">
          <h2>Candidate guides <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>({cands.length}, ranked by on-target heuristic)</span></h2>
          <div className="step" style={{ marginBottom: 14 }}>
            <h3><span className="step-n">2</span> Off-target reference <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></h3>
            <p className="hint" style={{ margin: "0 0 8px" }}>Paste the host genome region / plasmid to scan for off-target binding (MIT + CFD scoring). Best kept to a few Mb.</p>
            <textarea className="search-input" style={{ minHeight: 70, fontFamily: "var(--mono)", fontSize: 12 }} placeholder=">host region&#10;ACGT..." value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <table className="parts">
            <thead><tr><th>Spacer (5′→3′)</th><th>PAM</th><th>Strand</th><th>GC</th><th>Score</th><th>Off-target</th></tr></thead>
            <tbody>
              {cands.map((c) => {
                const o = ot[c.spacer];
                return (
                  <tr key={c.spacer + c.strand + c.start}>
                    <td>
                      <span className="partseq" style={{ color: "var(--accent)" }}>{c.spacer}</span>
                      {c.warnings.length > 0 && <div style={{ color: "var(--warn)", fontSize: 11 }}>{c.warnings.join("; ")}</div>}
                    </td>
                    <td className="partseq">{c.pam}</td>
                    <td>{c.strand}</td>
                    <td style={{ color: c.gc < 30 || c.gc > 75 ? "var(--warn)" : "var(--muted)" }}>{c.gc}%</td>
                    <td><strong>{c.score}</strong></td>
                    <td>
                      {o === "loading" ? "scanning…" : o === "err" ? <span className="warn-inline">error</span> : o ? (
                        <span>MIT <strong>{o.mitSpecificity}</strong>{o.cfdApplicable ? <> · CFD <strong>{o.cfdSpecificity}</strong></> : ""} · {o.offTargetCount} hits</span>
                      ) : (
                        <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => checkOffTarget(c.spacer)}>Score</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isSp && cands[0] && (
            <div className="seq-row" style={{ marginTop: 16 }}>
              <div className="seq-name">Full sgRNA for the top guide (spacer + SpCas9 scaffold)</div>
              <div className="seq"><span style={{ color: "var(--accent)" }}>{cands[0].spacer}</span><span style={{ color: "var(--muted)" }}>{SCAFFOLD}</span></div>
            </div>
          )}
          <p className="footnote" style={{ marginTop: 12 }}>
            On-target score is a transparent heuristic (GC window, no poly-T/homopolymer). Off-target specificity uses the
            authentic MIT/Hsu 2013 and Doench/Fusi 2016 CFD models (CFD applies to 20-nt SpCas9 only). These guides use
            dead Cas for sensing — there is no cut outcome; off-target binding is the risk to minimize.
          </p>
        </section>
      )}
    </div>
  );
}

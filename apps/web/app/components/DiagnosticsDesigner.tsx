"use client";

import { useState } from "react";
import {
  DETECTION_PROFILES,
  crossReactivity,
  designAmplification,
  evaluateDiscrimination,
  findDetectionGuides,
  getDetectionProfile,
  type AmplificationDesign,
  type CrossHit,
  type DetectionGuide,
} from "@/lib/crispr-dx/biosensor";
import DetectionMapTrack from "./DetectionMapTrack";

type Example = { slug: string; name: string; platform?: string; gene?: string; casType?: string; sequence: string };

function profileForExample(ex: Example): string {
  if (ex.platform === "SHERLOCK" || ex.casType?.startsWith("Cas13")) return "sherlock-cas13a";
  return "detectr-cas12a";
}

function clean(raw: string): string {
  return raw.split(/\r?\n/).filter((l) => !l.startsWith(">")).join("").toUpperCase().replace(/U/g, "T").replace(/[^ACGT]/g, "");
}

export default function DiagnosticsDesigner({ examples }: { examples: Example[] }) {
  const [profileId, setProfileId] = useState("detectr-cas12a");
  const [target, setTarget] = useState("");
  const [seq, setSeq] = useState("");
  const [guides, setGuides] = useState<DetectionGuide[] | null>(null);
  const [selected, setSelected] = useState<DetectionGuide | null>(null);
  const [ampl, setAmpl] = useState<AmplificationDesign | null>(null);
  const [err, setErr] = useState("");
  const [offAllele, setOffAllele] = useState("");
  const [background, setBackground] = useState("");
  const [cross, setCross] = useState<CrossHit[] | null>(null);

  const profile = getDetectionProfile(profileId);

  function run(rawTarget: string, pid: string) {
    setErr(""); setGuides(null); setSelected(null); setAmpl(null); setCross(null);
    try {
      const p = getDetectionProfile(pid);
      const s = clean(rawTarget);
      setSeq(s);
      const g = findDetectionGuides(s, p).sort((a, b) => b.detection.score - a.detection.score);
      if (g.length === 0) { setErr("No valid detection guides found — check the target and platform (PAM/PFS)."); return; }
      const top = g.slice(0, 20);
      setGuides(top); setSelected(top[0]);
      if (p.requiresAmplification) setAmpl(designAmplification(s, top[0].protospacerStart, top[0].protospacerEnd, p));
    } catch (e) { setErr(String(e)); }
  }

  function loadExample(slug: string) {
    const ex = examples.find((e) => e.slug === slug);
    if (!ex) return;
    const pid = profileForExample(ex);
    setProfileId(pid); setTarget(ex.sequence); run(ex.sequence, pid);
  }

  // Variant discrimination for the selected guide vs an aligned off-allele.
  function disc() {
    if (!selected) return null;
    const off = clean(offAllele);
    const L = profile.spacerLength;
    const wT = seq.slice(selected.protospacerStart, selected.protospacerEnd);
    const wO = off.slice(selected.protospacerStart, selected.protospacerEnd);
    if (wO.length !== L) return { ok: false as const, msg: "Paste the same target region carrying the variant (must align to the target)." };
    const diffs: number[] = [];
    for (let i = 0; i < L; i++) if (wT[i] !== wO[i]) diffs.push(i);
    if (diffs.length === 0) return { ok: false as const, msg: "No difference in this guide's window — pick a guide whose spacer covers the SNP." };
    if (diffs.length > 1) return { ok: false as const, msg: `${diffs.length} differences in this guide's window — discrimination model assumes a single SNP.` };
    const wi = diffs[0];
    const spacerIdx = selected.strand === "+" ? wi : L - 1 - wi;
    return { ok: true as const, res: evaluateDiscrimination(selected, spacerIdx, L, profile.seed) };
  }
  const d = offAllele.trim() ? disc() : null;

  function scanCross() {
    if (!selected) return;
    setCross(crossReactivity(selected, profile, clean(background), 5).slice(0, 12));
  }

  return (
    <div>
      <div className="step">
        <h3><span className="step-n">1</span> Platform &amp; target</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <select className="search-input" style={{ maxWidth: 320 }} value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            {DETECTION_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {examples.length > 0 && (
            <select className="search-input" style={{ maxWidth: 300 }} defaultValue="" onChange={(e) => { if (e.target.value) loadExample(e.target.value); e.currentTarget.selectedIndex = 0; }}>
              <option value="">Load example (legacy assay)…</option>
              {examples.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
            </select>
          )}
        </div>
        <p className="hint" style={{ margin: "0 0 8px" }}>
          {profile.platform} · {profile.enzyme} · targets {profile.target} · {profile.recognition.kind === "PAM" ? `${profile.recognition.motif} PAM (${profile.recognition.side})` : profile.recognition.kind === "PFS" ? `PFS ${profile.recognition.motif}` : "no PAM/PFS"} · {profile.requiresAmplification ? "needs pre-amplification (RPA)" : "amplification-free"}. {profile.notes}
        </p>
        <textarea className="search-input" style={{ minHeight: 110, fontFamily: "var(--mono)", fontSize: 12.5 }} placeholder=">pathogen target&#10;ACGU/ACGT…" value={target} onChange={(e) => setTarget(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => run(target, profileId)} disabled={!target.trim()}>Design detection assay</button>
        </div>
      </div>

      {err && <div className="notice" style={{ marginTop: 12 }}>{err}</div>}

      {guides && (
        <>
          <section className="block">
            <h2>Detection guides (crRNA) <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>({guides.length}, best first — click a row or tick to select)</span></h2>
            <DetectionMapTrack guides={guides} selected={selected} onSelect={setSelected} seqLen={seq.length} amplicon={ampl?.forward && ampl?.reverse ? { start: ampl.ampliconStart, end: ampl.ampliconEnd } : null} />
            <table className="parts">
              <thead><tr><th>crRNA spacer (5′→3′)</th><th>Strand</th><th>Position</th><th>{profile.recognition.kind === "none" ? "—" : profile.recognition.kind}</th><th>Score</th><th>Flags</th></tr></thead>
              <tbody>
                {guides.map((g) => (
                  <tr key={g.id} onClick={() => setSelected(g)} style={{ cursor: "pointer", background: g.id === selected?.id ? "var(--panel-2, #18202c)" : undefined }}>
                    <td className="partseq" style={{ color: "var(--accent)" }}>{g.spacer}</td>
                    <td>{g.strand}</td>
                    <td>{g.protospacerStart}–{g.protospacerEnd}</td>
                    <td className="partseq">{g.recognitionSeq || "—"}</td>
                    <td><strong>{g.detection.score}</strong></td>
                    <td style={{ color: "var(--warn)", fontSize: 12 }}>{g.detection.flags.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="footnote" style={{ marginTop: 8 }}>Reporter: {profile.reporter ?? "—"}. Score favours a moderate GC band, low self-structure, and no long homopolymers.</p>
          </section>

          {ampl && (
            <section className="block">
              <h2>Pre-amplification (RPA) primers</h2>
              <p className="footnote" style={{ marginTop: 0 }}>{ampl.message}{ampl.t7Note ? ` ${ampl.t7Note}` : ""}</p>
              <table className="parts">
                <thead><tr><th>Primer</th><th>Sequence (5′→3′)</th><th>Tm</th><th>GC</th></tr></thead>
                <tbody>
                  <tr><td><strong>Forward</strong></td><td className="partseq">{ampl.forward?.sequence ?? "—"}</td><td>{ampl.forward ? `${ampl.forward.tm}°C` : "—"}</td><td>{ampl.forward ? `${Math.round(ampl.forward.gc * 100)}%` : "—"}</td></tr>
                  <tr><td><strong>Reverse</strong></td><td className="partseq">{ampl.reverse?.sequence ?? "—"}</td><td>{ampl.reverse ? `${ampl.reverse.tm}°C` : "—"}</td><td>{ampl.reverse ? `${Math.round(ampl.reverse.gc * 100)}%` : "—"}</td></tr>
                </tbody>
              </table>
              {ampl.forward && ampl.reverse && <p className="footnote">Amplicon: {ampl.ampliconStart}–{ampl.ampliconEnd} ({ampl.ampliconLength} bp).</p>}
            </section>
          )}

          {/* Specificity checks on the selected guide */}
          <section className="block">
            <h2>Specificity checks <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>(on the selected guide)</span></h2>
            <p className="footnote" style={{ marginTop: 0 }}>Selected: <span className="partseq" style={{ color: "var(--accent)" }}>{selected?.spacer}</span></p>

            <h3 style={{ fontSize: 14, marginTop: 16 }}>Variant discrimination (SNP typing)</h3>
            <p className="hint" style={{ margin: "0 0 6px" }}>Paste the same target region carrying a variant (SNP). We check whether the selected guide tells the alleles apart, and whether a synthetic mismatch (Gootenberg 2017) sharpens it.</p>
            <textarea className="search-input" style={{ minHeight: 60, fontFamily: "var(--mono)", fontSize: 12 }} placeholder=">off-allele (same region, with the SNP)&#10;ACGT…" value={offAllele} onChange={(e) => setOffAllele(e.target.value)} />
            {d && (d.ok ? (
              <dl className="kv" style={{ marginTop: 10 }}>
                <dt>SNP position in spacer</dt><dd>{d.res.snpSpacerIndex} {d.res.inSeed ? "(in seed — good)" : "(outside seed)"}</dd>
                <dt>Discrimination (target / off-allele)</dt><dd><strong>{d.res.discrimination.toFixed(1)}×</strong> (off-allele activity {Math.round(d.res.offAlleleActivity * 100)}%)</dd>
                <dt>Synthetic mismatch</dt><dd>{d.res.syntheticMismatchIndex != null ? `add at spacer index ${d.res.syntheticMismatchIndex} → ${d.res.tunedDiscrimination.toFixed(1)}× discrimination` : "none improves it"}</dd>
              </dl>
            ) : <p className="footnote" style={{ color: "var(--warn)" }}>{d.msg}</p>)}

            <h3 style={{ fontSize: 14, marginTop: 20 }}>Cross-reactivity</h3>
            <p className="hint" style={{ margin: "0 0 6px" }}>Paste related/background sequences (other strains, host) to find sites the selected guide might fire on (false positives).</p>
            <textarea className="search-input" style={{ minHeight: 60, fontFamily: "var(--mono)", fontSize: 12 }} placeholder=">background / related sequences&#10;ACGT…" value={background} onChange={(e) => setBackground(e.target.value)} />
            <div style={{ marginTop: 8 }}><button className="btn secondary" onClick={scanCross} disabled={!background.trim()}>Scan cross-reactivity</button></div>
            {cross && (cross.length === 0 ? <p className="footnote" style={{ color: "#86efac", marginTop: 8 }}>✓ No concerning cross-reactive sites within 5 mismatches.</p> : (
              <table className="parts" style={{ marginTop: 10 }}>
                <thead><tr><th>Position</th><th>Strand</th><th>Sequence</th><th>Mismatches</th><th>Predicted activity</th></tr></thead>
                <tbody>
                  {cross.map((h, i) => (
                    <tr key={i}><td>{h.start}</td><td>{h.strand}</td><td className="partseq">{h.sequence}</td><td>{h.mismatches}</td>
                      <td style={{ color: h.activity > 0.3 ? "var(--warn)" : "var(--muted)" }}>{Math.round(h.activity * 100)}%</td></tr>
                  ))}
                </tbody>
              </table>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

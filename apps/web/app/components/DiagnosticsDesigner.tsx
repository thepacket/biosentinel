"use client";

import { useState } from "react";
import {
  DETECTION_PROFILES,
  designAmplification,
  findDetectionGuides,
  getDetectionProfile,
  type AmplificationDesign,
  type DetectionGuide,
} from "@/lib/crispr-dx/biosensor";

type Example = { slug: string; name: string; platform?: string; gene?: string; casType?: string; sequence: string };

function profileForExample(ex: Example): string {
  if (ex.platform === "SHERLOCK" || ex.casType?.startsWith("Cas13")) return "sherlock-cas13a";
  if (ex.platform === "DETECTR" || ex.casType === "Cas12a") return "detectr-cas12a";
  return "detectr-cas12a";
}

export default function DiagnosticsDesigner({ examples }: { examples: Example[] }) {
  const [profileId, setProfileId] = useState("detectr-cas12a");
  const [target, setTarget] = useState("");
  const [guides, setGuides] = useState<DetectionGuide[] | null>(null);
  const [ampl, setAmpl] = useState<AmplificationDesign | null>(null);
  const [err, setErr] = useState("");

  const profile = getDetectionProfile(profileId);

  function run(seq: string, pid: string) {
    setErr(""); setGuides(null); setAmpl(null);
    try {
      const p = getDetectionProfile(pid);
      const g = findDetectionGuides(seq, p).sort((a, b) => b.detection.score - a.detection.score);
      if (g.length === 0) { setErr("No valid detection guides found — check the target sequence and platform (PAM/PFS)."); return; }
      setGuides(g.slice(0, 20));
      if (p.requiresAmplification) {
        const top = g[0];
        setAmpl(designAmplification(seq, top.protospacerStart, top.protospacerEnd, p));
      }
    } catch (e) { setErr(String(e)); }
  }

  function loadExample(slug: string) {
    const ex = examples.find((e) => e.slug === slug);
    if (!ex) return;
    const pid = profileForExample(ex);
    setProfileId(pid); setTarget(ex.sequence);
    run(ex.sequence, pid);
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
        <textarea
          className="search-input" style={{ minHeight: 110, fontFamily: "var(--mono)", fontSize: 12.5 }}
          placeholder=">pathogen target (the region to detect)&#10;ACGU/ACGT…" value={target} onChange={(e) => setTarget(e.target.value)}
        />
        <div style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => run(target, profileId)} disabled={!target.trim()}>Design detection assay</button>
        </div>
      </div>

      {err && <div className="notice" style={{ marginTop: 12 }}>{err}</div>}

      {guides && (
        <>
          <section className="block">
            <h2>Detection guides (crRNA) <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>({guides.length}, best first)</span></h2>
            <table className="parts">
              <thead><tr><th>crRNA spacer (5′→3′)</th><th>Strand</th><th>Position</th><th>{profile.recognition.kind === "none" ? "—" : profile.recognition.kind}</th><th>Score</th><th>Flags</th></tr></thead>
              <tbody>
                {guides.map((g) => (
                  <tr key={g.id}>
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
              {ampl.forward && ampl.reverse && (
                <p className="footnote">Amplicon: {ampl.ampliconStart}–{ampl.ampliconEnd} ({ampl.ampliconLength} bp) flanking the detection site.</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

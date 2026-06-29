/**
 * CRISPR biosensor / diagnostics design.
 *
 * Specialises the core for nucleic-acid detection rather than genome editing:
 *
 *   - DETECTR  (Cas12a)        dsDNA target, 5' TTTV PAM, collateral ssDNA
 *   - SHERLOCK (Cas13a/Cas13d) ssRNA target, 3' PFS (Cas13a), collateral ssRNA
 *   - dCas9 binding sensor     dsDNA target, 3' NGG PAM, binding only (no
 *                              collateral) — read out by a transducer (FET/SPR/
 *                              electrochemical), e.g. CRISPR-Chip
 *
 * Detection design differs from editing design: we optimise for target
 * recognition and, crucially, for *discrimination* between a target allele and a
 * near-identical off-allele (SNP / variant typing), and we screen for
 * cross-reactivity against background sequence (false-positive risk).
 *
 * All efficiency / tolerance values are transparent heuristics grounded in the
 * established position-of-effect rules (seed regions, PFS, synthetic-mismatch
 * tuning à la Gootenberg 2017), NOT trained models. Validate experimentally.
 */

import { gcContent, longestHomopolymer, reverseComplement } from "./sequence";

export type TargetNucleicAcid = "dsDNA" | "ssRNA";
export type Collateral = "ssDNA" | "ssRNA" | "none";

/** Where the enzyme's mismatch-sensitive "seed" sits along the spacer. */
export type SeedKind = "5end" | "3end" | "central";

export interface DetectionProfile {
  id: string;
  name: string;
  platform: "DETECTR" | "SHERLOCK" | "dCas9-binding";
  enzyme: string;
  target: TargetNucleicAcid;
  spacerLength: number;
  /** target recognition requirement */
  recognition:
    | { kind: "PAM"; motif: string; side: "5prime" | "3prime" }
    | { kind: "PFS"; motif: string } // 3' protospacer-flanking site (Cas13a)
    | { kind: "none" };
  collateral: Collateral;
  seed: SeedKind;
  reporter: string | null;
  requiresAmplification: boolean;
  notes: string;
}

export const DETECTION_PROFILES: DetectionProfile[] = [
  {
    id: "detectr-cas12a",
    name: "DETECTR — LbCas12a (TTTV)",
    platform: "DETECTR",
    enzyme: "LbCas12a",
    target: "dsDNA",
    spacerLength: 20,
    recognition: { kind: "PAM", motif: "TTTV", side: "5prime" },
    collateral: "ssDNA",
    seed: "5end", // PAM-proximal (5') seed for Cas12a
    reporter: "FQ-ssDNA reporter, e.g. /56-FAM/TTATT/3IABkFQ/",
    requiresAmplification: true,
    notes:
      "Targets dsDNA; on recognition, collateral ssDNase activity cleaves an FQ reporter. Typically preceded by isothermal pre-amplification (RPA).",
  },
  {
    id: "sherlock-cas13a",
    name: "SHERLOCK — LwaCas13a (PFS: H)",
    platform: "SHERLOCK",
    enzyme: "LwaCas13a",
    target: "ssRNA",
    spacerLength: 28,
    recognition: { kind: "PFS", motif: "H" }, // 3' flanking base must be A/C/U (non-G)
    collateral: "ssRNA",
    seed: "central", // Cas13a has a central seed
    reporter: "FQ-polyU ssRNA reporter, e.g. /56-FAM/rUrUrUrU/3IABkFQ/",
    requiresAmplification: true,
    notes:
      "Targets ssRNA; collateral ssRNase activity cleaves a poly-U FQ reporter. Requires RPA + T7 transcription to generate target RNA. LwaCas13a prefers a non-G 3' protospacer-flanking site (PFS = H).",
  },
  {
    id: "sherlock-cas13d",
    name: "SHERLOCK — RfxCas13d / CasRx (no PFS)",
    platform: "SHERLOCK",
    enzyme: "RfxCas13d",
    target: "ssRNA",
    spacerLength: 23,
    recognition: { kind: "none" },
    collateral: "ssRNA",
    seed: "central",
    reporter: "FQ-polyU ssRNA reporter",
    requiresAmplification: true,
    notes:
      "Compact Cas13d; targets ssRNA with no strict PFS requirement, broadening targetable space. Collateral ssRNase readout.",
  },
  {
    id: "dcas9-binding",
    name: "dCas9 binding sensor (NGG)",
    platform: "dCas9-binding",
    enzyme: "dSpCas9",
    target: "dsDNA",
    spacerLength: 20,
    recognition: { kind: "PAM", motif: "NGG", side: "3prime" },
    collateral: "none",
    seed: "3end", // PAM-proximal (3') seed for SpCas9
    reporter: "transducer (graphene-FET / electrochemical / SPR) — binding, not cleavage",
    requiresAmplification: false,
    notes:
      "Catalytically dead Cas9 used purely as a programmable DNA-binding probe; the binding event is transduced (e.g. CRISPR-Chip). No collateral cleavage, often amplification-free.",
  },
];

const BY_ID = new Map(DETECTION_PROFILES.map((p) => [p.id, p]));
export function getDetectionProfile(id: string): DetectionProfile {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Unknown detection profile: ${id}`);
  return p;
}

const IUPAC: Record<string, string> = {
  A: "A", C: "C", G: "G", T: "T",
  R: "AG", Y: "CT", S: "GC", W: "AT", K: "GT", M: "AC",
  B: "CGT", D: "AGT", H: "ACT", V: "ACG", N: "ACGT",
};
function matchCode(base: string, code: string): boolean {
  return (IUPAC[code] ?? "").includes(base);
}
function matchMotif(seq: string, motif: string): boolean {
  if (seq.length !== motif.length) return false;
  for (let i = 0; i < motif.length; i++) if (!matchCode(seq[i], motif[i])) return false;
  return true;
}

export interface DetectionScore {
  score: number;
  components: { gc: number; structure: number; homopolymer: number };
  flags: string[];
}

/**
 * Score a candidate detection spacer (the crRNA targeting sequence). Detection
 * favours a moderate GC band, low self-structure (so the crRNA/target are
 * accessible), and no long homopolymers.
 */
export function scoreDetection(spacer: string): DetectionScore {
  const flags: string[] = [];
  const gc = gcContent(spacer);
  const gcS = gc >= 0.4 && gc <= 0.6 ? 1 : Math.max(0, 1 - Math.abs(gc - 0.5) / 0.4);
  if (gc < 0.3) flags.push("low-GC");
  if (gc > 0.7) flags.push("high-GC");

  const struct = 1 - selfComplementarity(spacer);
  if (struct < 0.6) flags.push("self-structure");

  const hp = longestHomopolymer(spacer);
  const hpS = Math.max(0, 1 - Math.max(0, hp - 3) / 3);
  if (hp >= 5) flags.push(`homopolymer-${hp}`);

  const score = Math.round((0.4 * gcS + 0.4 * struct + 0.2 * hpS) * 100);
  return {
    score,
    components: {
      gc: Math.round(gcS * 100),
      structure: Math.round(struct * 100),
      homopolymer: Math.round(hpS * 100),
    },
    flags,
  };
}

/** Rough self-complementarity in [0,1]: fraction of the spacer that pairs with
 *  its own reverse complement in register (a cheap hairpin proxy). */
export function selfComplementarity(spacer: string): number {
  const rc = reverseComplement(spacer);
  let best = 0;
  const n = spacer.length;
  // slide rc against spacer; count the longest complementary run
  for (let shift = -(n - 4); shift <= n - 4; shift++) {
    let run = 0;
    for (let i = 0; i < n; i++) {
      const j = i + shift;
      if (j < 0 || j >= n) continue;
      if (spacer[i] === rc[j]) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
  }
  return Math.min(1, best / n);
}

export interface DetectionGuide {
  id: string;
  /** "+"/"-" for dsDNA strands; "rna" for a Cas13 RNA target */
  strand: "+" | "-" | "rna";
  protospacerStart: number;
  protospacerEnd: number;
  /** crRNA spacer to order (5'->3') */
  spacer: string;
  /** observed PAM or PFS (empty if none) */
  recognitionSeq: string;
  detection: DetectionScore;
}

/**
 * Enumerate detection crRNAs across a target. For dsDNA enzymes this scans both
 * strands with the PAM rule (spacer = protospacer). For ssRNA (Cas13) it scans
 * the sense RNA and the crRNA is the reverse complement of each target window,
 * honouring the 3' PFS when required.
 */
export function findDetectionGuides(target: string, profile: DetectionProfile): DetectionGuide[] {
  const seq = target.toUpperCase().replace(/U/g, "T");
  const out: DetectionGuide[] = [];
  const L = profile.spacerLength;

  if (profile.target === "ssRNA") {
    // Cas13: crRNA = revcomp(target window); PFS is the base immediately 3' of
    // the protospacer on the target.
    const pfs = profile.recognition.kind === "PFS" ? profile.recognition.motif : null;
    for (let i = 0; i + L <= seq.length; i++) {
      const window = seq.slice(i, i + L);
      if (window.includes("N")) continue;
      if (pfs) {
        const flank = seq[i + L];
        if (flank === undefined || !matchCode(flank, pfs)) continue;
      }
      const spacer = reverseComplement(window);
      out.push({
        id: `${profile.id}:rna:${i}`,
        strand: "rna",
        protospacerStart: i,
        protospacerEnd: i + L,
        spacer,
        recognitionSeq: pfs ? seq[i + L] : "",
        detection: scoreDetection(spacer),
      });
    }
  } else {
    const rec = profile.recognition;
    if (rec.kind !== "PAM") return out;
    const P = rec.motif.length;
    const scan = (s: string, strand: "+" | "-") => {
      const N = s.length;
      if (rec.side === "5prime") {
        for (let j = 0; j + P + L <= s.length; j++) {
          const pam = s.slice(j, j + P);
          if (!matchMotif(pam, rec.motif)) continue;
          const spacer = s.slice(j + P, j + P + L);
          if (spacer.includes("N")) continue;
          push(strand, N, j + P, j + P + L, spacer, pam);
        }
      } else {
        for (let j = L; j + P <= s.length; j++) {
          const pam = s.slice(j, j + P);
          if (!matchMotif(pam, rec.motif)) continue;
          const spacer = s.slice(j - L, j);
          if (spacer.includes("N")) continue;
          push(strand, N, j - L, j, spacer, pam);
        }
      }
    };
    const push = (
      strand: "+" | "-",
      N: number,
      pStart: number,
      pEnd: number,
      spacer: string,
      pam: string,
    ) => {
      const start = strand === "+" ? pStart : N - pEnd;
      const end = strand === "+" ? pEnd : N - pStart;
      out.push({
        id: `${profile.id}:${strand}:${start}`,
        strand,
        protospacerStart: start,
        protospacerEnd: end,
        spacer,
        recognitionSeq: pam,
        detection: scoreDetection(spacer),
      });
    };
    scan(seq, "+");
    scan(reverseComplement(seq), "-");
  }

  out.sort((a, b) => b.detection.score - a.detection.score || a.protospacerStart - b.protospacerStart);
  return out;
}

/** Mismatch tolerance in [0,1] at 0-based spacer index for a profile's seed.
 *  1 = mismatch fully tolerated (poor discriminator); 0 = mismatch abolishes
 *  activity (excellent discriminator). */
export function mismatchTolerance(idx: number, length: number, seed: SeedKind): number {
  const t = length <= 1 ? 0 : idx / (length - 1); // 0 at 5' end, 1 at 3' end
  switch (seed) {
    case "5end":
      return clamp01(0.1 + 0.85 * t); // intolerant at 5', tolerant at 3'
    case "3end":
      return clamp01(0.95 - 0.85 * t); // tolerant at 5', intolerant at 3'
    case "central": {
      const d = Math.abs(t - 0.5) * 2; // 0 at centre, 1 at ends
      return clamp01(0.1 + 0.85 * d); // intolerant centre, tolerant ends
    }
  }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export interface DiscriminationResult {
  guideId: string;
  spacer: string;
  /** 0-based spacer index where the SNP falls */
  snpSpacerIndex: number;
  inSeed: boolean;
  /** predicted relative activity on the intended target allele (0-1) */
  targetActivity: number;
  /** predicted relative activity on the off allele (0-1) */
  offAlleleActivity: number;
  /** targetActivity / offAlleleActivity, higher = better discrimination */
  discrimination: number;
  /** recommended synthetic-mismatch spacer index, or null if none helps */
  syntheticMismatchIndex: number | null;
  /** discrimination after adding the synthetic mismatch */
  tunedDiscrimination: number;
}

/**
 * For a guide whose spacer covers a SNP, estimate how well it distinguishes the
 * target allele from the off allele, and whether adding one synthetic mismatch
 * (Gootenberg 2017 strategy) sharpens the discrimination.
 *
 * `snpSpacerIndex` is the SNP's position within the spacer (0-based). A guide
 * designed against the target perfectly matches it (targetActivity ≈ 1); the off
 * allele introduces a mismatch at the SNP position.
 */
export function evaluateDiscrimination(
  guide: DetectionGuide,
  snpSpacerIndex: number,
  length: number,
  seed: SeedKind,
): DiscriminationResult {
  const tolAtSnp = mismatchTolerance(snpSpacerIndex, length, seed);
  const targetActivity = 1; // perfect match to target
  const offAlleleActivity = tolAtSnp; // single mismatch at the SNP
  const discrimination = targetActivity / Math.max(offAlleleActivity, 1e-3);
  const inSeed = tolAtSnp < 0.5;

  // Try a synthetic mismatch adjacent to the SNP. Target then has 1 (synthetic)
  // mismatch; off-allele has 2 (synthetic + SNP). Pick the position maximising
  // off-allele suppression while keeping target activity usable (>= 0.3).
  let bestIdx: number | null = null;
  let bestTuned = discrimination;
  for (let d = -2; d <= 2; d++) {
    const idx = snpSpacerIndex + d;
    if (idx < 0 || idx >= length || idx === snpSpacerIndex) continue;
    const tolSyn = mismatchTolerance(idx, length, seed);
    const tgt = tolSyn; // target: only the synthetic mismatch
    if (tgt < 0.3) continue; // would kill the real signal
    const off = tolSyn * tolAtSnp; // off-allele: synthetic AND snp
    const tuned = tgt / Math.max(off, 1e-3);
    if (tuned > bestTuned) {
      bestTuned = tuned;
      bestIdx = idx;
    }
  }

  return {
    guideId: guide.id,
    spacer: guide.spacer,
    snpSpacerIndex,
    inSeed,
    targetActivity,
    offAlleleActivity,
    discrimination,
    syntheticMismatchIndex: bestIdx,
    tunedDiscrimination: bestTuned,
  };
}

export interface CrossHit {
  start: number;
  strand: "+" | "-";
  sequence: string;
  mismatches: number;
  /** predicted relative activity on this background site (0-1) */
  activity: number;
}

/**
 * Client-side cross-reactivity scan: find background sites the crRNA could fire
 * on (false-positive risk). PAM/PFS-aware. `activity` uses the seed-tolerance
 * model; sites with high activity and few mismatches are the real concern.
 */
export function crossReactivity(
  guide: DetectionGuide,
  profile: DetectionProfile,
  background: string,
  maxMismatches = 5,
): CrossHit[] {
  const seq = background.toUpperCase().replace(/U/g, "T");
  const L = profile.spacerLength;
  const hits: CrossHit[] = [];

  const consider = (candidate: string, start: number, strand: "+" | "-") => {
    if (candidate.length !== L || candidate.includes("N")) return;
    // compare crRNA's targeted protospacer to the candidate
    const proto = guide.strand === "rna" ? reverseComplement(guide.spacer) : guide.spacer;
    let mm = 0;
    const mmIdx: number[] = [];
    for (let i = 0; i < L; i++) {
      if (proto[i] !== candidate[i]) {
        mm++;
        mmIdx.push(i);
      }
    }
    if (mm > maxMismatches) return;
    let activity = 1;
    for (const i of mmIdx) {
      // mismatch index relative to the spacer's 5' end
      const spacerIdx = guide.strand === "rna" ? L - 1 - i : i;
      activity *= mismatchTolerance(spacerIdx, L, profile.seed);
    }
    hits.push({ start, strand, sequence: candidate, mismatches: mm, activity });
  };

  // For RNA targets, scan sense strand only; for dsDNA, both strands.
  const scanStrand = (s: string, strand: "+" | "-") => {
    for (let i = 0; i + L <= s.length; i++) consider(s.slice(i, i + L), i, strand);
  };
  scanStrand(seq, "+");
  if (profile.target === "dsDNA") scanStrand(reverseComplement(seq), "-");

  hits.sort((a, b) => b.activity - a.activity || a.mismatches - b.mismatches);
  return hits;
}

export interface Primer {
  sequence: string;
  start: number;
  end: number;
  tm: number;
  gc: number;
}

export interface AmplificationDesign {
  forward: Primer | null;
  reverse: Primer | null;
  ampliconStart: number;
  ampliconEnd: number;
  ampliconLength: number;
  t7Note: string | null;
  message: string;
}

/**
 * Design an isothermal (RPA-style) primer pair flanking a detection target.
 * RPA primers are long (~30-35 nt); we pick flanking windows with acceptable GC
 * and no long homopolymer, aiming for the requested amplicon size. For SHERLOCK
 * (RNA) a T7 promoter must be appended to the forward primer.
 */
export function designAmplification(
  target: string,
  targetStart: number,
  targetEnd: number,
  profile: DetectionProfile,
  opts: { primerLen?: number; minAmplicon?: number; maxAmplicon?: number } = {},
): AmplificationDesign {
  const seq = target.toUpperCase().replace(/U/g, "T");
  const primerLen = opts.primerLen ?? 32;
  const minAmp = opts.minAmplicon ?? 100;
  const maxAmp = opts.maxAmplicon ?? 200;

  // Forward primer: entirely upstream of the target, best GC.
  const fwd = bestPrimer(seq, 0, targetStart - primerLen, primerLen);
  // Reverse primer: entirely downstream of the target AND constrained so the
  // amplicon (fwd.start .. rev.end) falls in the requested size window.
  let rev: Primer | null = null;
  if (fwd) {
    const revLoStart = Math.max(targetEnd, fwd.start + minAmp - primerLen);
    const revHiStart = fwd.start + maxAmp - primerLen;
    rev = bestPrimer(seq, revLoStart, revHiStart, primerLen);
  }

  let ampStart = -1;
  let ampEnd = -1;
  if (fwd && rev) {
    ampStart = fwd.start;
    ampEnd = rev.end;
  }

  const t7Note =
    profile.target === "ssRNA"
      ? "Append a T7 promoter (TAATACGACTCACTATAGGG) to the 5' end of the forward primer to transcribe target RNA for Cas13."
      : null;

  return {
    forward: fwd,
    reverse: rev ? revPrimer(rev) : null,
    ampliconStart: ampStart,
    ampliconEnd: ampEnd,
    ampliconLength: ampStart >= 0 ? ampEnd - ampStart : 0,
    t7Note,
    message:
      fwd && rev
        ? `Amplicon ${ampEnd - ampStart} bp spanning the target.`
        : "Could not place both primers within the amplicon window — provide more flanking sequence.",
  };
}

/** Best primer (closest GC to 50%, no long homopolymer) whose start falls in
 *  the inclusive range [loStart, hiStart]. */
function bestPrimer(seq: string, loStart: number, hiStart: number, len: number): Primer | null {
  const lo = Math.max(0, loStart);
  const hi = Math.min(hiStart, seq.length - len);
  let best: Primer | null = null;
  let bestScore = -1;
  for (let start = lo; start <= hi; start++) {
    const s = seq.slice(start, start + len);
    if (s.includes("N")) continue;
    const gc = gcContent(s);
    if (gc < 0.3 || gc > 0.7) continue;
    if (longestHomopolymer(s) >= 5) continue;
    const score = 1 - Math.abs(gc - 0.5); // prefer ~50% GC
    if (score > bestScore) {
      bestScore = score;
      best = { sequence: s, start, end: start + len, tm: approxTm(s), gc };
    }
  }
  return best;
}

function revPrimer(p: Primer): Primer {
  return { ...p, sequence: reverseComplement(p.sequence) };
}

/** Wallace-rule-ish approximate Tm for a short oligo (°C). */
export function approxTm(s: string): number {
  let at = 0;
  let gc = 0;
  for (const c of s) {
    if (c === "A" || c === "T") at++;
    else if (c === "G" || c === "C") gc++;
  }
  // 64.9 + 41*(gc-16.4)/(at+gc) is a common short-oligo estimate
  const n = at + gc;
  if (n === 0) return 0;
  return Math.round((64.9 + (41 * (gc - 16.4)) / n) * 10) / 10;
}

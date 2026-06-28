"""Guide-RNA design for whole-cell CRISPR biosensors.

Enumerates candidate spacers in a target region (e.g. a reporter promoter to
silence with CRISPRi, or an activation window for CRISPRa) for a chosen Cas, and
ranks them with a transparent on-target heuristic. Off-target scoring against a
reference reuses the vendored CRISPR Studio engine (see app/crispr_studio/).

Note: these designs use catalytically-dead Cas (dCas9/dCas12a) for sensing, so
there is no cut-site outcome — the relevant scores are guide quality and
off-target binding risk.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any

from .crispr_studio.cas import CasProfile, get_profile
from .crispr_studio.genome import matches_iupac, parse_fasta, reverse_complement


@dataclass
class GuideCandidate:
    spacer: str
    pam: str
    strand: str
    start: int
    gc: int
    score: int
    warnings: list[str]


def _gc(s: str) -> int:
    return round(100 * sum(c in "GC" for c in s) / len(s)) if s else 0


def _longest_run(s: str) -> int:
    best = run = 1
    for i in range(1, len(s)):
        run = run + 1 if s[i] == s[i - 1] else 1
        best = max(best, run)
    return best if s else 0


def _evaluate(spacer: str) -> tuple[int, list[str]]:
    """Transparent on-target heuristic: GC window, no poly-T, no long runs."""
    warnings: list[str] = []
    score = 100
    gc = _gc(spacer)
    if gc < 30 or gc > 75:
        score -= 30
        warnings.append(f"GC {gc}% outside 30-75%")
    elif gc < 40 or gc > 70:
        score -= 10
    if "TTTT" in spacer:
        score -= 25
        warnings.append("poly-T (TTTT) — RNA Pol III terminator / folding risk")
    run = _longest_run(spacer)
    if run >= 5:
        score -= 15
        warnings.append(f"homopolymer run of {run}")
    return max(score, 0), warnings


def _scan(seq: str, strand: str, profile: CasProfile) -> list[GuideCandidate]:
    L, P = profile.spacer_length, len(profile.pam)
    out: list[GuideCandidate] = []
    if profile.pam_side == "3prime":
        for j in range(L, len(seq) - P + 1):
            proto, pam = seq[j - L : j], seq[j : j + P]
            if "N" in proto or not matches_iupac(pam, profile.pam):
                continue
            score, warns = _evaluate(proto)
            out.append(GuideCandidate(proto, pam, strand, j - L, _gc(proto), score, warns))
    else:  # 5' PAM (Cas12a): PAM then protospacer
        for j in range(0, len(seq) - P - L + 1):
            pam, proto = seq[j : j + P], seq[j + P : j + P + L]
            if "N" in proto or not matches_iupac(pam, profile.pam):
                continue
            score, warns = _evaluate(proto)
            out.append(GuideCandidate(proto, pam, strand, j, _gc(proto), score, warns))
    return out


def design_guides(target: str, cas_id: str, count: int = 20) -> dict[str, Any]:
    profile = get_profile(cas_id)
    records = parse_fasta(target)
    if not records:
        raise ValueError("target contained no usable sequence")
    seq = "".join(r.seq for r in records)
    if len(seq) < profile.spacer_length + len(profile.pam):
        raise ValueError("target sequence is too short for this Cas")

    cands = _scan(seq, "+", profile) + _scan(reverse_complement(seq), "-", profile)
    # de-dup identical spacers, keep the best-scoring instance
    best: dict[str, GuideCandidate] = {}
    for c in cands:
        if c.spacer not in best or c.score > best[c.spacer].score:
            best[c.spacer] = c
    ranked = sorted(best.values(), key=lambda c: c.score, reverse=True)[:count]
    return {
        "cas": {"id": profile.id, "name": profile.name, "pam": profile.pam, "pamSide": profile.pam_side, "spacerLength": profile.spacer_length, "cfdApplicable": profile.cfd_applicable},
        "targetLength": len(seq),
        "count": len(ranked),
        "candidates": [asdict(c) for c in ranked],
    }

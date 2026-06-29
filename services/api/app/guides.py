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

import urllib.request
from dataclasses import dataclass, asdict
from functools import lru_cache
from typing import Any

from .crispr_studio.cas import CasProfile, get_profile
from .crispr_studio.genome import matches_iupac, parse_fasta, reverse_complement


def genome_fetchable(accession: str | None) -> bool:
    """RefSeq nucleotide accessions (NC_/NZ_/NG_) can be fetched from NCBI;
    assembly accessions (GCF_/GCA_) cannot be efetched directly."""
    return bool(accession) and accession[:3] in ("NC_", "NZ_", "NG_")


@lru_cache(maxsize=8)
def fetch_genome_fasta(accession: str) -> str:
    """Fetch a genome/sequence FASTA from NCBI by accession (cached in memory)."""
    if not genome_fetchable(accession):
        raise ValueError(f"genome auto-fetch not available for accession '{accession}'")
    url = (
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
        f"?db=nuccore&id={accession}&rettype=fasta&retmode=text"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Biosentinel/1.0"})
    with urllib.request.urlopen(req, timeout=45) as r:  # noqa: S310 (fixed NCBI host)
        text = r.read().decode("utf-8", "replace")
    if not text.startswith(">"):
        raise ValueError("NCBI did not return a FASTA record")
    return text


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


def _scan(seq: str, strand: str, profile: CasProfile, total_len: int) -> list[GuideCandidate]:
    """Scan one strand. `start` is always reported in top-strand coordinates so
    a guide's footprint can be highlighted on the original target."""
    L, P = profile.spacer_length, len(profile.pam)
    out: list[GuideCandidate] = []

    def add(local_start: int, proto: str, pam: str) -> None:
        start = local_start if strand == "+" else total_len - (local_start + L)
        score, warns = _evaluate(proto)
        out.append(GuideCandidate(proto, pam, strand, start, _gc(proto), score, warns))

    if profile.pam_side == "3prime":
        for j in range(L, len(seq) - P + 1):
            proto, pam = seq[j - L : j], seq[j : j + P]
            if "N" in proto or not matches_iupac(pam, profile.pam):
                continue
            add(j - L, proto, pam)
    else:  # 5' PAM (Cas12a): PAM then protospacer
        for j in range(0, len(seq) - P - L + 1):
            pam, proto = seq[j : j + P], seq[j + P : j + P + L]
            if "N" in proto or not matches_iupac(pam, profile.pam):
                continue
            add(j + P, proto, pam)
    return out


def design_guides(target: str, cas_id: str, count: int = 20) -> dict[str, Any]:
    profile = get_profile(cas_id)
    records = parse_fasta(target)
    if not records:
        raise ValueError("target contained no usable sequence")
    seq = "".join(r.seq for r in records)
    if len(seq) < profile.spacer_length + len(profile.pam):
        raise ValueError("target sequence is too short for this Cas")

    n = len(seq)
    cands = _scan(seq, "+", profile, n) + _scan(reverse_complement(seq), "-", profile, n)
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

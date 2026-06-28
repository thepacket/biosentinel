"""Genome-scale off-target search.

Exhaustively scans a reference (one or more FASTA records, both strands) for
PAM-flanked sites within a mismatch budget of a guide spacer — the Cas-OFFinder
strategy, in portable pure Python. Each hit is scored with both the MIT/Hsu
(2013) model and, where applicable, the Doench 2016 CFD model; per-guide
aggregate specificity scores are reported for each.

This is exact (not indexed/bit-parallel), so it is intended for references up to
a few megabases — gene panels, plasmids, BACs, viral/organelle genomes, or
individual chromosomes — not a full unindexed 3 Gb genome in one request.
"""

from dataclasses import dataclass, field

from .cas import CasProfile
from .cfd import cfd_score
from .genome import Record, hamming, matches_iupac, reverse_complement

# MIT/Hsu position weights; index 0 = PAM-distal, 19 = PAM-proximal.
_MIT_W = [
    0.0, 0.0, 0.014, 0.0, 0.0, 0.395, 0.317, 0.0, 0.389, 0.079, 0.445, 0.508,
    0.613, 0.851, 0.732, 0.828, 0.615, 0.804, 0.685, 0.583,
]

# Practical ceiling on total reference size for a single request.
MAX_TOTAL_BP = 20_000_000


@dataclass
class Hit:
    record: str
    strand: str
    start: int  # 0-based, on the record's top strand
    end: int
    sequence: str
    pam: str
    mismatches: int
    mismatch_positions: list[int]
    mit_score: float
    cfd_score: float | None


@dataclass
class OffTargetResult:
    hits: list[Hit] = field(default_factory=list)
    on_target_count: int = 0
    mit_specificity: int = 0
    cfd_specificity: int | None = None
    scanned_bp: int = 0
    truncated: bool = False


def _position_weight(idx: int, length: int, proximal_high: bool) -> float:
    if length == 20 and proximal_high:
        return _MIT_W[idx]
    dist = (length - 1 - idx) if proximal_high else idx
    frac = 0.0 if length <= 1 else dist / (length - 1)
    return 0.85 - 0.65 * frac


def mit_site_score(mismatch_idx: list[int], length: int, proximal_high: bool) -> float:
    n = len(mismatch_idx)
    if n == 0:
        return 100.0
    t1 = 1.0
    for idx in mismatch_idx:
        t1 *= 1 - _position_weight(idx, length, proximal_high)
    t2 = 1.0
    if n > 1:
        s = sorted(mismatch_idx)
        mean_dist = (s[-1] - s[0]) / (n - 1)
        d = mean_dist * 19 / (length - 1)
        t2 = 1 / (((19 - d) / 19) * 4 + 1)
    t3 = 1 / (n * n)
    return t1 * t2 * t3 * 100


def _scan_strand(
    seq: str,
    record: str,
    strand: str,
    ref_len: int,
    spacer: str,
    profile: CasProfile,
    max_mm: int,
    proximal_high: bool,
) -> list[Hit]:
    L = profile.spacer_length
    P = len(profile.pam)
    hits: list[Hit] = []

    def consider(proto_start: int, pam_start: int) -> None:
        candidate = seq[proto_start : proto_start + L]
        if len(candidate) != L or "N" in candidate:
            return
        pam = seq[pam_start : pam_start + P]
        if not matches_iupac(pam, profile.pam):
            return
        mm = [i for i in range(L) if spacer[i] != candidate[i]]
        if len(mm) > max_mm:
            return
        local_end = proto_start + L
        start = proto_start if strand == "+" else ref_len - local_end
        end = local_end if strand == "+" else ref_len - proto_start
        cfd = None
        if profile.cfd_applicable and L == 20:
            cfd = cfd_score(spacer, candidate, pam)
        hits.append(
            Hit(
                record=record,
                strand=strand,
                start=start,
                end=end,
                sequence=candidate,
                pam=pam,
                mismatches=len(mm),
                mismatch_positions=mm,
                mit_score=mit_site_score(mm, L, proximal_high),
                cfd_score=cfd,
            )
        )

    if profile.pam_side == "3prime":
        for j in range(L, len(seq) - P + 1):
            consider(j - L, j)
    else:
        for j in range(0, len(seq) - P - L + 1):
            consider(j + P, j)
    return hits


def search(
    spacer: str,
    profile: CasProfile,
    records: list[Record],
    max_mm: int = 4,
) -> OffTargetResult:
    proximal_high = profile.pam_side == "3prime"
    result = OffTargetResult()

    for rec in records:
        if result.scanned_bp + len(rec.seq) > MAX_TOTAL_BP:
            result.truncated = True
            break
        result.scanned_bp += len(rec.seq)
        rc = reverse_complement(rec.seq)
        result.hits.extend(
            _scan_strand(rec.seq, rec.name, "+", len(rec.seq), spacer, profile, max_mm, proximal_high)
        )
        result.hits.extend(
            _scan_strand(rc, rec.name, "-", len(rec.seq), spacer, profile, max_mm, proximal_high)
        )

    # The intended on-target appears as a perfect (0-mismatch) hit. Exclude one
    # such hit from the aggregate; any *additional* perfect matches are genuine
    # multi-mapping concerns and are kept.
    perfect = [h for h in result.hits if h.mismatches == 0]
    result.on_target_count = len(perfect)
    scored = list(result.hits)
    if perfect:
        scored.remove(perfect[0])

    mit_sum = sum(h.mit_score for h in scored)
    result.mit_specificity = round(100 * 100 / (100 + mit_sum))

    if profile.cfd_applicable:
        cfd_sum = sum((h.cfd_score or 0.0) * 100 for h in scored)
        result.cfd_specificity = round(100 * 100 / (100 + cfd_sum))

    # Report imperfect hits, ranked by concern (CFD if available, else MIT).
    result.hits = sorted(
        [h for h in result.hits if h.mismatches > 0],
        key=lambda h: (h.cfd_score if h.cfd_score is not None else h.mit_score / 100),
        reverse=True,
    )
    return result

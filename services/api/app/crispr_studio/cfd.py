"""Cutting Frequency Determination (CFD) off-target scoring.

Faithful implementation of the Doench, Fusi et al. (Nat. Biotechnol. 2016)
CFD score. The mismatch- and PAM-penalty tables in ``cfd_params.json`` are the
authentic published matrices (240 mismatch entries x 16 PAM dinucleotides),
loaded verbatim; the algorithm mirrors the reference
``cfd-score-calculator.py``.

CFD is defined for 20-nt SpCas9 (NGG) spacers only. Callers must not invoke it
for other spacer lengths or PAM chemistries.
"""

import json
from functools import lru_cache
from pathlib import Path

_PARAMS_PATH = Path(__file__).parent / "cfd_params.json"

# DNA complement used to build the mismatch-table key. The off-target base is
# expressed on the opposite strand (matching the reference calculator's revcom
# of a single nucleotide), with U normalised back to A.
_COMPLEMENT = {"A": "T", "C": "G", "G": "C", "U": "A", "T": "A"}


@lru_cache(maxsize=1)
def _tables() -> tuple[dict[str, float], dict[str, float]]:
    data = json.loads(_PARAMS_PATH.read_text())
    return data["mismatch"], data["pam"]


def cfd_score(on_target: str, off_target: str, pam: str) -> float:
    """CFD score in [0, 1] for a 20-nt off-target against the 20-nt on-target.

    ``pam`` is the full observed PAM (e.g. ``"AGG"``); only the final two bases
    contribute, per the published model. Higher means the off-target is more
    likely to be cut (more concerning).
    """
    if len(on_target) != 20 or len(off_target) != 20:
        raise ValueError("CFD is defined for 20-nt spacers only")
    mm_scores, pam_scores = _tables()
    wt = on_target.replace("T", "U")
    sg = off_target.replace("T", "U")

    score = 1.0
    for i, (w, s) in enumerate(zip(wt, sg)):
        if w == s:
            continue
        key = f"r{w}:d{_COMPLEMENT[s]},{i + 1}"
        score *= mm_scores[key]

    pam2 = pam[-2:]
    score *= pam_scores.get(pam2, 0.0)
    return score

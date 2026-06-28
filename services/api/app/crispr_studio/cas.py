"""Server-side Cas profiles for off-target search.

A pared-down mirror of the client's enzyme definitions — only the fields the
off-target scan needs (PAM consensus/side, spacer length, and whether CFD
scoring applies).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CasProfile:
    id: str
    name: str
    pam: str  # IUPAC, 5'->3' on the protospacer strand
    pam_side: str  # "3prime" | "5prime"
    spacer_length: int
    cfd_applicable: bool  # CFD is validated only for 20-nt SpCas9 (NGG)


_PROFILES = {
    p.id: p
    for p in [
        CasProfile("spcas9", "SpCas9 (NGG)", "NGG", "3prime", 20, True),
        CasProfile("spcas9-ng", "SpCas9-NG (NG)", "NG", "3prime", 20, False),
        CasProfile("sacas9", "SaCas9 (NNGRRT)", "NNGRRT", "3prime", 21, False),
        CasProfile("ascas12a", "AsCas12a (TTTV)", "TTTV", "5prime", 23, False),
        CasProfile("be4-cbe", "Cytosine base editor (NGG)", "NGG", "3prime", 20, True),
        CasProfile("abe8-abe", "Adenine base editor (NGG)", "NGG", "3prime", 20, True),
    ]
}


def get_profile(cas_id: str) -> CasProfile:
    try:
        return _PROFILES[cas_id]
    except KeyError:
        raise ValueError(f"Unknown Cas profile: {cas_id}")

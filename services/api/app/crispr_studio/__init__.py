"""Vendored CRISPR guide-design + off-target engine.

Adapted from CRISPR Studio (~/genes, app "crispr-studio", same author): the
off-target search (Cas-OFFinder strategy) with authentic MIT/Hsu (2013) and
Doench/Fusi (2016) CFD scoring. Only the guide-design + off-target parts are
reused here — the edit-outcome/MMEJ prediction is not relevant to dCas9
(CRISPRi/CRISPRa) sensing, so it is intentionally omitted.
"""

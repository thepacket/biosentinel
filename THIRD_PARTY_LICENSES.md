# Third-party licenses & attributions

Biosentinel's source code is MIT-licensed (see `LICENSE`). It depends on, and
builds upon, the following third-party software and published methods, each
under its own terms.

## Runtime dependencies

| Component | License |
|-----------|---------|
| Next.js, React, React-DOM | MIT |
| FastAPI | MIT |
| Starlette | BSD-3-Clause |
| Uvicorn | BSD-3-Clause |
| Pydantic | MIT |
| jsonschema | MIT |

Each dependency retains its own license; they are not relicensed here.

## Scientific methods & data

The guide-design and detection tooling implements published methods and uses
published parameter data. These are reused as scientific facts/algorithms, with
attribution:

- **CFD off-target score** — Doench, Fusi et al., *Nature Biotechnology* (2016).
  The mismatch and PAM penalty matrices in `crispr_studio/cfd_params.json` are
  the published CFD parameters.
- **MIT/Hsu specificity score** — Hsu et al., *Nature Biotechnology* (2013).
- **Exhaustive PAM-flanked off-target search** — the Cas-OFFinder strategy
  (Bae, Park, Kim 2014), reimplemented in portable Python.
- **Detection platforms** — DETECTR (Cas12a) and SHERLOCK (Cas13a/d) per the
  primary literature.

## Curated data

The biosensor designs, chassis catalog, and parts registry under `data/` are
licensed CC BY 4.0 (see `data/LICENSE`). The underlying biological sequences and
genetic parts originate from the primary sources cited in each record's
`provenance` field (peer-reviewed literature, the iGEM Registry of Standard
Biological Parts, Addgene, SEVA, NCBI) and remain subject to those sources.

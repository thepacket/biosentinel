# Biosentinel — whole-cell CRISPR biosensor studio

A web app for designing **living biosensors**: engineering **safe (BSL-1 / GRAS)
bacteria** with **CRISPR-based sensing circuits** (dCas9 / CRISPRi / CRISPRa) that
detect an analyte — environmental contaminants, pathogen signals, clinical/gut
biomarkers, chemicals — and produce a readable output. Every design pairs a host
from the **safe-chassis catalog** with a sensing module, genetic parts, reporter,
and safety profile, and can be cloned and adapted.

> Safety-first: the chassis catalog is hard-restricted to **non-pathogenic BSL-1**
> organisms (the schema enforces `biosafetyLevel == 1`). Designs marked *template*
> combine individually-validated parts into a CRISPR circuit pattern.

See [`docs/comparative-analysis.md`](docs/comparative-analysis.md) for where this
sits vs. other tools. [`docs/competitive-analysis.md`](docs/competitive-analysis.md)
covers the in-vitro CRISPR-Dx landscape (the `/diagnostics` + legacy side).

## Status

The app spans whole-cell biosensing **and** in-vitro diagnostics. Current
contents: **62 designs · 9 chassis · 21 parts · 4 legacy assays**.

**Data & model**
- Schemas — [`chassis.schema.json`](packages/schema/chassis.schema.json) (BSL-1 enforced), [`biosensor.schema.json`](packages/schema/biosensor.schema.json), [`part.schema.json`](packages/schema/part.schema.json), legacy `assay.schema.json`
- Safe-chassis catalog (9) — E. coli K-12, B. subtilis 168, E. coli Nissle 1917, L. lactis, P. putida KT2440, S. cerevisiae (yeast), Synechocystis (cyanobacteria), L. plantarum, C. glutamicum
- 62 whole-cell CRISPR biosensor designs across environmental / pathogen / clinical-gut / chemical, and six circuit topologies (single, AND, OR, band-pass, memory, ratiometric)
- 21-part genetic registry — reporters, promoters, dCas9/Cas variants, sgRNA scaffold, riboswitches, RBS, terminator

**App (pages)**
- `/` **Designs** — library with safety badges + analyte / strategy / design-type / chassis filters (sticky navigator)
- `/biosensors/[slug]` — design detail: pipeline, genetic-circuit diagram, SBOL parts track, sensing, parts, output, safety, build steps; clone-to-edit + "Open in designer"
- `/chassis` — safe-chassis catalog + per-chassis detail
- `/parts` — genetic-parts registry + detail (links to the designs that use each part)
- `/design` — guided **Designer**: recombine a real sensing module + chassis + CRISPR strategy + reporter into a schema-valid draft
- `/guides` — **Guide RNA designer**: ranked spacers + on-target heuristic; off-target scoring (MIT/CFD) against a pasted reference or an auto-fetched host genome; guided/advanced modes; sequence highlight overlays
- `/diagnostics` — **in-vitro CRISPR-Dx designer**: DETECTR/SHERLOCK detection crRNAs, RPA pre-amplification primers, SNP discrimination, cross-reactivity; legacy assays load as examples

**Backend** — FastAPI: chassis / biosensor / parts / legacy endpoints (schema-validated, BSL-1 + referential-integrity guardrails) plus `guides/design`, `guides/offtarget`, `guides/host-offtarget`. Serves the static frontend on the same port.

**Throughout** — per-base DNA/RNA colouring, click-to-enlarge diagrams, themed dark UI.

## Repo layout

```
packages/schema/    chassis + biosensor + part schemas (+ legacy assay schema)
data/chassis/       safe BSL-1/GRAS chassis catalog (JSON)
data/biosensors/    whole-cell CRISPR biosensor designs (JSON)
data/parts/         genetic-parts registry, incl. reporters (JSON)
data/legacy-assays/ in-vitro CRISPR-Dx assays (examples for /diagnostics)
services/api/       FastAPI — endpoints + schema validation + guide/off-target engine
apps/web/           Next.js (App Router, TS, static export) — all pages + components
docs/               competitive & comparative analyses
LICENSE · THIRD_PARTY_LICENSES.md · data/LICENSE
```

## Run it (development)

**1. Backend (FastAPI, port 8000)**

```bash
cd services/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# health check: curl http://127.0.0.1:8000/api/health
```

**2. Frontend (Next.js, port 3000)**

```bash
cd apps/web
npm install
# point the clone action at the dev API (it's same-origin in production):
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000 npm run dev
# open http://localhost:3000
```

In development the pages read the catalog straight from `data/chassis/` and
`data/biosensors/` on the filesystem; only the clone action calls the API.

## Production build & deploy (Fly.io)

Production is a **single image, single port**: a multi-stage Docker build
compiles the Next.js **static export** and FastAPI serves both the SPA (`/`) and
the API (`/api/*`) on port 8000. Scales to zero.

```bash
# build + run the production image locally
docker build -t biosentinel .
docker run -p 8080:8000 biosentinel
# open http://localhost:8080   (health: /api/health)

# deploy to Fly
fly launch --copy-config --no-deploy   # first time only (creates the app)
fly deploy
```

- [`Dockerfile`](Dockerfile) — stage 1 builds `apps/web/out`; stage 2 is the
  FastAPI runtime that serves it. In-container paths are set via
  `BIOSENSORS_CHASSIS_DIR`, `BIOSENSORS_DESIGN_DIR`, `BIOSENSORS_LEGACY_DIR`,
  `BIOSENSORS_SCHEMA_DIR`, `BIOSENSORS_STATIC_DIR`.
- [`fly.toml`](fly.toml) — `internal_port = 8000`, `/api/health` check,
  `auto_stop_machines`, `min_machines_running = 0` (scale-to-zero).

> The catalog is baked into the image at build time, so adding/editing a design
> requires a rebuild + redeploy.

## Validate the catalog against the schemas

```bash
python3 scripts/validate.py
# checks chassis (BSL-1 enforced), biosensors (chassisSlug resolves), and legacy assays
```

## Adding a chassis or biosensor

- **Chassis:** copy a file in `data/chassis/`. It must be a non-pathogenic
  **BSL-1** organism (`biosafetyLevel: 1` — the schema rejects anything else);
  cite the BSL-1 / GRAS basis in `safety.bslSource` / `safety.grasBasis`.
- **Biosensor:** copy a file in `data/biosensors/`. Set `chassisSlug` to an
  existing safe chassis, describe the CRISPR `sensing` strategy + `signalFlow`,
  list `parts` (include real sequences only when sourced), and cite part sources.
  Mark `status: "template"` unless the integrated device is itself validated.

Run the validator after any change. Never fabricate biological sequences.

> Research / educational use only. Engineer responsibly and follow your
> institution's biosafety rules before any lab or field work.

## License

- **Code** — MIT License (see [`LICENSE`](LICENSE)).
- **Curated data** (`data/` — designs, chassis catalog, parts registry) —
  Creative Commons Attribution 4.0 (CC BY 4.0); see [`data/LICENSE`](data/LICENSE).
- Third-party dependencies and the published methods this builds on are listed
  in [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).

Copyright (c) 2026 Andre Paquette.

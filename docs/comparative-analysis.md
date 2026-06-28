# Comparative Analysis — Biosentinel vs. the field

_Last updated: 2026-06-28_

Biosentinel pivoted from in-vitro CRISPR-Dx (see [`competitive-analysis.md`](competitive-analysis.md),
now covering the *legacy* assay library) to a **whole-cell CRISPR biosensor design studio**.
This document compares it against the tools designers actually reach for in that space.

## 1. The category, and who's in it

There is **no direct competitor** that is a curated, browsable, cloneable library of
**whole-cell CRISPR biosensors** with safety-first chassis selection. Instead, designers
today assemble a workflow from tools across five adjacent categories:

| Category | Representative tools | What they do |
|----------|---------------------|--------------|
| **Genetic-circuit CAD / automation** | **Cello / Cello 2.0** (Voigt lab), **iBioSim** | Compile logic (Verilog) → DNA circuits; model-based design + simulation; SBOL/SBML |
| **Parts registries / repositories** | **iGEM Registry** (BioBricks), **SynBioHub** (SBOL), **Addgene**, **SEVA**, **JBEI-ICE** | Store and share genetic parts/plasmids |
| **Biophysical part design** | **De Novo DNA / Salis Lab** (RBS Calculator, Promoter Calculator, Operon Calculator) | Predict/optimize expression strength of individual parts |
| **Molecular-biology / cloning platforms** | **Benchling**, **SnapGene**, **Geneious** | Sequence design, cloning, ELN; general-purpose |
| **CRISPR guide design** | **CHOPCHOP**, **CRISPOR**, **Benchling** | sgRNA design + off-target scoring (editing-centric) |

The scientific literature has rich *design principles* for whole-cell biosensors (sensing-module
+ reporter, TF-based, logic gates, detect/record/respond), but those live in **review papers — not
in a product**. That gap is exactly where Biosentinel sits.

## 2. Feature comparison

| Capability | Biosentinel | Cello / iBioSim | iGEM Reg. / SynBioHub | De Novo DNA | Benchling / SnapGene |
|---|---|---|---|---|---|
| Curated **whole-cell biosensor library** (cloneable designs) | ✅ 62 designs | ❌ | ⚠️ raw parts only | ❌ | ❌ |
| **CRISPR-based sensing** focus (CRISPRi/CRISPRa) | ✅ | ⚠️ generic gates | ❌ | ❌ | ⚠️ editing only |
| **Safe-chassis catalog** (BSL-1/GRAS enforced) | ✅ 9 hosts | ❌ | ❌ | ❌ | ❌ |
| **Safety-first framing** (biocontainment, GRAS) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Guided **designer** (recombine real modules) | ✅ | ⚠️ Verilog/expert | ❌ | ⚠️ part-level | ⚠️ manual |
| **Visual circuit diagram** + **SBOL parts track** | ✅ | ✅ (Cello SBOL) | ✅ (SBOL) | ❌ | ⚠️ maps/sequence |
| **Logic topologies** (AND/OR/band-pass/memory/ratiometric) | ✅ as designs | ✅ as synthesis | ❌ | ❌ | ❌ |
| Reusable **parts registry** (incl. reporters) feeding the designer | ✅ 21 parts | ⚠️ via SynBioHub | ✅ huge | ✅ | ⚠️ |
| Beginner-friendly (hobbyist + pro) | ✅ | ❌ expert | ⚠️ | ⚠️ | ⚠️ |
| **Biophysical part tuning** (RBS/promoter strength) | ❌ | ⚠️ | ❌ | ✅ best-in-class | ❌ |
| **Formal logic synthesis + ODE simulation** | ❌ | ✅ best-in-class | ❌ | ❌ | ❌ |
| **SBOL data exchange** (not just visual) | ❌ (visual only) | ✅ | ✅ | ⚠️ | ⚠️ |
| Cloning / assembly / ELN output | ❌ | ❌ | ❌ | ⚠️ | ✅ best-in-class |
| Experimentally **validated** devices | ⚠️ templates (cited parts) | ⚠️ predicted | ⚠️ mixed | ⚠️ predicted | n/a |

✅ strong · ⚠️ partial / indirect · ❌ absent

## 3. Where Biosentinel wins

1. **It's the only domain-specific whole-cell *biosensor* product.** Cello designs generic logic
   circuits; registries store parts; Benchling clones DNA. None hand you 62 cloneable,
   cited biosensor designs spanning environmental / pathogen / clinical-gut / chemical targets.
2. **Safety is a first-class, enforced feature.** The chassis catalog is hard-limited to BSL-1,
   GRAS/probiotic status is surfaced, and biocontainment is part of every design. No competitor
   frames the work this way — important for hobbyists, iGEM teams, and field deployment.
3. **Curation + accessibility.** A guided designer that recombines *real, cited* modules with
   safe chassis and reporters — usable by a hobbyist, grounded enough for a pro. Cello/iBioSim
   assume Verilog and modeling expertise; registries assume you already know what to build.
4. **Breadth of hosts and topologies in one place** — 9 chassis (incl. eukaryotic yeast and
   self-powered cyanobacteria) × 6 circuit topologies, all browsable and filterable.

## 4. Where competitors are ahead (our roadmap)

- **Biophysical part tuning** — De Novo DNA's RBS/Promoter Calculators predict expression
  strength. Biosentinel has no quantitative part model. *→ integrate or link out.*
- **Formal logic synthesis + simulation** — Cello (Verilog→DNA) and iBioSim (ODE/SBML
  simulation) verify behavior before building. Biosentinel describes logic but doesn't simulate.
  *→ add a simple circuit simulator / Cello bridge.*
- **SBOL *data* interoperability** — we render SBOL *visual* glyphs but don't import/export the
  SBOL data model or sync with SynBioHub. *→ add SBOL2/3 export.*
- **Cloning / assembly output** — Benchling/SnapGene produce ready-to-order constructs and ELN
  records. Biosentinel stops at the design. *→ generate assembly-ready sequences + ordering sheets.*
- **sgRNA design engine** — CHOPCHOP/CRISPOR do spacer design + off-target scoring; our designs
  say "design the sgRNA." *→ embed a guide-design step.*
- **Validation** — our designs are *templates* (real cited parts, integrated pattern), not
  experimentally validated devices; Cello gate libraries are characterized. *→ add validated
  devices and measured performance where available.*

## 5. One-line positioning

> **Cello compiles logic, De Novo DNA tunes parts, registries store them, Benchling clones them —
> Biosentinel is the only place that hands you a safe, cited, end-to-end whole-cell CRISPR
> *biosensor* you can clone, remix, and build.**

## Sources

- Cello 2.0 — https://dspace.mit.edu/bitstream/handle/1721.1/148592/Cello%202.0%20Manuscript.pdf
- iBioSim 3 — https://par.nsf.gov/servlets/purl/10065225
- SBOL 2.0 — https://jakebeal.github.io/Publications/ACSSynBio16-SBOL2-preprint.pdf
- SynBioHub — referenced in Cello 2.0 / SBOL ecosystem
- iGEM Registry of Standard Biological Parts — https://registry.igem.org/
- De Novo DNA (RBS/Promoter Calculators, Salis Lab) — https://www.denovodna.com/ , https://salislab.net/software/
- Whole-cell biosensor design principles (review) — https://www.sciencedirect.com/science/article/abs/pii/S073497502200115X
- Engineered live bacteria for disease detection (review) — https://pmc.ncbi.nlm.nih.gov/articles/PMC10598922/
- Benchling × iGEM — https://www.benchling.com/blog/powering-innovative-synthetic-biology-projects-with-igem

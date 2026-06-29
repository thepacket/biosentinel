# CRISPR Biosensor Design — Competitive Analysis (in-vitro CRISPR-Dx)

_Last updated: 2026-06-28_

> **Scope note.** This is the original analysis of the **in-vitro nucleic-acid
> detection (CRISPR-Dx)** landscape — SHERLOCK/DETECTR-style assays. Biosentinel
> has since become primarily a **whole-cell** biosensor studio (see
> [`comparative-analysis.md`](comparative-analysis.md)); this in-vitro work now
> lives on the `/diagnostics` page and in `data/legacy-assays/`. The analysis
> below remains accurate for that diagnostics side.

## 1. Scope & framing

A "CRISPR biosensor" (a.k.a. CRISPR diagnostic / CRISPR-Dx) is a nucleic-acid
detection assay that pairs:

1. **Sample prep / extraction** (out of software scope, mostly)
2. **Pre-amplification** — usually isothermal: **RPA**, **LAMP/RT-LAMP**, **RAA**,
   or NASBA (so it runs without a thermocycler)
3. **CRISPR recognition + collateral cleavage** — a Cas enzyme + guide RNA (crRNA):
   - **Cas12a** → targets dsDNA, trans-cleaves ssDNA reporter (DETECTR family)
   - **Cas13a/d** → targets ssRNA, trans-cleaves ssRNA reporter (SHERLOCK family)
   - **Cas14/Cas12f**, **Csm6** (signal amplifier), etc.
4. **Readout** — fluorescent reporter, lateral-flow strip, electrochemical, etc.

A *complete* design tool must therefore span **target selection → amplification
primer design → crRNA/guide design → reporter & readout selection → in-silico
validation (specificity, off-target, secondary structure)**. No single existing
tool covers this whole chain well — that is the core market gap.

## 2. Landscape by category

### A. CRISPR-Dx–specific design tools (closest competitors)

| Tool | Owner | Cas | Amplification | DL model | Hosted | Gap |
|------|-------|-----|---------------|----------|--------|-----|
| **ADAPT** | Sabeti Lab, Broad/MIT | Cas13a | No (assumes amplification) | CNN activity predictor | CLI + AWS web | Research-grade, Cas13a-only, no amplicon primer design, steep learning curve |
| **EasyDesign** | Zhejiang Lab | Cas12a (LbCas12a) | **RPA primers integrated** | CNN12ae (Spearman 0.81) | crispr.zhejianglab.com | TTTN PAM only, single Cas variant, no Cas13, no library/sharing |
| **cas13design** | Sanjana Lab (NYGC/NYU) | Cas13d | No | Random-forest score | cas13design.nygenome.org | Built for **knockdown/screens**, not diagnostics; no reporter/amplification layer |
| **CaSilico** | Academic (Frontiers 2022) | Cas12/13/14 | No | Thermodynamic + conservation | Package | Broad Cas coverage but no amplification, no readout design, limited UX |

**Takeaway:** the specialized tools are fragmented by Cas type, are
research-/publication-driven, and only **EasyDesign** integrates amplification —
and only for Cas12a + RPA + TTTN PAM.

### B. General gRNA design tools (adjacent — built for genome editing)

| Tool | Cas support | Strength | Why it falls short for biosensors |
|------|-------------|----------|-----------------------------------|
| **CHOPCHOP v3** | Cas9, Cas12a/Cpf1, Cas13, CasX | 200+ genomes, RNA accessibility (RNAfold), great UX | Editing-centric; no amplification, no reporter/assay design |
| **CRISPOR** | Cas9, Cpf1 | Best-in-class off-target scoring | Fixed organism list; no Cas13; editing-only |
| **Benchling** | Cas9 (+ general) | Polished SaaS, LIMS/ELN integration, collaboration | Editing & cloning focus; not a diagnostics workflow |
| **Synthego / IDT / GenScript design tools** | Cas9-centric | Free, vendor-backed | Lead-gen for reagent sales; not assay-complete |

These dominate mindshare and UX expectations but solve a **different problem
(in-cell editing)**. Users currently bolt them together by hand.

### C. Amplification primer design (the missing middle)

| Tool | Method | Notes |
|------|--------|-------|
| **PrimedRPA** | RPA | One of the few automated RPA primer-probe designers; CLI |
| **NEB LAMP Primer Design / PrimerExplorer** | LAMP | Standard for LAMP's 6–8 primer sets; complex, separate site |
| **Primer3 / NCBI Primer-BLAST** | PCR/general | Not isothermal-aware |

> Literature consensus: **there is no good, integrated automated software for RPA
> primer-probe design** — RPA primers are still largely hand-designed against
> vendor (TwistDx) rules of thumb. This is a concrete, defensible feature gap.

### D. Commercial diagnostic platforms (not design tools, but set expectations)

- **Sherlock Biosciences** (Cas13/SHERLOCK, Zhang lab spinout)
- **Mammoth Biosciences** (Cas12/Cas14/DETECTR, Doudna lab spinout)

These are closed product companies, not design software. They validate the
market but leave hobbyists and external researchers with **no first-party design
tooling**.

## 3. Synthesis — where the gaps are

1. **No end-to-end workflow.** Every existing tool covers one slice. Users
   manually chain CHOPCHOP/cas13design → PrimedRPA/PrimerExplorer → manual
   reporter choice → manual specificity checks across NCBI BLAST.
2. **Cas fragmentation.** Tools are siloed by enzyme (Cas9 vs 12 vs 13). No tool
   lets you compare "which chemistry fits my target?" in one place.
3. **Amplification is the weak link.** RPA design especially is unsupported by
   good automated software.
4. **No examples library.** None ship a curated, reproducible library of
   validated assays (SARS-CoV-2, HPV, dengue, malaria, etc.) you can clone & adapt.
5. **Hobbyist accessibility is near-zero.** Everything is either a publication
   artifact (CLI, AWS) or a B2B SaaS. No "designed for a biohacker / iGEM team / DIY
   bio lab" experience with guardrails, explanations, and guided steps.
6. **Weak collaboration & provenance.** Outside Benchling, no sharing, versioning,
   or "show your design rationale" for reproducibility.

## 4. Opportunity / positioning for our app

> **An end-to-end, multi-Cas CRISPR biosensor design studio** that takes a user
> from target sequence → finished, in-silico-validated assay (amplification +
> crRNA + reporter + readout), with a **library of cloneable validated examples**,
> built for **both hobbyists (guided, explained) and pros (batch, scriptable, API)**.

Differentiators to own:
- **Full pipeline in one workflow** (the integration nobody offers).
- **Multi-Cas, multi-amplification** (Cas12a/13a/13d × RPA/LAMP/RAA) with a
  "recommend the chemistry for my target" advisor.
- **Best-in-class RPA + LAMP primer design** (underserved).
- **Specificity & cross-reactivity engine** (BLAST/off-target across pathogen DBs).
- **Curated example library** — reproducible, citable, clone-to-edit.
- **Two modes:** Guided (hobbyist, with teaching) and Pro (batch/API/ELN export).

## 5. Required pipeline steps the app must implement

1. Target intake & alignment (conservation across strains; variant awareness)
2. Chemistry advisor (DNA→Cas12; RNA→Cas13; PAM/PFS constraints)
3. Pre-amplification primer design (RPA, RT-LAMP, RAA) + amplicon QC
4. crRNA/guide design + activity scoring (DL where available) + secondary structure
5. Off-target / cross-reactivity specificity check
6. Reporter & readout selection (fluorescent, lateral flow, Csm6 amplification)
7. In-silico assay simulation / scoring & ranking
8. Export: ordering sheets (IDT/Twist), protocol, ELN/SBOL, shareable link
9. Examples library: clone, diff, adapt

## 6. Sources

- ADAPT — https://www.biorxiv.org/content/10.1101/2020.11.28.401877v1.full
- EasyDesign (Cas12a + RPA, DL) — https://pmc.ncbi.nlm.nih.gov/articles/PMC11316927/ , https://crispr.zhejianglab.com/
- cas13design — https://www.nature.com/articles/s41587-020-0456-9 , http://cas13design.nygenome.org
- CaSilico — https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2022.957131/full
- CHOPCHOP v3 — https://academic.oup.com/nar/article/47/W1/W171/5491735
- Synthego CRISPR design tools — https://www.synthego.com/crispr-design-tools/
- PrimedRPA — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6379019/
- SHERLOCK / DETECTR overview — https://blog.addgene.org/finding-nucleic-acids-with-sherlock-and-detectr
- Multiplexed Cas13/Cas12a/Csm6 platform — https://www.science.org/doi/10.1126/science.aaq0179
- RPA-CRISPR assay build guide — https://www.synthego.com/rpa-crispr-diagnostic-assay/
- awesome-CRISPR tool list — https://github.com/davidliwei/awesome-CRISPR

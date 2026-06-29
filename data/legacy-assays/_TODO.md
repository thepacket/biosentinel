# Seed library — backlog

Planned example assays to add (with verified sequences from primary sources — do **not** fabricate sequences).

## In the library

| Assay | Cas | Amplification | Source |
|-------|-----|---------------|--------|
| SHERLOCK SARS-CoV-2 (S gene, Orf1ab) | Cas13a (LwaCas13a) | RT-RPA | Zhang Lab open-access protocol |
| CRISPR-Cas12a SARS-CoV-2 (ORF1ab, N gene) | Cas12a (LbCas12a) | RT-RPA | Xiong et al., PLOS Biology 2020 (CC BY 4.0), DOI 10.1371/journal.pbio.3000978 — sequences from S1 Table |

## Backlog

| Assay | Platform | Cas | Amplification | Status | Source to transcribe |
|-------|----------|-----|---------------|--------|----------------------|
| SARS-CoV-2 DETECTR (E + N gene) | DETECTR | Cas12a (LbCas12a) | RT-LAMP | TODO | Broughton et al., Nat Biotechnol 2020, https://www.nature.com/articles/s41587-020-0513-4 — adds an RT-**LAMP** Cas12a example (current Cas12a seeds use RT-RPA). Sequences are in Supplementary Table 1 (figure/xlsx; transcribe the F3/B3/FIP/BIP/LF/LB sets) |
| HPV 16/18 | DETECTR | Cas12a | RPA | TODO | EasyDesign / primary HPV-DETECTR papers |
| Dengue / Zika | SHERLOCK | Cas13a | RPA | TODO | Myhrvold et al., Science 2018 (field-deployable SHERLOCK) |
| M. tuberculosis | SHERLOCK | Cas13a | RPA | TODO | primary literature |
| Plasmodium (malaria) | — | Cas12a/13a | RPA | TODO | primary literature |

When adding: copy an existing JSON, replace sequences verbatim from the source, set
`provenance.url`, and run the schema check (see repo README).

> Tip: the **in-vitro CRISPR-Dx designer** (`/diagnostics`) can design DETECTR/
> SHERLOCK detection crRNAs and RPA primers from any pasted target — useful for
> drafting these backlog assays before transcribing the published sequences.

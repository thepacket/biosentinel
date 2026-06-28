// Pure, client-safe logic for the designer: presets + draft assembly.
// Produces an object conforming to packages/schema/biosensor.schema.json.
import type { Biosensor, ChassisSummary, SensorModule } from "./types";

// Props for the circuit diagram, derived from any biosensor or draft.
export type CircuitProps = {
  analyte: string;
  category: string;
  regulator?: string;
  sensorPromoter?: string;
  casProtein?: string;
  strategy: string;
  reporterGene?: string;
  outputType: string;
  readout?: string;
};

export function circuitPropsFromBiosensor(b: Biosensor): CircuitProps {
  return {
    analyte: b.input.analyte,
    category: b.input.category,
    regulator: b.parts?.find((p) => p.role === "regulator")?.name,
    sensorPromoter: b.parts?.find((p) => p.role === "promoter")?.name,
    casProtein: b.sensing.casProtein,
    strategy: b.sensing.strategy,
    reporterGene: b.output.reporterGene,
    outputType: b.output.type,
    readout: b.output.readout,
  };
}

export const SGRNA_SCAFFOLD =
  "GTTTTAGAGCTAGAAATAGCAAGTTAAAATAAGGCTAGTCCGTTATCAACTTGAAAAAGTGGCACCGAGTCGGTGC";

export type StrategyPreset = {
  id: string;
  label: string;
  description: string;
  casProtein: string;
  logicType: string;
};

export const STRATEGIES: StrategyPreset[] = [
  {
    id: "CRISPRi-repression",
    label: "CRISPRi (repress)",
    description:
      "dCas9 + sgRNA silence a constitutive reporter. The analyte gates the sgRNA, so the reporter inverts (NOT gate). Add a second inverter for a turn-on readout.",
    casProtein: "dCas9 (S. pyogenes, catalytically dead)",
    logicType: "NOT",
  },
  {
    id: "CRISPRa-activation",
    label: "CRISPRa (activate/amplify)",
    description:
      "dCas9-ω activator boosts a weak reporter promoter. The analyte gates the sgRNA, so the reporter turns ON and is amplified.",
    casProtein: "dCas9-ω (CRISPRa activator)",
    logicType: "amplifier",
  },
];

export type ReporterPreset = {
  id: string;
  label: string;
  type: string;
  reporterGene: string;
  readout: string;
  result: string;
  instrumentFree: boolean;
};

export const REPORTERS: ReporterPreset[] = [
  { id: "sfgfp", label: "Green fluorescence (sfGFP)", type: "fluorescent", reporterGene: "sfGFP", readout: "Green fluorescence (plate reader / fluorimeter)", result: "Fluorescence change reports the analyte.", instrumentFree: false },
  { id: "mcherry", label: "Red fluorescence (mCherry)", type: "fluorescent", reporterGene: "mCherry", readout: "Red fluorescence (plate reader)", result: "Fluorescence change reports the analyte.", instrumentFree: false },
  { id: "amilcp", label: "Visible pigment (amilCP)", type: "pigment", reporterGene: "amilCP", readout: "Visible blue-purple pigment (naked eye / smartphone)", result: "Pigment change reports the analyte.", instrumentFree: true },
  { id: "lux", label: "Bioluminescence (luxCDABE)", type: "luminescent", reporterGene: "luxCDABE", readout: "Bioluminescence (luminometer / camera)", result: "Luminescence reports the analyte.", instrumentFree: true },
  { id: "lacz", label: "Colour (lacZ / X-gal)", type: "colorimetric", reporterGene: "lacZ", readout: "Blue colour on X-gal (naked eye)", result: "Colour change reports the analyte.", instrumentFree: true },
];

// Map a reporter gene (as used in designs) back to a designer reporter preset id.
export const REPORTER_BY_GENE: Record<string, string> = {
  sfGFP: "sfgfp",
  mCherry: "mcherry",
  amilCP: "amilcp",
  luxCDABE: "lux",
  lacZ: "lacz",
};

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "design";
}

export type DesignSelection = {
  name?: string;
  module: SensorModule;
  chassis: ChassisSummary;
  strategyId: string;
  reporterId: string;
};

export function buildDraft(sel: DesignSelection): Biosensor {
  const strat = STRATEGIES.find((s) => s.id === sel.strategyId) ?? STRATEGIES[0];
  const rep = REPORTERS.find((r) => r.id === sel.reporterId) ?? REPORTERS[0];
  const m = sel.module;
  const isCRISPRa = strat.id === "CRISPRa-activation";
  const reg = m.regulator ?? `${m.analyte} sensor`;
  const prom = m.promoter ?? "analyte-responsive promoter";
  const dcas9Name = isCRISPRa ? "dCas9-ω activator" : "dCas9";
  const today = new Date().toISOString().slice(0, 10);
  const name = (sel.name && sel.name.trim()) || `${m.analyte} sensor (${reg} + ${strat.label})`;
  const slug = `${kebab(name)}-draft`;

  const signalFlow = isCRISPRa
    ? `${m.analyte} -> ${reg} activates ${prom} -> transcribes an sgRNA -> ${dcas9Name} amplifies the ${rep.reporterGene} reporter (CRISPRa) -> ${rep.readout.toLowerCase()} rises with ${m.analyte}.`
    : `${m.analyte} -> ${reg} switches ${prom} -> transcribes an sgRNA -> dCas9 + sgRNA repress the constitutive ${rep.reporterGene} reporter (CRISPRi) -> readout inverts with ${m.analyte} (NOT gate); add an inverter for turn-on.`;

  return {
    id: slug,
    name,
    slug,
    shortDescription: `Designer draft: detects ${m.analyte} using the ${reg} sensing module wired to a ${strat.label} circuit in ${sel.chassis.name}, with a ${rep.label.toLowerCase()} readout.`,
    status: "experimental",
    tags: [m.analyte, m.category, strat.id, "designer-draft"],
    chassisSlug: sel.chassis.slug,
    input: {
      analyte: m.analyte,
      category: m.category,
      detects: m.detects,
      operatingRange: m.operatingRange,
    },
    sensing: {
      strategy: strat.id,
      casProtein: strat.casProtein,
      sensorMechanism: m.sensorMechanism,
      signalFlow,
      logicType: strat.logicType,
    },
    parts: [
      { name: reg, role: "regulator", source: m.source, notes: `Sensing module for ${m.analyte}.` },
      { name: prom, role: "promoter", source: m.source, notes: "Analyte-responsive promoter." },
      { name: "Designed sgRNA", role: "sgRNA", source: "design the spacer against the reporter promoter; check host off-targets" },
      { name: "sgRNA scaffold (SpCas9)", role: "sgRNA", sequence: SGRNA_SCAFFOLD, source: "Standard SpCas9 scaffold" },
      { name: dcas9Name, role: "dCas9", source: isCRISPRa ? "Bikard et al. 2013 (CRISPRa)" : "Qi et al. 2013 (CRISPRi)" },
      { name: rep.reporterGene, role: "reporter", source: "standard reporter" },
    ],
    output: {
      type: rep.type,
      reporterGene: rep.reporterGene,
      readout: rep.readout,
      result: rep.result,
    },
    performance: {
      validated: false,
      notes: `Designer draft combining a real sensing module (${m.source}) with a ${strat.label} circuit. Not experimentally validated — verify part compatibility in ${sel.chassis.name} and design/validate the sgRNA before building.`,
    },
    safety: {
      biosafetyLevel: 1,
      grasChassis: sel.chassis.gras,
      biocontainment: "Lab / contained use; add a kill-switch or auxotrophy before any field or in-vivo use.",
      fieldDeployable: false,
      notes: `${sel.chassis.name} is a non-pathogenic BSL-1 host${sel.chassis.gras ? " (GRAS)" : ""}.`,
    },
    buildSteps: [
      { order: 1, stage: "design", title: "Design the sgRNA", description: `Pick a 20-nt spacer targeting the ${rep.reporterGene} reporter promoter; check off-targets against ${sel.chassis.name}.` },
      { order: 2, stage: "assembly", title: "Assemble the transcription units", description: `TU1: ${prom} -> sgRNA (${reg}). TU2: ${dcas9Name}${isCRISPRa ? " + weak promoter -> reporter" : " + constitutive " + rep.reporterGene}.` },
      { order: 3, stage: "transformation", title: `Transform ${sel.chassis.name}`, description: "Transform, select, and confirm low background without the analyte." },
      { order: 4, stage: "induction", title: "Expose to the analyte", description: `Incubate with the sample plus a ${m.analyte} standard curve.` },
      { order: 5, stage: "readout", title: "Read the result", description: rep.readout },
    ],
    provenance: {
      source: "Generated with the Biosentinel designer",
      partsSources: [m.source, `Sensing module adapted from design '${m.fromSlug}'`],
      license: "Design draft CC BY 4.0; parts per their original sources",
      addedBy: "designer",
      dateAdded: today,
      notes: "Draft — review biology and validate before laboratory use.",
    },
  };
}

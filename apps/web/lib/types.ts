// Mirrors packages/schema/*.schema.json (the source of truth lives there).

export type TargetCategory = "environmental" | "pathogen" | "clinical-gut" | "chemical";

export type Chassis = {
  id: string;
  name: string;
  slug: string;
  species: string;
  strain: string;
  taxId?: number;
  shortDescription?: string;
  biosafetyLevel: 1;
  safety: {
    pathogenic: boolean;
    gras?: boolean;
    grasBasis?: string;
    probiotic?: boolean;
    humanUse?: string;
    biocontainment?: string;
    bslSource: string;
    notes?: string;
  };
  traits?: {
    gram?: "negative" | "positive";
    oxygen?: string;
    optimalTempC?: number;
    sporeForming?: boolean;
    doublingTimeMin?: number;
    transformable?: boolean;
    secretes?: boolean;
  };
  engineering?: {
    genomeAccession?: string;
    commonPromoters?: string[];
    selectionMarkers?: string[];
    crisprTools?: string;
    toolkits?: string[];
  };
  typicalEnvironments?: string[];
  bestFor?: TargetCategory[];
  provenance: { source: string; url?: string; dateAdded?: string; notes?: string };
};

export type ChassisSummary = {
  slug: string;
  name: string;
  species: string;
  strain: string;
  shortDescription: string;
  biosafetyLevel: 1;
  gras: boolean;
  probiotic: boolean;
  bestFor: TargetCategory[];
  environments: string[];
};

export type Part = {
  name: string;
  role: string;
  partId?: string;
  sequence?: string;
  source?: string;
  notes?: string;
};

export type BuildStep = {
  order: number;
  stage: "design" | "assembly" | "transformation" | "induction" | "readout";
  title: string;
  description?: string;
};

export type Biosensor = {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  status: string;
  tags?: string[];
  chassisSlug: string;
  input: { analyte: string; category: TargetCategory; detects?: string; operatingRange?: string };
  sensing: {
    strategy: string;
    casProtein?: string;
    sensorMechanism?: string;
    signalFlow: string;
    logicType?: string;
  };
  parts?: Part[];
  output: { type: string; reporterGene?: string; readout: string; result?: string };
  performance?: {
    limitOfDetection?: string;
    dynamicRange?: string;
    responseTimeMin?: number;
    validated?: boolean;
    notes?: string;
  };
  safety: {
    biosafetyLevel: 1;
    grasChassis: boolean;
    biocontainment?: string;
    fieldDeployable?: boolean;
    notes?: string;
  };
  buildSteps?: BuildStep[];
  provenance: {
    source: string;
    authors?: string;
    year?: number;
    doi?: string;
    url?: string;
    partsSources?: string[];
    license?: string;
    addedBy?: string;
    dateAdded?: string;
    notes?: string;
  };
  // resolved on the detail page
  chassis?: Chassis | null;
};

export type BiosensorSummary = {
  slug: string;
  name: string;
  shortDescription: string;
  status: string;
  tags: string[];
  analyte: string;
  category: TargetCategory;
  strategy: string;
  output: string;
  reporterGene?: string;
  chassisSlug: string;
  chassisName: string;
  biosafetyLevel: 1;
  grasChassis: boolean;
};

// A catalog part (distinct from `Part` above, which is a part *within* a design).
export type CatalogPart = {
  id: string;
  name: string;
  slug: string;
  category: string;
  shortDescription?: string;
  sequence?: string;
  partId?: string;
  hosts?: string[];
  tags?: string[];
  label?: string;
  outputType?: string;
  readout?: string;
  instrumentFree?: boolean;
  strength?: string;
  inducer?: string;
  action?: string;
  pamOrPfs?: string;
  ligand?: string;
  provenance: { source: string; doi?: string; url?: string; license?: string; dateAdded?: string; notes?: string };
  usedIn?: { slug: string; name: string }[];
};

export type PartsCatalog = {
  count: number;
  items: CatalogPart[];
  facets: { category: Record<string, number> };
};

export type SensorModule = {
  analyte: string;
  category: TargetCategory;
  strategy: string;
  casProtein?: string;
  regulator?: string;
  promoter?: string;
  sensorMechanism?: string;
  logicType?: string;
  operatingRange?: string;
  detects?: string;
  source: string;
  fromSlug: string;
};

export type BiosensorLibrary = {
  count: number;
  items: BiosensorSummary[];
  facets: {
    category: Record<string, number>;
    strategy: Record<string, number>;
    chassisName: Record<string, number>;
    status: Record<string, number>;
  };
};

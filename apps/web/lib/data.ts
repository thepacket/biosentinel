// Build-time data access. Library content lives in the repo under data/;
// the static export reads it from the filesystem so no running API is needed
// to build the site.
import fs from "node:fs";
import path from "node:path";
import type {
  Biosensor,
  BiosensorLibrary,
  BiosensorSummary,
  Chassis,
  ChassisSummary,
} from "./types";

const CHASSIS_DIR =
  process.env.BIOSENSORS_CHASSIS_DIR || path.resolve(process.cwd(), "../../data/chassis");
const BIOSENSOR_DIR =
  process.env.BIOSENSORS_DESIGN_DIR || path.resolve(process.cwd(), "../../data/biosensors");

function readDir<T>(dir: string): T[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as T);
}

export function getAllChassis(): Chassis[] {
  return readDir<Chassis>(CHASSIS_DIR).sort((a, b) => a.name.localeCompare(b.name));
}

export function getChassisBySlug(slug: string): Chassis | null {
  return getAllChassis().find((c) => c.slug === slug) ?? null;
}

export function getAllBiosensors(): Biosensor[] {
  return readDir<Biosensor>(BIOSENSOR_DIR).sort((a, b) => a.name.localeCompare(b.name));
}

export function getBiosensorBySlug(slug: string): Biosensor | null {
  const b = getAllBiosensors().find((x) => x.slug === slug);
  if (!b) return null;
  return { ...b, chassis: getChassisBySlug(b.chassisSlug) };
}

function chassisSummary(c: Chassis): ChassisSummary {
  return {
    slug: c.slug,
    name: c.name,
    species: c.species,
    strain: c.strain,
    shortDescription: c.shortDescription ?? "",
    biosafetyLevel: c.biosafetyLevel,
    gras: c.safety.gras ?? false,
    probiotic: c.safety.probiotic ?? false,
    bestFor: c.bestFor ?? [],
    environments: c.typicalEnvironments ?? [],
  };
}

export function getChassisCatalog(): ChassisSummary[] {
  return getAllChassis().map(chassisSummary);
}

function biosensorSummary(b: Biosensor): BiosensorSummary {
  const c = getChassisBySlug(b.chassisSlug);
  return {
    slug: b.slug,
    name: b.name,
    shortDescription: b.shortDescription ?? "",
    status: b.status,
    tags: b.tags ?? [],
    analyte: b.input.analyte,
    category: b.input.category,
    strategy: b.sensing.strategy,
    output: b.output.type,
    reporterGene: b.output.reporterGene,
    chassisSlug: b.chassisSlug,
    chassisName: c?.name ?? b.chassisSlug,
    biosafetyLevel: b.safety.biosafetyLevel,
    grasChassis: b.safety.grasChassis,
  };
}

export function getBiosensorLibrary(): BiosensorLibrary {
  const items = getAllBiosensors().map(biosensorSummary);
  const facet = (key: "category" | "strategy" | "chassisName" | "status") =>
    items.reduce<Record<string, number>>((acc, b) => {
      acc[b[key]] = (acc[b[key]] ?? 0) + 1;
      return acc;
    }, {});
  return {
    count: items.length,
    items,
    facets: {
      category: facet("category"),
      strategy: facet("strategy"),
      chassisName: facet("chassisName"),
      status: facet("status"),
    },
  };
}

import { getAllChassis, getAllParts } from "@/lib/data";
import GuideDesigner from "../components/GuideDesigner";

export default function GuidesPage() {
  const targetParts = getAllParts()
    .filter((p) => p.sequence)
    .map((p) => ({ name: p.name, sequence: p.sequence as string, category: p.category }));
  const chassisGenomes = getAllChassis().map((c) => {
    const accession = c.engineering?.genomeAccession ?? "";
    return { slug: c.slug, name: c.name, accession, fetchable: /^(NC_|NZ_|NG_)/.test(accession) };
  });

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Guide RNA designer</h1>
          <p>
            Design and check the sgRNA for a CRISPRi/CRISPRa biosensor — no prior expertise needed. Paste your target (or load
            an example), get ranked guides, and confirm each one is unique to your host. Off-target scoring uses an authentic
            CFD / MIT engine.
          </p>
        </div>
      </section>
      <div className="container" style={{ paddingBottom: 64 }}>
        <GuideDesigner targetParts={targetParts} chassisGenomes={chassisGenomes} />
      </div>
    </>
  );
}

import GuideDesigner from "../components/GuideDesigner";

export default function GuidesPage() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Guide RNA designer</h1>
          <p>
            Design and score the sgRNA for a CRISPRi/CRISPRa biosensor. Paste your target region, pick a Cas, and get ranked
            candidate spacers — then score off-target binding against a host genome or plasmid. Powered by an authentic CFD /
            MIT off-target engine (adapted from CRISPR Studio).
          </p>
        </div>
      </section>
      <div className="container" style={{ paddingBottom: 64 }}>
        <GuideDesigner />
      </div>
    </>
  );
}

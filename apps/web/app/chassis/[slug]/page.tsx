import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllChassis, getChassisBySlug, getBiosensorLibrary } from "@/lib/data";

export function generateStaticParams() {
  return getAllChassis().map((c) => ({ slug: c.slug }));
}

export default function ChassisPage({ params }: { params: { slug: string } }) {
  const c = getChassisBySlug(params.slug);
  if (!c) notFound();

  const designs = getBiosensorLibrary().items.filter((b) => b.chassisSlug === c.slug);

  return (
    <>
      <div className="detail-head">
        <div className="container">
          <div className="breadcrumb">
            <Link href="/chassis">Safe chassis</Link> / {c.name}
          </div>
          <h1>{c.name}</h1>
          <p className="lede">{c.shortDescription}</p>
          <div className="chips" style={{ marginTop: 12 }}>
            <span className="badge bsl1">BSL-1</span>
            {c.safety.gras && <span className="badge gras">GRAS</span>}
            {c.safety.probiotic && <span className="badge probiotic">probiotic</span>}
          </div>
        </div>
      </div>

      <div className="container">
        <section className="block">
          <h2>Identity</h2>
          <dl className="kv">
            <dt>Species</dt><dd>{c.species}</dd>
            <dt>Strain</dt><dd>{c.strain}</dd>
            {c.taxId && (<><dt>NCBI taxid</dt><dd>{c.taxId}</dd></>)}
            {c.engineering?.genomeAccession && (<><dt>Genome</dt><dd>{c.engineering.genomeAccession}</dd></>)}
          </dl>
        </section>

        <section className="block">
          <h2>Safety</h2>
          <dl className="kv">
            <dt>Biosafety level</dt><dd><span className="badge bsl1">BSL-1</span></dd>
            <dt>Pathogenic</dt><dd>{c.safety.pathogenic ? "Yes" : "No"}</dd>
            <dt>GRAS</dt><dd>{c.safety.gras ? `Yes — ${c.safety.grasBasis ?? ""}` : "No"}</dd>
            {c.safety.probiotic && (<><dt>Probiotic</dt><dd>Yes{c.safety.humanUse ? ` — ${c.safety.humanUse}` : ""}</dd></>)}
            {c.safety.biocontainment && (<><dt>Biocontainment</dt><dd>{c.safety.biocontainment}</dd></>)}
            <dt>BSL-1 basis</dt><dd>{c.safety.bslSource}</dd>
          </dl>
          {c.safety.notes && <p className="footnote">{c.safety.notes}</p>}
        </section>

        {c.traits && (
          <section className="block">
            <h2>Traits</h2>
            <dl className="kv">
              {c.traits.gram && (<><dt>Gram</dt><dd>{c.traits.gram}</dd></>)}
              {c.traits.oxygen && (<><dt>Oxygen</dt><dd>{c.traits.oxygen}</dd></>)}
              {c.traits.optimalTempC != null && (<><dt>Optimal temp</dt><dd>{c.traits.optimalTempC} °C</dd></>)}
              {c.traits.doublingTimeMin != null && (<><dt>Doubling time</dt><dd>~{c.traits.doublingTimeMin} min</dd></>)}
              <dt>Spore-forming</dt><dd>{c.traits.sporeForming ? "Yes" : "No"}</dd>
              <dt>Transformable</dt><dd>{c.traits.transformable ? "Yes" : "No"}</dd>
            </dl>
          </section>
        )}

        {c.engineering && (
          <section className="block">
            <h2>Engineering</h2>
            <dl className="kv">
              {c.engineering.crisprTools && (<><dt>CRISPR tooling</dt><dd>{c.engineering.crisprTools}</dd></>)}
              {c.engineering.commonPromoters && (<><dt>Common promoters</dt><dd>{c.engineering.commonPromoters.join(", ")}</dd></>)}
              {c.engineering.selectionMarkers && (<><dt>Selection markers</dt><dd>{c.engineering.selectionMarkers.join(", ")}</dd></>)}
              {c.engineering.toolkits && (<><dt>Toolkits</dt><dd>{c.engineering.toolkits.join(", ")}</dd></>)}
            </dl>
          </section>
        )}

        <section className="block">
          <h2>Biosensors using this chassis</h2>
          {designs.length === 0 ? (
            <p className="footnote">No designs yet.</p>
          ) : (
            <div className="grid">
              {designs.map((b) => (
                <Link key={b.slug} href={`/biosensors/${b.slug}`} className="card">
                  <h3>{b.name}</h3>
                  <p>{b.shortDescription}</p>
                  <div className="chips">
                    <span className={`cat cat-${b.category}`}>{b.category}</span>
                    <span className="chip cas">{b.strategy}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

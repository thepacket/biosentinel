import Link from "next/link";
import { getChassisCatalog } from "@/lib/data";

const CATEGORY_LABEL: Record<string, string> = {
  environmental: "Environmental",
  pathogen: "Pathogen",
  "clinical-gut": "Clinical / gut",
  chemical: "Chemical",
};

export default function ChassisCatalogPage() {
  const items = getChassisCatalog();
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Safe chassis catalog</h1>
          <p>
            Every biosensor is built in one of these hosts. The catalog is restricted to{" "}
            <strong>non-pathogenic BSL-1 organisms</strong>; GRAS / probiotic status is shown where it applies.
          </p>
        </div>
      </section>
      <div className="container" style={{ paddingBottom: 64 }}>
        <div className="grid">
          {items.map((c) => (
            <Link key={c.slug} href={`/chassis/${c.slug}`} className="card">
              <div className="chips" style={{ marginBottom: 8 }}>
                <span className="badge bsl1">BSL-1</span>
                {c.gras && <span className="badge gras">GRAS</span>}
                {c.probiotic && <span className="badge probiotic">probiotic</span>}
              </div>
              <h3>{c.name}</h3>
              <p>{c.shortDescription}</p>
              <div className="chips">
                {c.bestFor.map((cat) => (
                  <span key={cat} className={`cat cat-${cat}`}>{CATEGORY_LABEL[cat] ?? cat}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

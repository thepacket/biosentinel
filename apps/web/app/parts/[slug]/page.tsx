import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllParts, getPartBySlug } from "@/lib/data";

export function generateStaticParams() {
  return getAllParts().map((p) => ({ slug: p.slug }));
}

const CAT_LABEL: Record<string, string> = {
  reporter: "Reporter / output",
  promoter: "Promoter",
  dcas9: "dCas9 / Cas variant",
  "sgrna-scaffold": "sgRNA scaffold",
  riboswitch: "Riboswitch",
  rbs: "Ribosome binding site",
  terminator: "Terminator",
  regulator: "Regulator",
  operator: "Operator",
  cds: "Coding sequence",
};

export default function PartPage({ params }: { params: { slug: string } }) {
  const p = getPartBySlug(params.slug);
  if (!p) notFound();

  return (
    <>
      <div className="detail-head">
        <div className="container">
          <div className="breadcrumb">
            <Link href="/parts">Parts</Link> / {p.name}
          </div>
          <h1>{p.name}</h1>
          <p className="lede">{p.shortDescription}</p>
          <div className="chips" style={{ marginTop: 12 }}>
            <span className="chip cas">{CAT_LABEL[p.category] ?? p.category}</span>
            {p.partId && <span className="chip">{p.partId}</span>}
            {p.instrumentFree && <span className="badge gras">instrument-free</span>}
            {(p.tags ?? []).map((t) => <span key={t} className="chip">{t}</span>)}
          </div>
        </div>
      </div>

      <div className="container">
        <section className="block">
          <h2>Details</h2>
          <dl className="kv">
            <dt>Type</dt><dd>{CAT_LABEL[p.category] ?? p.category}</dd>
            {p.hosts && p.hosts.length > 0 && (<><dt>Hosts</dt><dd>{p.hosts.join(", ")}</dd></>)}
            {p.outputType && (<><dt>Output</dt><dd>{p.outputType}</dd></>)}
            {p.readout && (<><dt>Readout</dt><dd>{p.readout}</dd></>)}
            {p.strength && (<><dt>Strength</dt><dd>{p.strength}</dd></>)}
            {p.inducer && (<><dt>Inducer</dt><dd>{p.inducer}</dd></>)}
            {p.action && (<><dt>CRISPR action</dt><dd>{p.action}</dd></>)}
            {p.pamOrPfs && (<><dt>PAM / PFS</dt><dd>{p.pamOrPfs}</dd></>)}
            {p.ligand && (<><dt>Ligand</dt><dd>{p.ligand}</dd></>)}
          </dl>
          {p.sequence && (
            <div className="seq-row" style={{ marginTop: 12 }}>
              <div className="seq-name">Sequence</div>
              <div className="seq">{p.sequence}</div>
            </div>
          )}
        </section>

        <section className="block">
          <h2>Used in designs</h2>
          {p.usedIn && p.usedIn.length > 0 ? (
            <div className="chips">
              {p.usedIn.map((u) => (
                <Link key={u.slug} href={`/biosensors/${u.slug}`} className="chip" style={{ cursor: "pointer" }}>{u.name}</Link>
              ))}
            </div>
          ) : (
            <p className="footnote">Not referenced by a library design yet — available in the designer.</p>
          )}
        </section>

        <section className="block">
          <h2>Source</h2>
          <dl className="kv">
            <dt>Reference</dt><dd>{p.provenance.source}</dd>
            {p.provenance.url && (<><dt>Link</dt><dd><a href={p.provenance.url} target="_blank" rel="noreferrer">{p.provenance.url}</a></dd></>)}
            {p.provenance.license && (<><dt>License</dt><dd>{p.provenance.license}</dd></>)}
          </dl>
        </section>
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllBiosensors, getBiosensorBySlug } from "@/lib/data";
import { circuitPropsFromBiosensor, REPORTER_BY_GENE } from "@/lib/designer";
import CloneButton from "../../components/CloneButton";
import CircuitDiagram from "../../components/CircuitDiagram";
import PartsTrack from "../../components/PartsTrack";

export function generateStaticParams() {
  return getAllBiosensors().map((b) => ({ slug: b.slug }));
}

const CATEGORY_LABEL: Record<string, string> = {
  environmental: "Environmental contaminant",
  pathogen: "Pathogen signal",
  "clinical-gut": "Clinical / gut biomarker",
  chemical: "Chemical / metabolite",
};

export default function BiosensorPage({ params }: { params: { slug: string } }) {
  const b = getBiosensorBySlug(params.slug);
  if (!b) notFound();

  const c = b.chassis;
  const stages = [
    { label: "Input", value: b.input.analyte, sub: CATEGORY_LABEL[b.input.category] },
    { label: "Sense", value: b.sensing.strategy, sub: b.sensing.casProtein ?? "" },
    { label: "Chassis", value: c?.name ?? b.chassisSlug, sub: "BSL-1" },
    { label: "Output", value: b.output.reporterGene ?? b.output.type, sub: b.output.type },
  ];

  return (
    <>
      <div className="detail-head">
        <div className="container">
          <div className="breadcrumb">
            <Link href="/">Designs</Link> / {b.name}
          </div>
          <h1>{b.name}</h1>
          <p className="lede">{b.shortDescription}</p>
          <div className="chips" style={{ marginTop: 12 }}>
            <span className={`cat cat-${b.input.category}`}>{CATEGORY_LABEL[b.input.category]}</span>
            <span className="badge bsl1">BSL-1 chassis</span>
            {b.safety.grasChassis && <span className="badge gras">GRAS</span>}
            <span className={`badge ${b.status}`}>{b.status}</span>
            {(b.tags ?? []).map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
          </div>
          <div className="actions">
            <CloneButton slug={b.slug} name={b.name} />
            <a
              className="btn secondary"
              href={`/design/?analyte=${encodeURIComponent(b.input.analyte)}&chassis=${b.chassisSlug}&strategy=${b.sensing.strategy}&reporter=${REPORTER_BY_GENE[b.output.reporterGene ?? ""] ?? "sfgfp"}&name=${encodeURIComponent(b.name + " (remix)")}`}
            >
              Open in designer
            </a>
            {b.provenance.url && (
              <a className="btn secondary" href={b.provenance.url} target="_blank" rel="noreferrer">Source ↗</a>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="pipeline">
          {stages.map((s, i) => (
            <div key={s.label} className="stage">
              <div className="label">{s.label}</div>
              <div className="value">{s.value}</div>
              {s.sub && <div className="sub">{s.sub}</div>}
              {i < stages.length - 1 && <div className="arrow">→</div>}
            </div>
          ))}
        </div>

        {/* What it detects */}
        <section className="block">
          <h2>What it detects</h2>
          <dl className="kv">
            <dt>Analyte</dt>
            <dd>{b.input.analyte}</dd>
            <dt>Category</dt>
            <dd>{CATEGORY_LABEL[b.input.category]}</dd>
            {b.input.detects && (<><dt>Signal</dt><dd>{b.input.detects}</dd></>)}
            {b.input.operatingRange && (<><dt>Operating range</dt><dd>{b.input.operatingRange}</dd></>)}
          </dl>
        </section>

        {/* Circuit diagram */}
        <section className="block">
          <h2>Genetic circuit</h2>
          <CircuitDiagram {...circuitPropsFromBiosensor(b)} />
        </section>

        {/* SBOL parts track */}
        <section className="block">
          <h2>Genetic construct (SBOL)</h2>
          <p className="footnote" style={{ marginTop: 0, marginBottom: 10 }}>
            The DNA construct as transcription units, drawn with SBOL Visual part glyphs.
          </p>
          <PartsTrack {...circuitPropsFromBiosensor(b)} />
        </section>

        {/* Sensing mechanism */}
        <section className="block">
          <h2>CRISPR sensing mechanism</h2>
          <dl className="kv">
            <dt>Strategy</dt>
            <dd>{b.sensing.strategy}{b.sensing.logicType ? ` · ${b.sensing.logicType} logic` : ""}</dd>
            {b.sensing.casProtein && (<><dt>Cas protein</dt><dd>{b.sensing.casProtein}</dd></>)}
            {b.sensing.sensorMechanism && (<><dt>Analyte sensor</dt><dd>{b.sensing.sensorMechanism}</dd></>)}
          </dl>
          <div className="signal-flow">
            <div className="lbl">Signal flow</div>
            {b.sensing.signalFlow}
          </div>
        </section>

        {/* Chassis */}
        {c && (
          <section className="block">
            <h2>Safe chassis</h2>
            <div className="chassis-card">
              <div className="body">
                <div className="name">
                  <Link href={`/chassis/${c.slug}`}>{c.name}</Link> — <span style={{ color: "var(--muted)" }}>{c.species}</span>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 13, margin: "6px 0 0" }}>{c.shortDescription}</p>
                <div className="badges">
                  <span className="badge bsl1">BSL-1</span>
                  {c.safety.gras && <span className="badge gras">GRAS{c.safety.grasBasis ? ` · ${c.safety.grasBasis.split(";")[0]}` : ""}</span>}
                  {c.safety.probiotic && <span className="badge probiotic">probiotic</span>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Parts */}
        {b.parts && b.parts.length > 0 && (
          <section className="block">
            <h2>Genetic parts</h2>
            <table className="parts">
              <thead>
                <tr><th>Part</th><th>Role</th><th>Source / id</th></tr>
              </thead>
              <tbody>
                {b.parts.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <strong>{p.name}</strong>
                      {p.notes && <div style={{ color: "var(--muted)", fontSize: 12 }}>{p.notes}</div>}
                      {p.sequence && <div className="partseq">{p.sequence}</div>}
                    </td>
                    <td><span className="role-tag">{p.role}</span></td>
                    <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{p.partId ?? p.source ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Output */}
        <section className="block">
          <h2>Output &amp; readout</h2>
          <dl className="kv">
            <dt>Type</dt>
            <dd>{b.output.type}</dd>
            {b.output.reporterGene && (<><dt>Reporter</dt><dd>{b.output.reporterGene}</dd></>)}
            <dt>Readout</dt>
            <dd>{b.output.readout}</dd>
            {b.output.result && (<><dt>Positive result</dt><dd>{b.output.result}</dd></>)}
          </dl>
        </section>

        {/* Performance */}
        {b.performance && (
          <section className="block">
            <h2>Performance</h2>
            <dl className="kv">
              {b.performance.limitOfDetection && (<><dt>Limit of detection</dt><dd>{b.performance.limitOfDetection}</dd></>)}
              {b.performance.dynamicRange && (<><dt>Dynamic range</dt><dd>{b.performance.dynamicRange}</dd></>)}
              {b.performance.responseTimeMin != null && (<><dt>Response time</dt><dd>~{b.performance.responseTimeMin} min</dd></>)}
              <dt>Device validated</dt>
              <dd>{b.performance.validated ? "Yes" : <span className="warn-inline">No — design template (parts validated individually)</span>}</dd>
            </dl>
            {b.performance.notes && <p className="footnote">{b.performance.notes}</p>}
          </section>
        )}

        {/* Safety */}
        <section className="block">
          <h2>Safety</h2>
          <dl className="kv">
            <dt>Biosafety level</dt>
            <dd><span className="badge bsl1">BSL-1</span> (non-pathogenic chassis)</dd>
            <dt>GRAS chassis</dt>
            <dd>{b.safety.grasChassis ? "Yes" : "No"}</dd>
            {b.safety.biocontainment && (<><dt>Biocontainment</dt><dd>{b.safety.biocontainment}</dd></>)}
            <dt>Field-deployable</dt>
            <dd>{b.safety.fieldDeployable ? "Yes (with containment)" : "Lab / supervised use"}</dd>
          </dl>
          {b.safety.notes && <p className="footnote">{b.safety.notes}</p>}
        </section>

        {/* Build steps */}
        {b.buildSteps && b.buildSteps.length > 0 && (
          <section className="block">
            <h2>Build &amp; run</h2>
            <table className="steps">
              <thead>
                <tr><th>#</th><th>Stage</th><th>Step</th></tr>
              </thead>
              <tbody>
                {b.buildSteps.slice().sort((x, y) => x.order - y.order).map((s) => (
                  <tr key={s.order}>
                    <td>{s.order}</td>
                    <td><span className="stage-tag">{s.stage}</span></td>
                    <td>
                      <strong>{s.title}</strong>
                      {s.description && <div style={{ color: "var(--muted)", fontSize: 13 }}>{s.description}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Provenance */}
        <section className="block">
          <h2>Source &amp; parts</h2>
          <dl className="kv">
            <dt>Design</dt>
            <dd>{b.provenance.source}</dd>
            {b.provenance.partsSources && b.provenance.partsSources.length > 0 && (
              <>
                <dt>Parts validated in</dt>
                <dd>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {b.provenance.partsSources.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </dd>
              </>
            )}
            {b.provenance.url && (<><dt>Link</dt><dd><a href={b.provenance.url} target="_blank" rel="noreferrer">{b.provenance.url}</a></dd></>)}
            {b.provenance.license && (<><dt>License</dt><dd>{b.provenance.license}</dd></>)}
          </dl>
        </section>
      </div>
    </>
  );
}

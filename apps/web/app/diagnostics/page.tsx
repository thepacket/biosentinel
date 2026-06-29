import { getLegacyExamples } from "@/lib/data";
import DiagnosticsDesigner from "../components/DiagnosticsDesigner";

export default function DiagnosticsPage() {
  const examples = getLegacyExamples();
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>In-vitro CRISPR-Dx designer</h1>
          <p>
            Design a <strong>nucleic-acid detection</strong> assay — DETECTR (Cas12a), SHERLOCK (Cas13a/d), or a dCas9-binding
            sensor. Paste a pathogen target (or load a legacy example), and get ranked detection crRNAs plus a matched
            RPA pre-amplification primer pair. Engine adapted from CRISPR Studio; complements the whole-cell library.
          </p>
        </div>
      </section>
      <div className="container" style={{ paddingBottom: 64 }}>
        <DiagnosticsDesigner examples={examples} />
      </div>
    </>
  );
}

import { getPartsCatalog } from "@/lib/data";
import PartsBrowser from "../components/PartsBrowser";

export default function PartsPage() {
  const data = getPartsCatalog();
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Parts registry</h1>
          <p>
            The reusable genetic parts behind the designs — reporters, promoters, dCas9/Cas variants, sgRNA scaffolds,
            riboswitches, RBSs, and terminators. Reporters here feed directly into the designer.
          </p>
        </div>
      </section>
      <div className="container" style={{ paddingBottom: 64 }}>
        <PartsBrowser data={data} />
      </div>
    </>
  );
}

import { getChassisCatalog, getSensorModules } from "@/lib/data";
import Designer from "../components/Designer";

export default function DesignPage() {
  const modules = getSensorModules();
  const chassis = getChassisCatalog();
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Designer</h1>
          <p>
            Build your own living biosensor. Pick a real, cited <strong>sensing module</strong>, a safe{" "}
            <strong>BSL-1 / GRAS chassis</strong>, a <strong>CRISPR strategy</strong>, and a <strong>reporter</strong> — the
            designer assembles a schema-valid draft you can download and refine. Every module comes from a published source in
            the library.
          </p>
        </div>
      </section>
      <div className="container" style={{ paddingBottom: 64 }}>
        <Designer modules={modules} chassis={chassis} />
      </div>
    </>
  );
}

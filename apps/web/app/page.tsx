import { getBiosensorLibrary } from "@/lib/data";
import LibraryBrowser from "./components/LibraryBrowser";

export default function HomePage() {
  const data = getBiosensorLibrary();

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Living biosensor designs</h1>
          <p>
            Engineer safe bacteria into living sensors. Every design pairs a non-pathogenic{" "}
            <strong>BSL-1 / GRAS chassis</strong> with a <strong>CRISPR-based sensing circuit</strong> (dCas9 /
            CRISPRi) that detects an analyte and produces a readable output. Clone any design to adapt it to your
            target.
          </p>
        </div>
      </section>
      <div className="container">
        <LibraryBrowser data={data} />
      </div>
    </>
  );
}

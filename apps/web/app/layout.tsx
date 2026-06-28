import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Biosentinel — whole-cell CRISPR biosensor studio",
  description:
    "Design living biosensors: engineer safe (BSL-1/GRAS) bacteria with CRISPR-based sensing circuits to detect contaminants, pathogens, and biomarkers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-row">
            <Link href="/" style={{ color: "inherit" }}>
              <div className="brand">
                Bio<span>sentinel</span>
              </div>
              <div className="tagline">Whole-cell CRISPR biosensor studio · safe bacteria only</div>
            </Link>
            <nav className="nav">
              <Link href="/">Designs</Link>
              <Link href="/chassis">Safe chassis</Link>
              <Link href="/design">Designer</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="container">
            All designs use non-pathogenic <strong>BSL-1 / GRAS</strong> chassis only. Designs marked
            <em> template</em> combine individually-validated parts into a CRISPR circuit pattern and are not
            end-to-end validated devices. Research / educational use only — engineer responsibly and follow your
            institution&apos;s biosafety rules. A legacy in-vitro CRISPR-Dx assay library remains available via the API.
          </div>
        </footer>
      </body>
    </html>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BiosensorLibrary, BiosensorSummary } from "@/lib/types";

const CATEGORY_LABEL: Record<string, string> = {
  environmental: "Environmental",
  pathogen: "Pathogen",
  "clinical-gut": "Clinical / gut",
  chemical: "Chemical",
};

function FacetGroup({
  title,
  facet,
  active,
  onSelect,
  label,
}: {
  title: string;
  facet: Record<string, number>;
  active: string | null;
  onSelect: (v: string | null) => void;
  label?: (k: string) => string;
}) {
  const entries = Object.entries(facet).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return (
    <div>
      <h3>{title}</h3>
      <button className={`filter-btn ${active === null ? "active" : ""}`} onClick={() => onSelect(null)}>
        <span>All</span>
      </button>
      {entries.map(([k, n]) => (
        <button key={k} className={`filter-btn ${active === k ? "active" : ""}`} onClick={() => onSelect(k)}>
          <span>{label ? label(k) : k}</span>
          <span className="count">{n}</span>
        </button>
      ))}
    </div>
  );
}

function Card({ b }: { b: BiosensorSummary }) {
  return (
    <Link href={`/biosensors/${b.slug}`} className="card">
      <div className="chips" style={{ marginBottom: 8 }}>
        <span className={`cat cat-${b.category}`}>{CATEGORY_LABEL[b.category] ?? b.category}</span>
        <span className="badge bsl1">BSL-1</span>
        {b.grasChassis && <span className="badge gras">GRAS</span>}
      </div>
      <h3>{b.name}</h3>
      <p>{b.shortDescription}</p>
      <div className="chips">
        <span className="chip cas">{b.strategy}</span>
        <span className="chip amp">{b.reporterGene ?? b.output}</span>
        <span className="chip">{b.chassisName}</span>
        <span className={`badge ${b.status}`}>{b.status}</span>
      </div>
    </Link>
  );
}

export default function LibraryBrowser({ data }: { data: BiosensorLibrary }) {
  const [cat, setCat] = useState<string | null>(null);
  const [chassis, setChassis] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return data.items.filter(
      (b) =>
        (!cat || b.category === cat) &&
        (!chassis || b.chassisName === chassis) &&
        (!strategy || b.strategy === strategy) &&
        (!ql ||
          b.name.toLowerCase().includes(ql) ||
          b.analyte.toLowerCase().includes(ql) ||
          b.tags.some((t) => t.toLowerCase().includes(ql))),
    );
  }, [data.items, cat, chassis, strategy, q]);

  return (
    <div className="layout">
      <aside className="filters">
        <input
          className="search-input"
          placeholder="Search analyte, name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <FacetGroup title="Detects" facet={data.facets.category} active={cat} onSelect={setCat} label={(k) => CATEGORY_LABEL[k] ?? k} />
        <FacetGroup title="Sensing strategy" facet={data.facets.strategy} active={strategy} onSelect={setStrategy} />
        <FacetGroup title="Chassis" facet={data.facets.chassisName} active={chassis} onSelect={setChassis} />
      </aside>
      <div>
        <div className="count-line">
          {items.length} {items.length === 1 ? "design" : "designs"}
        </div>
        <div className="grid">
          {items.map((b) => (
            <Card key={b.slug} b={b} />
          ))}
        </div>
      </div>
    </div>
  );
}

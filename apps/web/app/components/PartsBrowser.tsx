"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogPart, PartsCatalog } from "@/lib/types";

const CAT_LABEL: Record<string, string> = {
  reporter: "Reporters",
  promoter: "Promoters",
  dcas9: "dCas9 / Cas variants",
  "sgrna-scaffold": "sgRNA scaffolds",
  riboswitch: "Riboswitches",
  rbs: "RBSs",
  terminator: "Terminators",
  regulator: "Regulators",
  operator: "Operators",
  cds: "CDSs",
};

function Card({ p }: { p: CatalogPart }) {
  return (
    <Link href={`/parts/${p.slug}`} className="card">
      <div className="chips" style={{ marginBottom: 8 }}>
        <span className="chip cas">{CAT_LABEL[p.category] ?? p.category}</span>
        {p.partId && <span className="chip">{p.partId}</span>}
        {p.instrumentFree && <span className="badge gras">instrument-free</span>}
      </div>
      <h3>{p.name}</h3>
      <p>{p.shortDescription}</p>
      {p.sequence && <div className="partseq" style={{ marginTop: 8 }}>{p.sequence.slice(0, 60)}{p.sequence.length > 60 ? "…" : ""}</div>}
    </Link>
  );
}

export default function PartsBrowser({ data }: { data: PartsCatalog }) {
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return data.items.filter(
      (p) =>
        (!cat || p.category === cat) &&
        (!ql ||
          p.name.toLowerCase().includes(ql) ||
          (p.shortDescription ?? "").toLowerCase().includes(ql) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(ql))),
    );
  }, [data.items, cat, q]);

  const cats = Object.entries(data.facets.category).sort((a, b) => b[1] - a[1]);

  return (
    <div className="layout">
      <aside className="filters">
        <input className="search-input" placeholder="Search parts…" value={q} onChange={(e) => setQ(e.target.value)} />
        <h3>Type</h3>
        <button className={`filter-btn ${cat === null ? "active" : ""}`} onClick={() => setCat(null)}><span>All</span></button>
        {cats.map(([k, n]) => (
          <button key={k} className={`filter-btn ${cat === k ? "active" : ""}`} onClick={() => setCat(k)}>
            <span>{CAT_LABEL[k] ?? k}</span>
            <span className="count">{n}</span>
          </button>
        ))}
      </aside>
      <div>
        <div className="count-line">{items.length} {items.length === 1 ? "part" : "parts"}</div>
        <div className="grid">
          {items.map((p) => <Card key={p.slug} p={p} />)}
        </div>
      </div>
    </div>
  );
}

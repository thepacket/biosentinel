"use client";

import { useState } from "react";

// Empty in production (same origin — FastAPI serves both the SPA and the API).
// In dev, set NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000 (see README).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export default function CloneButton({ slug, name }: { slug: string; name: string }) {
  const [busy, setBusy] = useState(false);

  async function clone() {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/biosensors/${slug}/clone`, { method: "POST" });
      if (!res.ok) throw new Error(`Clone failed (${res.status})`);
      const draft = await res.json();
      const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${draft.slug}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn" onClick={clone} disabled={busy} title={`Clone ${name} to edit`}>
      {busy ? "Cloning…" : "Clone to edit"}
    </button>
  );
}

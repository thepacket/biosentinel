"use client";

import { useEffect, useState } from "react";

// Wraps an inline SVG so clicking it opens a large full-screen overlay.
export default function ZoomableSvg({ children, label }: { children: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Enlarge ${label}`}
        style={{ display: "block", width: "100%", padding: 0, border: "none", background: "none", cursor: "zoom-in" }}
      >
        {children}
      </button>
      <div style={{ textAlign: "right", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "#8b9bb0" }}>⤢ click to enlarge</span>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(2,6,12,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4vw",
          }}
        >
          <div style={{ width: "min(96vw, 1180px)" }} onClick={(e) => e.stopPropagation()}>
            {children}
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button className="btn secondary" onClick={() => setOpen(false)}>Close (Esc)</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

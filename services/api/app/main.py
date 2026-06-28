"""Biosensors API.

Serves the whole-cell biosensor design studio:
  - the safe-chassis catalog (BSL-1 / GRAS only)
  - whole-cell CRISPR-based biosensor designs (each referencing a chassis)
  - the legacy in-vitro CRISPR-Dx assay library (kept for reference)

Each data file is validated against its JSON schema on load; a non-BSL-1 chassis
or a biosensor referencing a missing chassis fails fast at startup.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jsonschema import Draft7Validator

_PARENTS = Path(__file__).resolve().parents
REPO_ROOT = _PARENTS[3] if len(_PARENTS) > 3 else _PARENTS[-1]


def _path(env: str, *default: str) -> Path:
    return Path(os.environ.get(env, REPO_ROOT.joinpath(*default)))


CHASSIS_DIR = _path("BIOSENSORS_CHASSIS_DIR", "data", "chassis")
BIOSENSOR_DIR = _path("BIOSENSORS_DESIGN_DIR", "data", "biosensors")
PARTS_DIR = _path("BIOSENSORS_PARTS_DIR", "data", "parts")
LEGACY_DIR = _path("BIOSENSORS_LEGACY_DIR", "data", "legacy-assays")
SCHEMA_DIR = _path("BIOSENSORS_SCHEMA_DIR", "packages", "schema")
STATIC_DIR = os.environ.get("BIOSENSORS_STATIC_DIR")

app = FastAPI(
    title="Biosentinel API",
    version="0.2.0",
    description="Whole-cell CRISPR biosensor design studio (safe BSL-1/GRAS chassis).",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load(data_dir: Path, schema_file: str) -> list[dict[str, Any]]:
    validator = Draft7Validator(json.loads((SCHEMA_DIR / schema_file).read_text()))
    out: list[dict[str, Any]] = []
    if not data_dir.is_dir():
        return out
    for path in sorted(data_dir.glob("*.json")):
        data = json.loads(path.read_text())
        errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
        if errors:
            joined = "; ".join(f"{list(e.path)}: {e.message}" for e in errors)
            raise ValueError(f"{path.name} failed validation: {joined}")
        out.append(data)
    return out


@lru_cache(maxsize=1)
def chassis() -> list[dict[str, Any]]:
    return _load(CHASSIS_DIR, "chassis.schema.json")


@lru_cache(maxsize=1)
def biosensors() -> list[dict[str, Any]]:
    items = _load(BIOSENSOR_DIR, "biosensor.schema.json")
    slugs = {c["slug"] for c in chassis()}
    for b in items:
        if b["chassisSlug"] not in slugs:
            raise ValueError(f"{b['slug']}: chassisSlug '{b['chassisSlug']}' not in catalog")
    return items


@lru_cache(maxsize=1)
def parts() -> list[dict[str, Any]]:
    return _load(PARTS_DIR, "part.schema.json")


@lru_cache(maxsize=1)
def legacy() -> list[dict[str, Any]]:
    return _load(LEGACY_DIR, "assay.schema.json")


def _chassis_by_slug(slug: str) -> dict[str, Any] | None:
    return next((c for c in chassis() if c["slug"] == slug), None)


def _chassis_summary(c: dict[str, Any]) -> dict[str, Any]:
    return {
        "slug": c["slug"],
        "name": c["name"],
        "species": c["species"],
        "strain": c["strain"],
        "shortDescription": c.get("shortDescription", ""),
        "biosafetyLevel": c["biosafetyLevel"],
        "gras": c["safety"].get("gras", False),
        "probiotic": c["safety"].get("probiotic", False),
        "bestFor": c.get("bestFor", []),
        "environments": c.get("typicalEnvironments", []),
    }


def _biosensor_summary(b: dict[str, Any]) -> dict[str, Any]:
    c = _chassis_by_slug(b["chassisSlug"]) or {}
    return {
        "slug": b["slug"],
        "name": b["name"],
        "shortDescription": b.get("shortDescription", ""),
        "status": b["status"],
        "tags": b.get("tags", []),
        "analyte": b["input"]["analyte"],
        "category": b["input"]["category"],
        "strategy": b["sensing"]["strategy"],
        "output": b["output"]["type"],
        "reporterGene": b["output"].get("reporterGene"),
        "chassisSlug": b["chassisSlug"],
        "chassisName": c.get("name", b["chassisSlug"]),
        "biosafetyLevel": b["safety"]["biosafetyLevel"],
        "grasChassis": b["safety"].get("grasChassis", False),
    }


def _facets(items: list[dict[str, Any]], key: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for it in items:
        counts[it[key]] = counts.get(it[key], 0) + 1
    return counts


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "chassisCount": len(chassis()),
        "biosensorCount": len(biosensors()),
        "partsCount": len(parts()),
        "legacyAssayCount": len(legacy()),
    }


@app.get("/api/chassis")
def list_chassis() -> dict[str, Any]:
    items = [_chassis_summary(c) for c in chassis()]
    return {"count": len(items), "items": items}


@app.get("/api/chassis/{slug}")
def get_chassis(slug: str) -> dict[str, Any]:
    c = _chassis_by_slug(slug)
    if not c:
        raise HTTPException(status_code=404, detail=f"No chassis '{slug}'")
    return c


@app.get("/api/biosensors")
def list_biosensors(
    category: str | None = None,
    chassisSlug: str | None = None,
    strategy: str | None = None,
    status: str | None = None,
    q: str | None = None,
) -> dict[str, Any]:
    items = [_biosensor_summary(b) for b in biosensors()]
    if category:
        items = [b for b in items if b["category"] == category]
    if chassisSlug:
        items = [b for b in items if b["chassisSlug"] == chassisSlug]
    if strategy:
        items = [b for b in items if b["strategy"] == strategy]
    if status:
        items = [b for b in items if b["status"] == status]
    if q:
        ql = q.lower()
        items = [
            b for b in items
            if ql in b["name"].lower()
            or ql in b["analyte"].lower()
            or any(ql in t.lower() for t in b["tags"])
        ]
    allitems = [_biosensor_summary(b) for b in biosensors()]
    return {
        "count": len(items),
        "items": items,
        "facets": {
            "category": _facets(allitems, "category"),
            "strategy": _facets(allitems, "strategy"),
            "chassisName": _facets(allitems, "chassisName"),
            "status": _facets(allitems, "status"),
        },
    }


@app.get("/api/biosensors/{slug}")
def get_biosensor(slug: str) -> dict[str, Any]:
    for b in biosensors():
        if b["slug"] == slug:
            return {**b, "chassis": _chassis_by_slug(b["chassisSlug"])}
    raise HTTPException(status_code=404, detail=f"No biosensor '{slug}'")


@app.post("/api/biosensors/{slug}/clone")
def clone_biosensor(slug: str) -> dict[str, Any]:
    for b in biosensors():
        if b["slug"] == slug:
            draft = json.loads(json.dumps(b))
            draft["id"] = f"{b['id']}-copy"
            draft["slug"] = f"{b['slug']}-copy"
            draft["name"] = f"{b['name']} (copy)"
            draft["status"] = "experimental"
            return draft
    raise HTTPException(status_code=404, detail=f"No biosensor '{slug}'")


@app.get("/api/parts")
def list_parts(category: str | None = None, q: str | None = None) -> dict[str, Any]:
    items = parts()
    if category:
        items = [p for p in items if p["category"] == category]
    if q:
        ql = q.lower()
        items = [
            p for p in items
            if ql in p["name"].lower()
            or ql in p.get("shortDescription", "").lower()
            or any(ql in t.lower() for t in p.get("tags", []))
        ]
    return {
        "count": len(items),
        "items": items,
        "facets": {"category": _facets(parts(), "category")},
    }


@app.get("/api/parts/{slug}")
def get_part(slug: str) -> dict[str, Any]:
    for p in parts():
        if p["slug"] == slug:
            used = [
                {"slug": b["slug"], "name": b["name"]}
                for b in biosensors()
                if any(
                    (p.get("partId") and p["partId"] == part.get("partId"))
                    or p["name"].lower() in part.get("name", "").lower()
                    for part in b.get("parts", [])
                )
            ]
            return {**p, "usedIn": used}
    raise HTTPException(status_code=404, detail=f"No part '{slug}'")


@app.get("/api/legacy/assays")
def list_legacy() -> dict[str, Any]:
    return {"count": len(legacy()), "items": legacy()}


# Serve the built static frontend at "/" in production (quantiom pattern).
if STATIC_DIR and Path(STATIC_DIR).is_dir():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

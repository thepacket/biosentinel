#!/usr/bin/env python3
"""Validate the data library against the JSON schemas.

Covers the three data types and cross-checks referential integrity + the
BSL-1 safety guardrail:
  - data/chassis      -> chassis.schema.json   (biosafetyLevel must be 1)
  - data/biosensors   -> biosensor.schema.json (chassisSlug must resolve)
  - data/legacy-assays-> assay.schema.json      (the original CRISPR-Dx library)
"""
import json
import sys
from pathlib import Path

from jsonschema import Draft7Validator

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_DIR = ROOT / "packages" / "schema"


def load_schema(name: str) -> Draft7Validator:
    return Draft7Validator(json.loads((SCHEMA_DIR / name).read_text()))


def validate_dir(data_dir: Path, schema: Draft7Validator) -> tuple[bool, list[dict]]:
    ok = True
    docs = []
    for path in sorted(data_dir.glob("*.json")):
        data = json.loads(path.read_text())
        docs.append(data)
        errors = sorted(schema.iter_errors(data), key=lambda e: list(e.path))
        if errors:
            ok = False
            print(f"FAIL {path.name}")
            for e in errors:
                print(f"   {list(e.path)}: {e.message}")
        else:
            print(f"OK   {path.name} -> {data.get('name')}")
    return ok, docs


def main() -> int:
    overall = True

    print("== chassis ==")
    ok, chassis = validate_dir(ROOT / "data/chassis", load_schema("chassis.schema.json"))
    overall &= ok
    chassis_slugs = {c["slug"] for c in chassis}

    print("\n== biosensors ==")
    ok, biosensors = validate_dir(ROOT / "data/biosensors", load_schema("biosensor.schema.json"))
    overall &= ok

    # Referential integrity: every biosensor's chassis must exist and be BSL-1.
    for b in biosensors:
        cs = b.get("chassisSlug")
        if cs not in chassis_slugs:
            overall = False
            print(f"FAIL {b['slug']}: chassisSlug '{cs}' not in chassis catalog")

    legacy_dir = ROOT / "data/legacy-assays"
    if legacy_dir.is_dir():
        print("\n== legacy CRISPR-Dx assays ==")
        ok, _ = validate_dir(legacy_dir, load_schema("assay.schema.json"))
        overall &= ok

    print("\n" + ("ALL VALID" if overall else "VALIDATION ERRORS"))
    return 0 if overall else 1


if __name__ == "__main__":
    sys.exit(main())

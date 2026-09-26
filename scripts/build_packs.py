"""Pack every wallpaper into zip files small enough for Cloudflare Pages.

JPEGs and PNGs are stored, not recompressed. Each zip stays under 23 MiB.
"""

from __future__ import annotations

import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CATALOG_PATH = PUBLIC / "catalog.json"
PACK_DIR = PUBLIC / "packs"
MANIFEST_PATH = PUBLIC / "packs.json"
MAX_BYTES = 23 * 1024 * 1024
PAGE_CAP = 25 * 1024 * 1024


def sources(catalog: dict) -> list[dict]:
    rows = []
    seen = set()
    for item in catalog["wallpapers"]:
        rows.append({
            "id": item["id"],
            "variant": "desktop",
            "path": PUBLIC / item["file"].lstrip("/"),
            "name": item["filename"],
        })
        phone = item.get("phone")
        if phone:
            rows.append({
                "id": item["id"],
                "variant": "phone",
                "path": PUBLIC / phone["file"].lstrip("/"),
                "name": phone["filename"],
            })
    for row in rows:
        if row["name"] in seen:
            raise SystemExit(f"Duplicate filename: {row['name']}")
        seen.add(row["name"])
        if not row["path"].is_file():
            raise SystemExit(f"Missing {row['path']}")
        row["bytes"] = row["path"].stat().st_size
        if row["bytes"] > MAX_BYTES:
            raise SystemExit(f"{row['name']} is {row['bytes']} bytes, over one pack")
    return rows


def pack_rows(rows: list[dict]) -> list[list[dict]]:
    packs = []
    current = []
    used = 0
    for row in rows:
        extra = row["bytes"] + len(row["name"]) + 64
        if current and used + extra > MAX_BYTES:
            packs.append(current)
            current = []
            used = 0
        current.append(row)
        used += extra
    if current:
        packs.append(current)
    return packs


def write_zip(path: Path, rows: list[dict]) -> None:
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_STORED) as archive:
        for row in rows:
            archive.write(row["path"], arcname=row["name"])


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    rows = sources(catalog)
    groups = pack_rows(rows)
    if PACK_DIR.exists():
        for old in PACK_DIR.glob("wallpapers-*.zip"):
            old.unlink()
    PACK_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    for index, group in enumerate(groups, start=1):
        filename = f"wallpapers-{index:02d}.zip"
        dest = PACK_DIR / filename
        write_zip(dest, group)
        size = dest.stat().st_size
        if size > PAGE_CAP:
            raise SystemExit(f"{filename} is {size} bytes, over the Pages file cap")
        manifest.append({
            "file": f"/packs/{filename}",
            "filename": filename,
            "bytes": size,
            "count": len(group),
            "items": [{"id": row["id"], "variant": row["variant"]} for row in group],
        })
        print(f"{filename} {size} bytes {len(group)} files", flush=True)
    MANIFEST_PATH.write_text(json.dumps({"packs": manifest}, indent=2) + "\n", encoding="utf-8")
    print(f"PACKS {len(manifest)}", flush=True)


if __name__ == "__main__":
    main()

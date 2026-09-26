"""Add or replace one original wallpaper and rebuild its preview, icons, and the share card.

The file copied into public/files is the original bytes. Previews are separate.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import date
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CATALOG_PATH = PUBLIC / "catalog.json"
FONT_CLASH = Path.home() / "design-assets" / "fontshare" / "clash-display" / "otf" / "ClashDisplay-Semibold.otf"
FONT_SATOSHI = Path.home() / "design-assets" / "fontshare" / "satoshi" / "otf" / "Satoshi-Medium.otf"
PREVIEW_WIDTHS = (960, 1600, 2400, 3200)


def aspect_label(width: int, height: int) -> str:
    ratio = width / height
    named = (
        (21, 9, "21:9"),
        (32, 9, "32:9"),
        (18, 9, "2:1"),
        (16, 9, "16:9"),
        (16, 10, "16:10"),
        (3, 2, "3:2"),
        (4, 3, "4:3"),
        (1, 1, "1:1"),
        (9, 16, "9:16"),
    )
    for across, down, label in named:
        target = across / down
        if abs(ratio - target) / target < 0.012:
            return label
    return f"{width}:{height}"


def cover(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = max(width / image.width, height / image.height)
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def square(image: Image.Image, size: int) -> Image.Image:
    return cover(image, size, size)


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=82, method=6)


def load_catalog() -> dict:
    if CATALOG_PATH.exists():
        return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    return {"version": "1.0.0", "wallpapers": []}


def write_catalog(catalog: dict) -> None:
    CATALOG_PATH.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")


def newest_entry(catalog: dict) -> dict:
    top_date = max(item["added"] for item in catalog["wallpapers"])
    tied = [item for item in catalog["wallpapers"] if item["added"] == top_date]
    tied.sort(key=lambda item: item["id"])
    return tied[0]


def draw_share_card(source: Image.Image, entry: dict) -> Image.Image:
    card = Image.new("RGB", (1200, 630), (20, 24, 29))
    card.paste(cover(source, 1200, 566), (0, 0))
    draw = ImageDraw.Draw(card)
    draw.rectangle((0, 566, 1200, 630), fill=(20, 24, 29))
    clash = ImageFont.truetype(str(FONT_CLASH), 30)
    satoshi = ImageFont.truetype(str(FONT_SATOSHI), 18)
    label = "Wallpapers"
    facts = f"{entry['title']}   {entry['width']} x {entry['height']}"
    draw.text((28, 584), label, font=clash, fill=(247, 250, 252))
    facts_width = draw.textlength(facts, font=satoshi)
    draw.text((1200 - 28 - facts_width, 590), facts, font=satoshi, fill=(213, 222, 232))
    return card


def share_entry(catalog: dict) -> dict:
    pinned = [item for item in catalog["wallpapers"] if item.get("featured")]
    if pinned:
        return pinned[0]
    return newest_entry(catalog)


def rebuild_share(catalog: dict) -> None:
    entry = share_entry(catalog)
    source = Image.open(PUBLIC / entry["file"].lstrip("/")).convert("RGB")
    card = draw_share_card(source, entry)
    card.save(PUBLIC / "og.jpg", "JPEG", quality=90, optimize=True, progressive=True, subsampling=0)
    card.save(PUBLIC / "og.png", "PNG", optimize=True)
    square(source, 32).save(PUBLIC / "favicon.png", "PNG", optimize=True)
    square(source, 180).save(PUBLIC / "apple-touch-icon.png", "PNG", optimize=True)
    square(source, 192).save(PUBLIC / "icon-192.png", "PNG", optimize=True)
    square(source, 512).save(PUBLIC / "icon-512.png", "PNG", optimize=True)
    brand = ROOT / "brand"
    brand.mkdir(exist_ok=True)
    cover(source, 1280, 720).save(brand / "hive-1280x720.jpg", "JPEG", quality=88, optimize=True)
    source.close()


def add(args: argparse.Namespace) -> None:
    source_path = Path(args.src).expanduser().resolve()
    if not source_path.is_file():
        raise SystemExit(f"Missing source file: {source_path}")
    raw = source_path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    with Image.open(source_path) as image:
        rgb = image.convert("RGB")
        width, height = rgb.size
        previews = PUBLIC / "previews"
        parts = []
        for preview_width in PREVIEW_WIDTHS:
            preview_height = max(1, round(height * preview_width / width))
            preview = rgb.resize((preview_width, preview_height), Image.Resampling.LANCZOS)
            name = f"{args.id}-{preview_width}.webp"
            save_webp(preview, previews / name)
            parts.append(f"/previews/{name} {preview_width}w")
        rgb.close()

    suffix = source_path.suffix.lower()
    if suffix == ".jpeg":
        suffix = ".jpg"
    if suffix not in {".png", ".jpg"}:
        raise SystemExit("source must be a png or jpg")
    mime = "image/jpeg" if suffix == ".jpg" else "image/png"
    filename = args.filename or f"{args.id}{suffix}"
    destination = PUBLIC / "files" / f"{args.id}{suffix}"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(raw)
    if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
        raise SystemExit("Original bytes changed while copying.")

    entry = {
        "id": args.id,
        "title": args.title,
        "summary": args.summary,
        "added": args.added or date.today().isoformat(),
        "width": width,
        "height": height,
        "bytes": len(raw),
        "sha256": digest,
        "mime": mime,
        "aspect": args.aspect or aspect_label(width, height),
        "filename": filename,
        "file": f"/files/{args.id}{suffix}",
        "alt": args.alt or args.summary,
        "preview": {
            "src": f"/previews/{args.id}-2400.webp",
            "srcset": ", ".join(parts),
        },
    }
    catalog = load_catalog()
    catalog["version"] = catalog.get("version") or "1.0.0"
    others = [item for item in catalog.get("wallpapers", []) if item.get("id") != args.id]
    if any(item.get("id") == args.id for item in catalog.get("wallpapers", [])):
        previous = next(item for item in catalog["wallpapers"] if item.get("id") == args.id)
        if not args.added:
            entry["added"] = previous.get("added", entry["added"])
        if previous.get("featured"):
            entry["featured"] = True
        if previous.get("edition") and not args.edition:
            entry["edition"] = previous["edition"]
        if previous.get("editionFeatured"):
            entry["editionFeatured"] = True
    if args.edition:
        entry["edition"] = args.edition
    if args.phone:
        phone_path = Path(args.phone).expanduser().resolve()
        if not phone_path.is_file():
            raise SystemExit(f"Missing phone file: {phone_path}")
        phone_raw = phone_path.read_bytes()
        phone_digest = hashlib.sha256(phone_raw).hexdigest()
        with Image.open(phone_path) as phone_image:
            phone_width, phone_height = phone_image.size
        if max(phone_width, phone_height) < 7680:
            raise SystemExit(f"phone file is {phone_width}x{phone_height}, under 8K")
        phone_suffix = phone_path.suffix.lower()
        if phone_suffix == ".jpeg":
            phone_suffix = ".jpg"
        if phone_suffix not in {".png", ".jpg"}:
            raise SystemExit("phone file must be a png or jpg")
        phone_filename = args.phone_filename or f"{args.id}-phone{phone_suffix}"
        phone_dest = PUBLIC / "files" / f"{args.id}-phone{phone_suffix}"
        phone_dest.write_bytes(phone_raw)
        if hashlib.sha256(phone_dest.read_bytes()).hexdigest() != phone_digest:
            raise SystemExit("Phone bytes changed while copying.")
        entry["phone"] = {
            "file": f"/files/{args.id}-phone{phone_suffix}",
            "filename": phone_filename,
            "width": phone_width,
            "height": phone_height,
            "bytes": len(phone_raw),
            "sha256": phone_digest,
            "mime": "image/jpeg" if phone_suffix == ".jpg" else "image/png",
            "aspect": args.phone_aspect or aspect_label(phone_width, phone_height),
        }
    catalog["wallpapers"] = others + [entry]
    write_catalog(catalog)
    if not args.no_share:
        rebuild_share(catalog)
    print(f"added {args.id} {width}x{height} {len(raw)} bytes sha256={digest[:12]}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", required=True)
    parser.add_argument("--id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--alt", default="")
    parser.add_argument("--added", default="")
    parser.add_argument("--aspect", default="")
    parser.add_argument("--filename", default="")
    parser.add_argument("--no-share", action="store_true")
    parser.add_argument("--phone", default="")
    parser.add_argument("--phone-filename", default="")
    parser.add_argument("--phone-aspect", default="")
    parser.add_argument("--edition", default="")
    args = parser.parse_args()
    if not args.id.replace("-", "").isalnum() or args.id != args.id.lower():
        raise SystemExit("id must be lowercase letters, numbers, and hyphens")
    add(args)


if __name__ == "__main__":
    main()

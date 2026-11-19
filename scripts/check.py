"""Validate the atlas data files. Exit 1 on any error; warnings do not fail.

Usage: python3 scripts/check.py
"""

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATEGORIES = {"lived", "visited", "surfed", "skied"}
PRECISIONS = {"city", "place", "area", "break", "approximate"}
ICON_LIMIT_BYTES = 4096


def load(name: str):
    try:
        return json.loads((ROOT / name).read_text())
    except (OSError, json.JSONDecodeError) as err:
        raise SystemExit(f"cannot read {name}: {err}") from err


def check_places(places: list, errors: list) -> dict:
    by_id = {}
    for p in places:
        pid = p.get("id", "?")
        if pid in by_id:
            errors.append(f"places: duplicate id {pid}")
        by_id[pid] = p
        for key in ("id", "name", "country", "categories", "coordinates", "precision"):
            if key not in p:
                errors.append(f"places: {pid} missing {key}")
        lng, lat = (p.get("coordinates") or [None, None])[:2]
        if not (isinstance(lng, (int, float)) and isinstance(lat, (int, float)) and -180 <= lng <= 180 and -90 <= lat <= 90):
            errors.append(f"places: {pid} bad coordinates {p.get('coordinates')} (expected [lng, lat])")
        if not p.get("categories") or not set(p["categories"]) <= CATEGORIES:
            errors.append(f"places: {pid} categories {p.get('categories')} not within {sorted(CATEGORIES)}")
        if p.get("precision") not in PRECISIONS:
            errors.append(f"places: {pid} unknown precision {p.get('precision')}")
    return by_id


def check_art(art: dict, by_id: dict, errors: list, warnings: list) -> set:
    groups = {g["id"]: g for g in art["groups"]}
    listed = {}
    for g in art["groups"]:
        for pid in g["places"]:
            if pid not in by_id:
                errors.append(f"group {g['id']}: unknown place {pid}")
            if g.get("list") is not False:
                if pid in listed:
                    errors.append(f"place {pid} is listed in both {listed[pid]} and {g['id']}")
                listed[pid] = g["id"]
    used_icons = set()
    for s in art["stickers"]:
        target = s.get("place") or s.get("group")
        if s.get("place") and s["place"] not in by_id or s.get("group") and s["group"] not in groups or not target:
            errors.append(f"sticker {s.get('icon')}: unknown place/group {target}")
        icon = ROOT / "icons" / f"{s.get('icon')}.svg"
        used_icons.add(icon.name)
        if not icon.exists():
            errors.append(f"sticker {s.get('icon')}: missing {icon.relative_to(ROOT)}")
    for i, pid in enumerate(art.get("journey", {}).get("places", []), 1):
        if pid not in by_id:
            errors.append(f"journey stop {i}: unknown place {pid}")
        elif "lived" not in by_id[pid]["categories"]:
            errors.append(f"journey stop {i}: {pid} is not a lived place")
    for pid, p in by_id.items():
        if "surfed" in p["categories"] and pid not in listed and not any(s.get("place") == pid for s in art["stickers"]):
            warnings.append(f"surfed place {pid} is in no list group and has no sticker")
    return used_icons


def check_icons(used: set, errors: list, warnings: list) -> None:
    for icon in sorted((ROOT / "icons").glob("*.svg")):
        text = icon.read_text()
        if icon.name not in used:
            warnings.append(f"icons/{icon.name} is not used by any sticker")
        if len(text.encode()) > ICON_LIMIT_BYTES:
            warnings.append(f"icons/{icon.name} is {len(text.encode())} bytes (style limit {ICON_LIMIT_BYTES})")
        if not re.search(r"<svg[^>]*viewBox=", text):
            errors.append(f"icons/{icon.name} has no viewBox")
        if re.search(r"<(script|image|text|style|foreignObject)\b|\bon\w+=", text):
            errors.append(f"icons/{icon.name} uses a disallowed element or handler (see icons/STYLE.md)")


def check_areas(areas: dict, by_id: dict, errors: list) -> None:
    for f in areas["features"]:
        pid = f.get("properties", {}).get("id") or f.get("id")
        if pid not in by_id:
            errors.append(f"areas: footprint for unknown place {pid}")


def main() -> int:
    errors, warnings = [], []
    by_id = check_places(load("places.json")["places"], errors)
    used = check_art(load("atlas-art.json"), by_id, errors, warnings)
    check_icons(used, errors, warnings)
    check_areas(load("areas.json"), by_id, errors)
    for w in warnings:
        print(f"warn  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(f"{len(by_id)} places, {len(used)} sticker icons: {len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())

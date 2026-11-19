"""Refresh icons/drafts/manifest.json draft lists from the files present in icons/drafts/."""

import json
import pathlib
import re

DRAFTS = pathlib.Path(__file__).resolve().parent.parent / "icons" / "drafts"
MANIFEST = DRAFTS / "manifest.json"


def version_key(name: str) -> list:
    return [int(part) if part.isdigit() else part for part in re.split(r"(\d+)", name)]


def main() -> None:
    try:
        manifest = json.loads(MANIFEST.read_text())
    except (OSError, json.JSONDecodeError) as err:
        raise SystemExit(f"cannot read {MANIFEST}: {err}") from err
    for item in manifest["items"]:
        files = sorted((p.name for p in DRAFTS.glob(f"{item['name']}.v*.svg")), key=version_key)
        item["drafts"] = files
        if item.get("status") != "picked":
            item["status"] = "drafted" if files else "todo"
    MANIFEST.write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n")
    print({item["name"]: len(item["drafts"]) for item in manifest["items"]})


if __name__ == "__main__":
    main()

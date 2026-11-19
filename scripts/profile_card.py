"""Write the GitHub profile README chart cards from the cached PR pull.

Usage: python3 scripts/profile_card.py [--out DIR]
Writes digital-home-{wide,compact}-{dark,light}.svg. The wide card fills a desktop profile; the compact card stays
legible at the ~308 px a phone gives the README image. No network calls: run refresh.py first if the cache is stale.
"""
import argparse
import datetime as dt
import math
from pathlib import Path

from refresh import ROOT, last_complete_month, report_data

REPORT_URL = "https://greguezono.github.io/digital-home/"
FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
THEMES = {
    "dark": {"bg": "#0d1117", "edge": "#30363d", "text": "#e6edf3", "muted": "#8b949e", "grid": "#21262d",
             "pre": "#4b5468", "bigger": "rgba(255,179,71,.05)", "more": "rgba(255,107,61,.08)"},
    "light": {"bg": "#ffffff", "edge": "#d0d7de", "text": "#1f2328", "muted": "#59636e", "grid": "#eaeef2",
              "pre": "#afb8c1", "bigger": "rgba(255,179,71,.08)", "more": "rgba(255,107,61,.10)"},
}
AI = "#e8912d"


def month_label(month):
    return dt.date.fromisoformat(month + "-15").strftime("%b '%y")


def size_color(additions):
    # same scale as the report: log of median lines added, capped at 400
    t = min(1, math.log10(max(additions, 1)) / math.log10(400))

    def lerp(a, b):
        return round(a + (b - a) * t)
    return f"rgb({lerp(122, 255)},{lerp(90, 107)},{lerp(42, 61)})"


def esc(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class Svg:
    def __init__(self, w, h, label):
        self.w, self.h, self.parts = w, h, []
        self.head = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
                     f'role="img" aria-label="{esc(label)}">\n<style>\n'
                     f'  text {{ font-family: {FONT}; }}\n'
                     '  .bar { transform-box: fill-box; transform-origin: bottom; '
                     'animation: grow .6s cubic-bezier(.2,.9,.3,1.2) backwards; }\n'
                     '  .fade { animation: fade .5s ease backwards; }\n'
                     '  @keyframes grow { from { transform: scaleY(0); } }\n'
                     '  @keyframes fade { from { opacity: 0; } }\n'
                     '  @media (prefers-reduced-motion: reduce) { .bar, .fade { animation: none; } }\n</style>\n'
                     '<defs>\n  <linearGradient id="hot" x1="0" y1="0" x2="1" y2="0">'
                     '<stop offset="0" stop-color="#d68c3c"/><stop offset="1" stop-color="#ff6b3d"/></linearGradient>\n</defs>\n')

    def add(self, tag, text=None, **attrs):
        a = " ".join(f'{k.rstrip("_").replace("_", "-")}="{v}"' for k, v in attrs.items())
        self.parts.append(f"<{tag} {a}>{esc(str(text))}</{tag}>" if text is not None else f"<{tag} {a}/>")

    def text(self, x, y, s, size, fill, anchor="start", weight=None, **extra):
        kw = {"x": f"{x:.1f}", "y": f"{y:.1f}", "fill": fill, "font_size": f"{size:.4g}", **extra}
        if weight:
            kw["font_weight"] = weight
        if anchor != "start":
            kw["text_anchor"] = anchor
        self.add("text", s, **kw)

    def render(self):
        return self.head + "".join(self.parts) + "\n</svg>\n"


def bars(svg, t, data, months, box, font, label_months, show_axis=True):
    """Monthly PR bars with the pre-AI baseline, the first-AI marker and the two phase bands."""
    left, top, right, bottom = box
    iw, ih = right - left, bottom - top
    first_ai = data["firstAiDate"][:7]
    phases, base = data["phases"], data["phases"]["baseline"]["prsPerMonth"]
    peak = max(m["prs"] for m in months)
    top_v = math.ceil((peak + 8) / 20) * 20
    slot = iw / len(months)
    bw = slot * 0.7

    def x_of(i):
        return left + i * slot + slot / 2

    def y_of(v):
        return bottom - v / top_v * ih
    idx = {m["month"]: i for i, m in enumerate(months)}

    for key, fill, row in (("bigger", t["bigger"], 0), ("more", t["more"], 1)):
        lo = idx.get(phases[key]["from"], 0) if phases[key]["from"] >= months[0]["month"] else 0
        hi = idx.get(phases[key]["to"], len(months) - 1)
        if phases[key]["to"] < months[0]["month"]:
            continue
        x1, x2 = left + lo * slot, left + (hi + 1) * slot
        svg.add("rect", x=f"{x1:.1f}", y=f"{top:.1f}", width=f"{x2 - x1:.1f}", height=f"{ih:.1f}", fill=fill)
        svg.text(x1 + font * .5, top + font * (1.2 + 1.15 * row), "Bigger PRs" if key == "bigger" else "More PRs",
                 font * .85, t["muted"])
    if show_axis:
        for v in range(0, top_v + 1, 20 if top_v <= 120 else 40):
            if abs(v - base) < top_v * .06:
                continue
            svg.add("line", x1=left, x2=right, y1=f"{y_of(v):.1f}", y2=f"{y_of(v):.1f}", stroke=t["grid"],
                    stroke_dasharray="2 4")
            svg.text(left - 8, y_of(v) + font * .3, v, font * .85, t["muted"], "end")

    last = len(months) - 1
    for i, m in enumerate(months):
        ai = m["month"] >= first_ai
        h = m["prs"] / top_v * ih
        extra = {"opacity": "0.6"} if i == last and m.get("partial") else {}
        svg.add("rect", class_="bar", style=f"animation-delay:{.2 + i * .03:.2f}s", x=f"{x_of(i) - bw / 2:.1f}",
                y=f"{bottom - h:.1f}", width=f"{bw:.1f}", height=f"{max(h, .5):.1f}", rx="1.5",
                fill=size_color(m["medianAdditions"]) if ai else t["pre"], **extra)
        if m["month"] in label_months:
            svg.text(x_of(i), bottom - h - font * .4, m["prs"], font * .9, t["text"] if ai else t["muted"], "middle",
                     700 if ai else 500, class_="fade", style=f"animation-delay:{.6 + i * .03:.2f}s")

    svg.add("line", x1=left, x2=right, y1=f"{y_of(base):.1f}", y2=f"{y_of(base):.1f}", stroke=t["muted"],
            stroke_dasharray="5 4")
    if show_axis:
        svg.text(left - 8, y_of(base) + font * .3, base, font * .85, t["text"], "end")
    if first_ai in idx:
        ax = left + idx[first_ai] * slot
        svg.add("line", x1=f"{ax:.1f}", x2=f"{ax:.1f}", y1=f"{top - font * 1.0:.1f}", y2=bottom, stroke=AI,
                stroke_dasharray="3 3", stroke_width="1.5")
    return x_of, idx


def wide(data, t):
    months, first_ai = data["monthly"], data["firstAiDate"][:7]
    base, post = data["phases"]["baseline"]["prsPerMonth"], data["phases"]["post"]["prsPerMonth"]
    end = month_label(data["seriesEnd"]).upper().replace("'", "20")
    svg = Svg(880, 400, f"Pull requests opened per month, Nov 2023 to {month_label(data['seriesEnd'])}. Monthly PRs "
                        f"rose from about {base} to {post} after the first Claude commit on {data['firstAiDate']}.")
    svg.add("rect", x="0.5", y="0.5", width="879", height="399", rx="12", fill=t["bg"], stroke=t["edge"])
    svg.text(32, 38, f"GITHUB OUTPUT · GREGUEZONO · NOV 2023 – {end}", 11, AI, weight=700, letter_spacing="1.6")
    svg.text(32, 64, "Every month, every PR", 20, t["text"], weight=700)
    labels = {m["month"] for m in months}
    x_of, idx = bars(svg, t, data, months, (56, 84, 856, 318), 10.5, labels)
    ax = 56 + idx[first_ai] * (800 / len(months))
    svg.text(ax - 6, 78, f"{data['firstAiDate']} · first Claude commit", 10.5, AI, "end")
    for i, m in enumerate(months):
        if m["month"].endswith("-01") and abs(i - idx[first_ai]) > 2 and len(months) - 1 - i > 2 \
                or m["month"] == first_ai or i == len(months) - 1:
            svg.text(x_of(i), 336, month_label(m["month"]), 10, AI if m["month"] == first_ai else t["muted"], "middle")
    svg.add("rect", x="32", y="369", width="10", height="10", rx="2", fill=t["pre"])
    svg.text(48, 378, "Pre-AI", 11, t["muted"])
    svg.add("rect", x="102", y="369", width="10", height="10", rx="2", fill="url(#hot)")
    svg.text(118, 378, "Post-AI, colored by median lines added", 11, t["muted"])
    svg.text(352, 378, f"- - - pre-AI baseline: {base} PRs/mo", 11, t["muted"])
    svg.text(848, 378, "Click for the full report →", 11, AI, "end")
    return svg.render()


def compact(data, t):
    """Phone card: a big multiplier and the last 18 months, with text ≥ 22 units so it reads at 308 px wide."""
    first_ai = data["firstAiDate"][:7]
    months = data["monthly"][-18:]
    base, post = data["phases"]["baseline"]["prsPerMonth"], data["phases"]["post"]["prsPerMonth"]
    x = data["multiplier"]["prsPerMonth"]
    svg = Svg(600, 600, f"Pull requests per month: {x}× since the first Claude commit on {data['firstAiDate']}, "
                        f"from {base} to {post} a month.")
    svg.add("rect", x="1", y="1", width="598", height="598", rx="20", fill=t["bg"], stroke=t["edge"], stroke_width="2")
    svg.text(36, 62, "GITHUB OUTPUT · GREGUEZONO", 22, AI, weight=700, letter_spacing="2")
    svg.text(36, 150, f"{x}×", 84, t["text"], weight=800)
    w = 84 * .6 * len(f"{x}×") + 18
    svg.text(36 + w, 116, "PRs a month since", 24, t["muted"])
    svg.text(36 + w, 148, "my first Claude commit", 24, t["muted"])
    peak = max(months, key=lambda m: m["prs"])["month"]
    labels = {first_ai, peak, months[-1]["month"]}
    x_of, idx = bars(svg, t, data, months, (36, 238, 564, 470), 26, labels, show_axis=False)
    svg.text(36, 200, f"from {base} to {post} PRs/mo · last 18 months", 22, t["muted"])
    for m in (months[0]["month"], first_ai, months[-1]["month"]):
        if m in idx:
            i = idx[m]
            anchor = "start" if i == 0 else "end" if i == len(months) - 1 else "middle"
            xx = 36 if anchor == "start" else 564 if anchor == "end" else x_of(i)
            svg.text(xx, 506, month_label(m), 22, AI if m == first_ai else t["muted"], anchor)
    svg.text(300, 566, "Tap for the full report →", 24, AI, "middle", 600)
    return svg.render()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=ROOT.parent / "greguezono" / "assets")
    args = parser.parse_args()
    data = report_data(last_complete_month(dt.date.today()))
    args.out.mkdir(parents=True, exist_ok=True)
    for name, t in THEMES.items():
        for kind, render in (("wide", wide), ("compact", compact)):
            path = args.out / f"digital-home-{kind}-{name}.svg"
            path.write_text(render(data, t))
            print(path)


if __name__ == "__main__":
    main()

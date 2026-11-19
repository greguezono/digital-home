# Atlas sticker style

Stickers are hand-drawn-looking flat SVGs that sit on a cream paper map with a pale-blue sea. Each one must read at about 30–50 px on screen; `atlas-art.json` sets the width and the map scales it up to `maxScale` when zoomed in.

## Hard rules

- One `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H">`, with no `width`, `height`, `<style>`, `<text>`, `<image>`, gradients, filters, masks or external references. The atlas injects `width` itself.
- Use a viewBox about 60–150 wide and 50–110 tall, with integer coordinates where possible. Leave 2 units of padding so strokes are not clipped.
- Wrap the drawing in `<g stroke="#2b2733" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">`. Override `stroke-width` per element: about 1.0–1.6 for detail lines, about 2.4–3 for emphasis.
- The ink outline (`#2b2733`) goes on every filled shape. Water, sky and ground bands may be fill-only, with an ink line on their top edge.
- Keep files under 4 KB and use path shorthand (relative `q`/`l`, `M…Z`). No editor metadata.
- The subject must read as a silhouette at 32 px wide: a few bold shapes first, then at most 3–6 detail strokes. If a detail disappears at 32 px, drop it.
- Use flat fills only; fake depth with a lighter or darker second shape or a few hatch strokes at `opacity=".45"`–`.6`.

## Palette (used across the existing set)

| Role | Colours |
|---|---|
| Ink / dark rock | `#2b2733`, `#3b3640`, `#5d5a66`, `#7d6a5c` |
| Paper / snow / foam / cloud | `#fbf4e2`, `#ffffff`, `#e9dcc0` |
| Sea / sky / water | `#9fd3ec` (sea band), `#3f8fc4` (wave), `#1d6fa5` (deep), `#7fc9c2` (lagoon/turquoise) |
| Greens | `#acd88a`, `#a8d9a0`, `#6e9f48`, `#2f9d62`, `#3f8f7a` |
| Warm accents | `#d9573b` / `#c84a2f` (red), `#f6d26b` / `#f8dd8c` (gold), `#f4ae7f` (peach), `#f2a3b3` (pink) |
| Wood / earth / stone | `#a9783f`, `#8a5a3a`, `#c38a62`, `#e9c98f`, `#c9b79a`, `#b8a98a` |
| Lilac / slate | `#c3b0e6`, `#9a95a6`, `#c9d4e0` |

Add a new colour only when the subject demands it, such as Kinkaku-ji gold leaf (`#e8b23a`) or Flex lime (`#d4ee3a`).

## Composition

- Ground the subject: most stickers sit on a short band of sea (`#9fd3ec` plus a 1.6 ink top line plus 1–2 white `q` wave ticks) or ground. The map anchors the sticker at its bottom-centre by default (`anchor [0.5, 1]`).
- Draw a landmark from its most recognisable angle. Prefer a 3/4 or straight-on elevation; never draw a top-down view.
- Small life details sell it: a palm, a boat, a gull (`#fbf4e2` cloud-like strokes), a person as a 4-stroke stick figure.
- Do not add text or lettering. The map shows names separately.

## Workflow

1. Drafts go in `icons/drafts/<name>.v1.svg`, `<name>.v2.svg` and so on. Never overwrite `icons/<name>.svg` directly.
2. Reference photos live in `icons/refs/<name>.(png|jpg)` and are not shipped by the site.
3. Register each draft in `icons/drafts/manifest.json` (see its schema) so `studio.html` shows it next to its reference and the current icon.
4. Render the studio and check every draft at 32 px and 96 px before handing it over.
5. Greg picks, e.g. `osaka v2`. The pick is copied to `icons/<name>.svg` and `atlas-art.json` is updated.

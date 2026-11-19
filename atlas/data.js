import {$, badge} from './core.js';

const [{title, quote, places}, countries, areas, art] = await Promise.all(['places.json','countries.json','areas.json','atlas-art.json'].map(u => fetch(u).then(r => r.json())));
const byId = new Map(places.map(p => [p.id, p])), areaById = new Map(areas.features.map(f => [f.properties.id, f]));

// ---------- art framework: atlas-art.json + icons/*.svg ----------
// group   = places listed together offshore, joined to their real locations by dotted leaders
// sticker = an icon pinned to one place or one group; offset is in screen px at world zoom
const catOf = g => g.cat ?? 'surfed';
const problems = [], groupById = new Map(), groupOf = new Map();
for (const g of art.groups) {
  groupById.set(g.id, g);
  g.places = g.places.filter(id => byId.has(id) || problems.push(`group ${g.id}: unknown place ${id}`) && false);
  if (g.list !== false) for (const id of g.places) groupOf.has(id) ? problems.push(`place ${id} is in ${groupOf.get(id).id} and ${g.id}`) : groupOf.set(id, g);
}
const stickers = art.stickers.filter(s => (s.place ? byId.has(s.place) : groupById.has(s.group)) || problems.push(`sticker ${s.icon}: needs a known place or group`) && false);
const svgs = Object.fromEntries(await Promise.all([...new Set(stickers.map(s => s.icon))].map(async n => {
  const r = await fetch(`icons/${n}.svg`); if (!r.ok) problems.push(`missing icons/${n}.svg`); return [n, r.ok ? await r.text() : ''];
})));
if (problems.length) console.warn('atlas-art.json:', problems);
const centroid = ids => ids.map(i => byId.get(i).coordinates).reduce((a, c, _, l) => [a[0] + c[0] / l.length, a[1] + c[1] / l.length], [0, 0]);
const aspectOf = svg => { const v = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 1 1').split(/[\s,]+/).map(Number); return v[3] / v[2]; };
const anchorOf = s => s.at ?? (s.place ? byId.get(s.place).coordinates : centroid(groupById.get(s.group).places));
const stickerOn = s => [...(s.place ? [s.place] : groupById.get(s.group).places), ...(s.alsoPlaces ?? [])].some(id => byId.has(id) && badge(byId.get(id)));

$('#title h1').innerHTML = title.replace(/^(.*?(?:Places|’s))/i, '<span>$1</span>');
$('#quote').textContent = `“${quote}”`;
$('#stats').innerHTML = `<b>${new Set(places.map(p => p.country)).size}</b> countries · <b>${places.length}</b> places · <b>${places.filter(p => p.categories.includes('surfed')).length}</b> surf spots`;

export {anchorOf, areaById, art, aspectOf, byId, catOf, countries, groupById, groupOf, places, problems, stickerOn, stickers, svgs, title};

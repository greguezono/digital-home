import {add, badge, clamp, enabled} from './core.js';
import {anchorOf, aspectOf, countries, groupOf, places, stickerOn, stickers, svgs} from './data.js';
import {map, proj} from './map.js';

const countryEls = countries.features.map(f => { const p = f.properties, h = [...p.country].reduce((a, c) => a + c.charCodeAt(0), 0);
  return {p, e:add('cname', p.label), rot:((h % 9) - 4) * 1.2}; });
const stickerEls = stickers.filter(s => svgs[s.icon]).map(s => ({s, at:anchorOf(s), ar:aspectOf(svgs[s.icon]), dx:0, dy:0, mul:1, e:add('doodle', svgs[s.icon].replace('<svg', `<svg width="${s.width}"`), s.place ? {id:s.place, tip:s.label} : {group:s.group, tip:s.label})}));

// ---------- zoom tiers + sticker declutter ----------
// world (below text): stickers, pins and spot icons only, no text; text: country names and offshore lists;
// world (below region): every sticker, no place names; region: place names and offshore lists; city: pins and spot names, lists hidden
// list:false group stickers stand in for their members' pins until TIER.cover
const TIER = {text:3, textPhone:1.6, region:4, names:4.5, cover:5.2, city:7.5};
// the offset nudges stickers clear of pins at world zoom and eases to 0 by zoom 4, so the sticker then sits on its real location
// size grows with the map, capped at maxScale × width so it never swallows a city view
// sideBy stickers keep their offset at every zoom so they sit beside a lived home instead of under it
function stickerBase({s, at}, z, phone) {
  const k = s.sideBy ? 1 : clamp((4 - z) / 2.5, 0, 1), a = proj(at);
  return {x:a.x + s.offset[0] * k, y:a.y + s.offset[1] * k, sc:clamp(2 ** ((z - map.getMinZoom()) * .75), 1, s.maxScale ?? 3.5) * (phone ? .75 : 1)};
}
// greedy screen-space placement, recomputed per quarter zoom step: stickers with a minZoom (dense spots such as Greece or Puglia),
// and every sticker from region zoom on, take the nearest free slot clear of pins, homes, place names and earlier stickers;
// at world zoom one that cannot fit shrinks, and any sticker moved off its spot gets a dotted leader back to it
let clutterKey = null;
const rings = rs => [[0, 0], ...rs.flatMap(r => [0, 1, 2, 3, 4, 5, 6, 7].map(i => [r * Math.cos(i * Math.PI / 4 + Math.PI / 2), r * Math.sin(i * Math.PI / 4 + Math.PI / 2)]))];
const NEAR = rings([.45, .8]), FAR = rings([.45, .8, 1.2]);
function declutter(z, phone, isHome) {
  const zq = Math.round(z * 4) / 4, key = `${zq}|${[...enabled]}|${phone}`;
  if (key === clutterKey) return; clutterKey = key;
  const world = zq < TIER.region, boxes = [], free = r => !boxes.some(b => r.l < b.r && b.l < r.r && r.t < b.b && b.t < r.b);
  for (const p of places) {
    const b = badge(p); if (!b) continue;
    const s = proj(p.coordinates);
    if (b === 'lived' && isHome(p.id)) boxes.push({l:s.x - 20, r:s.x + 40, t:s.y - 52, b:s.y + 8});
    else if (groupOf.has(p.id)) boxes.push({l:s.x - 8, r:s.x + 8, t:s.y - 12, b:s.y + 5});
    else { boxes.push({l:s.x - 8, r:s.x + 8, t:s.y - 22, b:s.y}); if (!world) boxes.push({l:s.x + 9, r:s.x + 12 + p.name.length * 7, t:s.y - 15, b:s.y + 4}); }
  }
  const order = stickerEls.filter(o => stickerOn(o.s)).sort((a, b) => (a.s.minZoom ?? 0) - (b.s.minZoom ?? 0));
  for (const o of stickerEls) o.dx = o.dy = 0, o.mul = 1;
  for (const o of order) {
    const {s} = o, {x, y, sc} = stickerBase(o, zq, phone), [ax, ay] = s.anchor ?? [.5, 1];
    const box = (dx, dy, m) => { const w = s.width * sc * m, h = w * o.ar, l = x + dx - ax * w, t = y + dy - ay * h; return {l, r:l + w, t, b:t + h}; };
    let slot = [0, 0, 1];
    if (!s.sideBy && (s.minZoom || !world)) {
      const size = Math.max(s.width * sc, s.width * sc * o.ar), tries = [];
      // at world zoom shrink before wandering far, so a crowded region stays near its spot
      for (const m of world ? [1, .75, .55] : [1, .8]) for (const [u, v] of world ? NEAR : FAR) tries.push([u * size * m, v * size * m, m]);
      slot = tries.find(([dx, dy, m]) => free(box(dx, dy, m))) ?? (world ? [0, 0, .55] : [0, 0, .8]);
    }
    [o.dx, o.dy, o.mul] = slot; boxes.push(box(...slot));
  }
}

export {TIER, countryEls, declutter, stickerBase, stickerEls};

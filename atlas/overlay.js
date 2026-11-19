import {$, CAT, add, badge, clamp, esc, icon, place, priority, show, state} from './core.js';
import {art, byId, catOf, groupById, groupOf, places, stickerOn} from './data.js';
import {map, phoneQ, proj} from './map.js';
import {TIER, countryEls, declutter, stickerBase, stickerEls} from './stickers.js';
import {PHONE_LIST_ZOOM, homeEls, layoutJourney} from './journey.js';

const pinEls = new Map(places.map(p => [p.id, add('pin', `<svg></svg><span class="badge"></span><span class="lbl">${p.name}</span>`, {id:p.id})]));
const spotEls = new Map([...groupOf.keys()].map(id => [id, add('spot', `<i></i><span class="lbl">${esc(byId.get(id).name)}</span>`, {id})]));
const groupEls = art.groups.filter(g => g.list !== false).map(g => ({g, ids:[], e:add(`list ${g.align}`, ''), b:add('gbadge', '', {group:g.id, list:'1'})}));
function renderGroups() {
  for (const o of groupEls) {
    o.ids = o.g.places.filter(id => badge(byId.get(id)));
    o.e.innerHTML = o.ids.length ? `<h4>${esc(o.g.title)}</h4>` + o.ids.map(id => { const i = icon[badge(byId.get(id))](15), n = esc(byId.get(id).name); return `<span class="row" data-id="${id}">${o.g.align === 'left' ? i + n : n + i}</span>`; }).join('') : '';
    o.e._w = o.e._h = o.b._w = o.b._h = undefined;
    o.b.innerHTML = o.ids.length ? `${icon[catOf(o.g)](16)}${esc(o.g.title)}<b style="color:${CAT[catOf(o.g)].color}">${o.ids.length}</b>` : '';
  }
}
// screen-space bounding box of a group's places, so its list stays offshore at any zoom
const boxOf = ids => ids.map(id => proj(byId.get(id).coordinates)).reduce((b, p) => ({l:Math.min(b.l, p.x), r:Math.max(b.r, p.x), t:Math.min(b.t, p.y), btm:Math.max(b.btm, p.y)}), {l:Infinity, r:-Infinity, t:Infinity, btm:-Infinity});


function layout() {
  const z = map.getZoom(), w = innerWidth, h = innerHeight, phone = phoneQ.matches, ppd = 512 * 2 ** z / 360, off = (pt, m = 80) => pt.x < -m || pt.y < -m || pt.x > w + m || pt.y > h + m;
  document.body.classList.toggle('zoomed', z >= TIER.names); document.body.classList.toggle('zoomed-hi', z >= TIER.city);
  for (const {p, e, rot} of countryEls) {
    const fs = clamp(p.w * ppd * .4, 0, 46), pt = proj([p.lx, p.ly]), on = state.active.has(p.country) && fs >= 9 && z >= TIER.text && z < 5.5 && !off(pt);
    show(e, on); if (on) { e.style.fontSize = fs + 'px'; place(e, pt.x, pt.y, ` translate(-50%,-50%) rotate(${rot}deg)`); }
  }
  const coveredIds = new Set(); let sl = '';
  declutter(z, phone, id => homeEls.has(id));
  for (const o of stickerEls) {
    const {s, e} = o, {x: bx, y: by, sc: bsc} = stickerBase(o, z, phone), x = bx + o.dx, y = by + o.dy, sc = bsc * o.mul;
    const on = stickerOn(s) && !off({x, y}, s.width * sc + 40);
    show(e, on);
    // below city zoom a sticker-only group's sticker stands in for its members' pins and cluster badge
    if (on && s.group && groupById.get(s.group).list === false && z < TIER.cover) groupById.get(s.group).places.forEach(id => coveredIds.add(id));
    if (!on) continue;
    const [ax, ay] = s.anchor ?? [.5, 1]; e.style.transformOrigin = `${ax * 100}% ${ay * 100}%`; place(e, x, y, ` translate(${-ax * 100}%,${-ay * 100}%) scale(${sc})`);
    if (Math.hypot(o.dx, o.dy) > 14) { const a = proj(o.at); sl += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}`; }
  }
  $('#slead').setAttribute('d', sl);
  // greedy screen-space clustering for lived + visited pins
  layoutJourney(z, off);
  const pts = places.filter(p => badge(p) && !groupOf.has(p.id) && !coveredIds.has(p.id) && !(homeEls.has(p.id) && badge(p) === 'lived')).map(p => ({p, s:proj(p.coordinates)})).filter(o => !off(o.s, 40))
    .sort((a, b) => priority.indexOf(badge(a.p)) - priority.indexOf(badge(b.p)));
  state.clusters = new Map(); const lead = [];
  for (const o of pts) { const c = z < 11 && lead.find(c => Math.hypot(c.s.x - o.s.x, c.s.y - o.s.y) < 24); if (c) state.clusters.get(c.p.id).push(o.p); else { lead.push(o); state.clusters.set(o.p.id, [o.p]); } }
  for (const [id, e] of pinEls) {
    const m = state.clusters.get(id); show(e, !!m); if (!m) continue;
    const p = byId.get(id), b = badge(p), s = proj(p.coordinates); place(e, s.x, s.y);
    e.classList.toggle('cluster', m.length > 1); e.classList.toggle('sel', id === state.selected);
    if (m.length > 1) { const tally = k => m.filter(q => badge(q) === k).length; e.style.setProperty('--ring', tally('lived') >= tally('visited') ? CAT.lived.color : CAT.visited.color); e.querySelector('.badge').textContent = m.length; }
    else if (e.dataset.cat !== b) { e.dataset.cat = b; e.querySelector('svg').outerHTML = icon[b](b === 'lived' ? 22 : 22); }
  }
  // grouped places: small icon at the real spot, offshore list, dotted leaders
  let d = '', ds2 = '';
  for (const [id, e] of spotEls) {
    const b = badge(byId.get(id)), s = proj(byId.get(id).coordinates); show(e, b && !off(s)); if (!b) continue;
    if (e.dataset.cat !== b) { e.dataset.cat = b; e.firstElementChild.outerHTML = icon[b](17); }
    e.classList.toggle('sel', id === state.selected); place(e, s.x, s.y);
  }
  const badgeBoxes = [];
  for (const {g, ids, e, b} of groupEls) {
    // on a phone, below city zoom, a list collapses to a tappable badge so it never runs off-screen
    // at the very widest zoom badges would pile up, so only the spots and leaders remain
    const asBadge = phone && z < PHONE_LIST_ZOOM && z >= (g.minZoom ?? 0), badgeRoom = z >= map.getMinZoom() + .7;
    if (!ids.length || !asBadge) show(b, false);
    if (!ids.length) { show(e, false); continue; }
    const k = phone ? .5 : 1, bx = boxOf(ids), a = {x:(g.align === 'right' ? bx.l : bx.r) + g.offset[0] * k, y:(bx.t + bx.btm) / 2 + g.offset[1] * k};
    if (asBadge) {
      show(e, false); const on = badgeRoom && !off(a, 120); b.style.display = on ? 'block' : 'none'; if (!on) continue;
      b._w ??= b.offsetWidth; b._h ??= b.offsetHeight;
      const x = clamp(g.align === 'right' ? a.x - b._w : a.x, 6, w - b._w - 6), lx = g.align === 'right' ? x + b._w : x;
      // nudge down past any badge already placed, so neighbours like Noronha and the Maldives never overlap
      let y = a.y - b._h / 2, hit;
      while ((hit = badgeBoxes.find(r => x < r.x + r.w + 4 && r.x < x + b._w + 4 && y < r.y + r.h + 4 && r.y < y + b._h + 4))) y = hit.y + hit.h + 4;
      badgeBoxes.push({x, y, w:b._w, h:b._h});
      place(b, x, y); b.classList.toggle('sel', ids.includes(state.selected));
      for (const id of ids) { const s = proj(byId.get(id).coordinates), seg = `M${lx.toFixed(1)} ${(y + b._h / 2).toFixed(1)}L${s.x.toFixed(1)} ${s.y.toFixed(1)}`; d += seg; if (id === state.selected) ds2 += seg; }
      continue;
    }
    const on = z >= TIER.text && z < TIER.city && z >= (g.minZoom ?? 0) && !off(a, 260); show(e, on); if (!on) continue;
    e._w ??= e.offsetWidth; a.y -= (e._h ??= e.offsetHeight) / 2; let x = g.align === 'right' ? a.x - e._w : a.x;
    if (phone) { x = clamp(x, 6, w - e._w - 6); a.x = g.align === 'right' ? x + e._w : x; }
    place(e, x, a.y);
    for (const r of e.querySelectorAll('.row')) {
      r._y ??= r.offsetTop + r.offsetHeight / 2; r._w ??= r.offsetWidth;
      const s = proj(byId.get(r.dataset.id).coordinates), lx = g.align === 'right' ? a.x + 3 : a.x - 3, ly = a.y + r._y;
      const seg = `M${lx.toFixed(1)} ${ly.toFixed(1)}L${s.x.toFixed(1)} ${s.y.toFixed(1)}`; d += seg; if (r.dataset.id === state.selected) ds2 += seg;
      r.classList.toggle('sel', r.dataset.id === state.selected);
    }
  }
  $('#lead').setAttribute('d', d); $('#leadsel').setAttribute('d', ds2);
}

export {layout, renderGroups};

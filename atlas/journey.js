import {$, HOME, add, enabled, place, show, state} from './core.js';
import {art, byId, problems} from './data.js';
import {map, mercY, proj} from './map.js';
// overlay elements stack in creation order: country names and stickers must exist before the homes
import './stickers.js';

const journey = (art.journey?.places ?? []).filter(id => byId.get(id)?.categories.includes('lived') || problems.push(`journey: ${id} is not a lived place`) && false);
const homeEls = new Map([...new Set(journey)].map(id => [id, add('home', `${HOME(40)}<span class="no"></span><span class="lbl"></span>`, {id})]));
const homeOf = new Map();

// ---------- lived journey: numbered homes joined in order by a dotted trail ----------
// a place lived in more than once, or homes closer than HOME_GAP px, share one house whose tag lists every stop, e.g. "3·5·7·13"
const HOME_GAP = 30, PHONE_LIST_ZOOM = 4.5;
function layoutJourney(z, off) {
  const on = enabled.has('lived'), stops = [];
  homeOf.clear();
  for (const [i, id] of journey.entries()) {
    const seen = homeOf.has(id) && stops.find(h => h.id === homeOf.get(id));
    if (seen) { seen.nos.push(i + 1); continue; }
    const s = proj(byId.get(id).coordinates), host = z < 11 && stops.find(h => Math.hypot(h.s.x - s.x, h.s.y - s.y) < HOME_GAP);
    if (host) { host.nos.push(i + 1); host.ids.push(id); homeOf.set(id, host.id); } else { stops.push({id, s, nos:[i + 1], ids:[id]}); homeOf.set(id, id); }
  }
  const hosts = new Map(stops.map(h => [h.id, h]));
  for (const [id, e] of homeEls) {
    const h = on && hosts.get(id); show(e, !!h && !off(h.s, 60)); if (!h) continue;
    place(e, h.s.x, h.s.y); e.classList.toggle('sel', h.ids.includes(state.selected)); e.dataset.multi = h.ids.length > 1 ? '1' : '';
    e.querySelector('.no').textContent = h.nos.join('·'); e.querySelector('.lbl').textContent = h.ids.map(i => byId.get(i).name).join(' · ');
  }
  const trail = on ? journey.map(id => hosts.get(homeOf.get(id))).filter((h, i, a) => h !== a[i - 1]).map(h => h.id) : [], zq = Math.round(z * 20) / 20, key = trail.join() + '@' + zq;
  if (key !== trailKey) { trailKey = key; trailLegs = journeyLegs(trail, 140 / (512 * 2 ** zq)); map.getSource('journey')?.setData({type:'Feature', properties:{}, geometry:{type:'MultiLineString', coordinates:trailLegs.map(l => l.line)}}); }
  // arrowhead at each leg's curve midpoint, pointing along the travel direction; the tangent there is parallel to a→b
  let arrows = '';
  const c = map.getCenter().lng, shift = 360 * Math.round((c - (trailLegs[0]?.a[0] ?? c)) / 360), pr = ll => map.project([ll[0] + shift, ll[1]]), f = n => n.toFixed(1);
  for (const {a: la, b: lb, mid} of trailLegs) {
    const a = pr(la), b = pr(lb), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    if (len < 60) continue;
    const m = pr(mid), ux = dx / len, uy = dy / len;
    arrows += `M${f(m.x + ux * 7)} ${f(m.y + uy * 7)}L${f(m.x - ux * 5 - uy * 5.5)} ${f(m.y - uy * 5 + ux * 5.5)}L${f(m.x - ux * 5 + uy * 5.5)} ${f(m.y - uy * 5 - ux * 5.5)}Z`;
  }
  $('#jarrows').setAttribute('d', arrows);
}
// the trail is a MapLibre line layer (a DOM dashed path millions of px long made zooming crawl);
// legs bend to the left of travel by a fifth of their length, capped at 140 screen px (so legs are rebuilt as zoom changes),
// as quadratic curves sampled in Mercator space
let trailKey = null, trailLegs = [];
const toMerc = ([lng, lat]) => [lng / 360, mercY(lat)], fromMerc = ([x, y]) => [x * 360, 360 / Math.PI * Math.atan(Math.exp((.5 - y) * 2 * Math.PI)) - 90];
function journeyLegs(ids, maxBend) {
  // unwrap longitudes stop-to-stop so each leg takes the short way, not around the far side of the world
  let lng = 0;
  const pts = ids.map((id, i) => { const [x, y] = byId.get(id).coordinates; lng = i ? x + 360 * Math.round((lng - x) / 360) : x; return [lng, y]; });
  return pts.slice(1).map((b, i) => {
    const a = pts[i], [ax, ay] = toMerc(a), [bx, by] = toMerc(b), dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    const bend = Math.min(.2 * len, maxBend), cx = (ax + bx) / 2 - dy / len * bend, cy = (ay + by) / 2 + dx / len * bend, at = t => fromMerc([(1 - t) ** 2 * ax + 2 * t * (1 - t) * cx + t * t * bx, (1 - t) ** 2 * ay + 2 * t * (1 - t) * cy + t * t * by]);
    return {a, b, mid:at(.5), line:Array.from({length:49}, (_, k) => at(k / 48))};
  });
}


const resetTrail = () => { trailKey = null; };

export {PHONE_LIST_ZOOM, homeEls, homeOf, layoutJourney, resetTrail};

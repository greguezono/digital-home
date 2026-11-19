import {$, CAT, EDGE, HOME, INK, PALETTE, badge, el, enabled, icon, ov, priority, state} from './core.js';
import {areaById, byId, catOf, countries, groupById, places, title} from './data.js';
import {LAT_BOT, LAT_TOP, coarse, map, mapLoaded, syncPhone} from './map.js';
import {homeEls, homeOf, resetTrail} from './journey.js';
import {layout, renderGroups} from './overlay.js';

// ---------- data-driven layers ----------
function refresh() {
  const visible = places.filter(badge);
  renderGroups();
  state.active = new Set(visible.map(p => p.country));
  map.getSource('areas')?.setData({type:'FeatureCollection', features:visible.filter(p => areaById.has(p.id) && !['surfed','skied'].includes(badge(p))).map(p => ({...areaById.get(p.id), properties:{...areaById.get(p.id).properties, cat:badge(p)}}))});
  if (map.getLayer('country-paint')) for (const l of ['country-paint','country-edge']) map.setFilter(l, ['in',['get','country'],['literal',[...state.active]]]);
  if (state.selected && !badge(byId.get(state.selected))) pick('');
  layout();
}
mapLoaded.then(async () => {
  map.addSource('countries', {type:'geojson', data:countries});
  const pal = (obj) => ['match',['get','c'],...Object.entries(obj).flatMap(([k, v]) => [+k, v]),'#f6d26b'];
  map.addLayer({id:'country-paint', type:'fill', source:'countries', paint:{'fill-color':pal(PALETTE), 'fill-opacity':.92}}, 'state-lines');
  map.addLayer({id:'country-edge', type:'line', source:'countries', paint:{'line-color':pal(EDGE), 'line-width':['interpolate',['linear'],['zoom'],1,4,6,14], 'line-blur':['interpolate',['linear'],['zoom'],1,3,6,10], 'line-opacity':.55}}, 'state-lines');
  map.addSource('areas', {type:'geojson', data:{type:'FeatureCollection', features:[]}});
  map.addLayer({id:'area-fill', type:'fill', source:'areas', paint:{'fill-pattern':['concat','hatch-',['get','cat']], 'fill-opacity':['interpolate',['linear'],['zoom'],2,.75,8,.6,12,.35]}}, 'water');
  map.addLayer({id:'area-wash', type:'fill', source:'areas', filter:['!=',['get','scale'],'region'], paint:{'fill-color':['match',['get','cat'],'lived','#f39a5b','#7fcf8f'], 'fill-opacity':.35}}, 'area-fill');
  map.addLayer({id:'area-line', type:'line', source:'areas', paint:{'line-color':['match',['get','cat'],'lived','#b8461d','#226b44'], 'line-width':['case',['==',['get','scale'],'region'],1.2,1.8], 'line-dasharray':[2,1.5], 'line-opacity':.9}}, 'water');
  const lat = [85.0511, LAT_TOP, LAT_BOT, -85.0511], ring = (a, b) => [[-180, a], [180, a], [180, b], [-180, b], [-180, a]];
  map.addSource('band', {type:'geojson', data:{type:'FeatureCollection', features:[
    {type:'Feature', properties:{}, geometry:{type:'MultiPolygon', coordinates:[[ring(lat[0], lat[1])], [ring(lat[2], lat[3])]]}},
    {type:'Feature', properties:{}, geometry:{type:'MultiLineString', coordinates:[[[-180, LAT_TOP], [180, LAT_TOP]], [[-180, LAT_BOT], [180, LAT_BOT]]]}}]}});
  map.addLayer({id:'band-sea', type:'fill', source:'band', filter:['==',['geometry-type'],'Polygon'], paint:{'fill-pattern':'ocean'}});
  map.addLayer({id:'band-edge', type:'line', source:'band', filter:['==',['geometry-type'],'LineString'], paint:{'line-color':INK, 'line-width':1.4, 'line-dasharray':[4,3], 'line-opacity':.55}});
  map.addSource('journey', {type:'geojson', data:{type:'FeatureCollection', features:[]}});
  map.addLayer({id:'journey-under', type:'line', source:'journey', layout:{'line-cap':'round', 'line-join':'round'}, paint:{'line-color':'#fbf4e2', 'line-width':5.5, 'line-opacity':.75}});
  map.addLayer({id:'journey', type:'line', source:'journey', layout:{'line-cap':'round', 'line-join':'round'}, paint:{'line-color':'#d9573b', 'line-width':3, 'line-dasharray':[0, 7 / 3]}});
  resetTrail();
  syncPhone();
  await document.fonts.ready; refresh(); document.body.dataset.ready = '1';
  if (window.top !== window) parent.postMessage('atlas-ready', '*');
  if (location.hash && byId.has(decodeURIComponent(location.hash.slice(1)))) pick(decodeURIComponent(location.hash.slice(1)), true);
});
map.on('render', layout);

// ---------- legend toggles ----------
for (const k of ['lived','visited','surfed','skied']) {
  const b = el('button', {}, `<span class="box"></span>${k === 'lived' ? HOME(24) : icon[k](22)}<span>${CAT[k].label}</span><b>${places.filter(p => p.categories.includes(k)).length}</b>`);
  b.style.setProperty('--tint', CAT[k].color); b.setAttribute('aria-pressed', 'true');
  b.onclick = () => { enabled.has(k) ? enabled.delete(k) : enabled.add(k); b.setAttribute('aria-pressed', String(enabled.has(k))); refresh(); };
  $('#toggles').append(b);
}

// ---------- cards ----------
const card = $('#card'), safePad = () => innerWidth <= 700 ? {top:150, bottom:innerHeight * .55, left:30, right:30} : {top:80, bottom:80, left:360, right:380};
function bboxOf(coords) { const b = new maplibregl.LngLatBounds(); coords.forEach(c => b.extend(c)); return b; }
const flat = g => { const o = []; (function w(c) { typeof c[0] === 'number' ? o.push(c) : c.forEach(w); })(g.coordinates); return o; };
function pick(id, fly = false) {
  const p = byId.get(id); state.selected = p && badge(p) ? id : '';
  history.replaceState(null, '', state.selected ? '#' + id : location.pathname + location.search);
  if (!state.selected) { card.hidden = true; layout(); return; }
  const b = badge(p), near = places.filter(o => o.country === p.country && o.id !== id && badge(o)).sort((a, c) => Math.hypot(a.coordinates[0] - p.coordinates[0], a.coordinates[1] - p.coordinates[1]) - Math.hypot(c.coordinates[0] - p.coordinates[0], c.coordinates[1] - p.coordinates[1])).slice(0, 6);
  const precision = {city:'City-level pin', place:'Named place', area:'Area · hatched region is the footprint', break:'Named surf break', approximate:'Approximate location'};
  card.style.setProperty('--tint', CAT[b].color);
  card.innerHTML = `<span class="grab"></span><button class="x" aria-label="Close">×</button><div class="stamp">${icon[b](40)}</div><h2></h2><p class="where"></p>
    <div class="chips">${priority.filter(k => p.categories.includes(k)).map(k => `<span class="chip" style="--c:${CAT[k].color}">${icon[k](14)} ${CAT[k].label}</span>`).join('')}</div>
    <p>${precision[p.precision]}</p>${p.note ? '<p class="note"></p>' : ''}`;
  card.querySelector('h2').textContent = p.name; card.querySelector('.where').textContent = [p.area, p.country].filter(Boolean).join(', ');
  if (p.note) card.querySelector('.note').textContent = p.note;
  const sf = (p.sources || []).find(s => s.label === 'Surf-Forecast'); if (sf) card.append(el('a', {className:'cta', href:sf.url, target:'_blank', rel:'noopener'}, 'Check the swell ↗'));
  if (near.length) { card.append(el('h5', {}, `ALSO IN ${p.country.toUpperCase()}`)); const n = el('div', {className:'near'}); near.forEach(o => { const btn = el('button', {}, `${icon[badge(o)](13)} `); btn.append(o.name); btn.onclick = () => pick(o.id, true); n.append(btn); }); card.append(n); }
  card.querySelector('.x').onclick = () => pick('');
  card.hidden = false;
  if (fly) { const a = areaById.get(id); if (a && b !== 'surfed') map.fitBounds(bboxOf(flat(a.geometry)), {padding:safePad(), maxZoom:12, duration:1600}); else map.flyTo({center:p.coordinates, zoom:p.precision === 'break' ? 12 : 9, duration:1600, padding:safePad()}); }
  layout();
}
function listCard(title, tint, chips, ps, maxZoom, duration) {
  state.selected = ''; card.style.setProperty('--tint', tint);
  card.innerHTML = `<span class="grab"></span><button class="x" aria-label="Close">×</button><h2></h2><div class="chips">${chips}</div><div class="plist"></div>`;
  card.querySelector('h2').textContent = title;
  for (const p of ps) { const btn = el('button', {}, `${icon[badge(p)](13)} `); btn.append(p.name); btn.onclick = () => pick(p.id, true); card.querySelector('.plist').append(btn); }
  card.querySelector('.x').onclick = () => pick(''); card.hidden = false;
  map.fitBounds(bboxOf(ps.map(p => p.coordinates)), {padding:safePad(), maxZoom, duration});
}
function groupCard(g) {
  const ps = g.places.map(id => byId.get(id)).filter(badge); if (!ps.length) return;
  const k = catOf(g), noun = k === 'skied' ? (ps.length > 1 ? 'resorts' : 'resort') : 'spots';
  listCard(g.title, CAT[k].color, `<span class="chip" style="--c:${CAT[k].color}">${icon[k](14)} ${ps.length} ${noun}</span>`, ps, 9, 1200);
}
function countryCard(country) {
  const ps = places.filter(p => p.country === country && badge(p)); if (!ps.length) return;
  const tally = priority.map(k => [k, ps.filter(p => badge(p) === k).length]).filter(([, n]) => n);
  listCard(country, '#f39a2b', tally.map(([k, n]) => `<span class="chip" style="--c:${CAT[k].color}">${icon[k](14)} ${n} ${CAT[k].label.toLowerCase()}</span>`).join(''), ps, 6.5, 1400);
}

// on a phone the card is a bottom sheet: drag it down from the top edge to close
let sheetY = null;
card.addEventListener('touchstart', e => { sheetY = innerWidth <= 700 && card.scrollTop <= 0 ? e.touches[0].clientY : null; }, {passive:true});
card.addEventListener('touchmove', e => { if (sheetY == null) return; const dy = e.touches[0].clientY - sheetY; if (dy > 0) { card.style.transition = 'none'; card.style.transform = `translateY(${dy}px)`; e.preventDefault(); } }, {passive:false});
card.addEventListener('touchend', e => {
  if (sheetY == null) return; const dy = e.changedTouches[0].clientY - sheetY; sheetY = null; card.style.transition = card.style.transform = '';
  if (dy > 80) pick('');
});

// ---------- interaction ----------
const tip = $('#tip');
ov.addEventListener('click', e => {
  const t = e.target.closest('[data-id],[data-group]'); if (!t) return;
  if (t.dataset.list) return groupCard(groupById.get(t.dataset.group));
  if (t.dataset.group) return map.fitBounds(bboxOf(groupById.get(t.dataset.group).places.map(id => byId.get(id).coordinates)), {padding:safePad(), maxZoom:11, duration:1200});
  if (t.classList.contains('home') && t.dataset.multi) return map.fitBounds(bboxOf([...homeEls.keys()].filter(id => homeOf.get(id) === t.dataset.id).map(id => byId.get(id).coordinates)), {padding:{top:120, bottom:120, left:120, right:120}, maxZoom:12, duration:1000});
  const m = t.classList.contains('pin') && state.clusters.get(t.dataset.id);
  if (m && m.length > 1) return map.fitBounds(bboxOf(m.map(p => p.coordinates)), {padding:{top:110, bottom:110, left:110, right:110}, maxZoom:14, duration:1000});
  pick(t.dataset.id, true);
});
ov.addEventListener('mousemove', e => {
  const t = e.target.closest('[data-id],[data-group]'); if (!t) return tip.style.opacity = 0;
  const m = t.classList.contains('pin') && state.clusters.get(t.dataset.id), p = byId.get(t.dataset.id);
  tip.textContent = t.classList.contains('home') ? `Home ${t.querySelector('.no').textContent}: ${t.querySelector('.lbl').textContent}${t.dataset.multi ? ' — tap to zoom' : ''}` : m && m.length > 1 ? `${m.length} places — tap to zoom` : t.dataset.group ? `${t.dataset.tip} — tap to zoom` : t.dataset.tip ? `${t.dataset.tip} · ${p.name}` : `${p.name}, ${p.country}`;
  tip.style.opacity = 1; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 12 + 'px';
});
// stickers, pins and lists sit above the canvas; hand their wheel events to MapLibre so zoom follows the mouse everywhere
ov.addEventListener('wheel', e => {
  e.preventDefault();
  const {clientX, clientY, screenX, screenY, deltaX, deltaY, deltaZ, deltaMode, ctrlKey, shiftKey, altKey, metaKey} = e;
  map.getCanvas().dispatchEvent(new WheelEvent('wheel', {clientX, clientY, screenX, screenY, deltaX, deltaY, deltaZ, deltaMode, ctrlKey, shiftKey, altKey, metaKey, bubbles:true, cancelable:true}));
}, {passive:false});
ov.addEventListener('mouseleave', () => tip.style.opacity = 0, true);
// a double-click zooms in, so wait briefly before treating a click as a selection
// touch double-taps zoom without a dblclick event, so a second click soon after the first also cancels
let clickTimer, lastClick = 0;
map.on('dblclick', () => clearTimeout(clickTimer));
map.on('click', e => { clearTimeout(clickTimer); const now = performance.now(), second = now - lastClick < 500; lastClick = second ? 0 : now; if (second || e.originalEvent.target.closest?.('#ov [data-id],#ov [data-group]')) return; clickTimer = setTimeout(() => selectAt(e), coarse ? 320 : 260); });
function selectAt(e) {
  const f = map.queryRenderedFeatures(e.point, {layers:['area-fill','country-paint']});
  const area = f.find(x => x.layer.id === 'area-fill'), c = f.find(x => x.layer.id === 'country-paint');
  if (area && map.getZoom() > 3.5) return pick(area.properties.id, false);
  if (c && map.getZoom() < 5.5) return countryCard(c.properties.country);
  pick('');
}
map.on('mousemove', e => { const f = map.getLayer('country-paint') && map.queryRenderedFeatures(e.point, {layers:['country-paint']})[0]; map.getCanvas().style.cursor = f && map.getZoom() < 5.5 ? 'pointer' : ''; });

// ---------- search ----------
const search = $('#search'), results = $('#results'); let hits = [], cursor = 0;
function renderResults() {
  const q = search.value.trim().toLowerCase();
  hits = q ? places.filter(p => badge(p) && [p.name, p.country, p.area].some(v => v?.toLowerCase().includes(q))).slice(0, 8) : [];
  results.replaceChildren(...hits.map((p, i) => { const li = el('li', {className:i === cursor ? 'on' : ''}, `${icon[badge(p)](16)}<span></span><small></small>`); li.querySelector('span').textContent = p.name; li.querySelector('small').textContent = p.country; li.onmousedown = ev => { ev.preventDefault(); choose(p); }; return li; }));
}
const choose = p => { search.value = ''; hits = []; renderResults(); search.blur(); pick(p.id, true); };
search.oninput = () => { cursor = 0; renderResults(); };
search.onkeydown = e => { if (e.key === 'ArrowDown') { cursor = Math.min(cursor + 1, hits.length - 1); renderResults(); e.preventDefault(); } if (e.key === 'ArrowUp') { cursor = Math.max(cursor - 1, 0); renderResults(); e.preventDefault(); } if (e.key === 'Enter' && hits[cursor]) choose(hits[cursor]); if (e.key === 'Escape') { search.value = ''; renderResults(); } };
search.onblur = () => setTimeout(() => { hits = []; results.replaceChildren(); }, 150);
addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) pick(''); });

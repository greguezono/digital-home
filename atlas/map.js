import {$, INK, clamp} from './core.js';

// ---------- ocean + hatch textures ----------
function texture(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return c.getContext('2d').getImageData(0, 0, size, size); }
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const ocean = texture(256, (g, n) => {
  g.fillStyle = '#9fd3ec'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '255,255,255' : '74,150,200'},${.05 + rnd() * .06})`; g.beginPath(); g.ellipse(rnd() * n, rnd() * n, 30 + rnd() * 50, 8 + rnd() * 14, 0, 0, 7); g.fill(); }
  g.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const x = rnd() * n, y = rnd() * n, w = 6 + rnd() * 16; g.strokeStyle = rnd() < .62 ? 'rgba(255,255,255,.55)' : 'rgba(58,135,190,.35)'; g.lineWidth = .9 + rnd() * .9;
    for (const dx of [0, n, -n]) for (const dy of [0, n, -n]) { g.beginPath(); g.moveTo(x + dx, y + dy); g.quadraticCurveTo(x + dx + w / 2, y + dy - 2.5, x + dx + w, y + dy); g.stroke(); }
  }
});
const hatch = color => texture(16, (g, n) => { g.strokeStyle = color; g.lineWidth = 1.6; g.globalAlpha = .75; for (const o of [-n, 0, n]) { g.beginPath(); g.moveTo(o, n); g.lineTo(o + n, 0); g.stroke(); } });

// ---------- map: flat, custom painted style ----------
const LAT_TOP = 78, LAT_BOT = -58;
const mercY = lat => .5 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / (2 * Math.PI);
// desktop fits the 78°/−58° band to the height; a portrait phone may zoom out until the whole world fits the width,
// with painted sea above and below the band
const BAND = mercY(LAT_BOT) - mercY(LAT_TOP), phoneQ = matchMedia('(max-width:700px) and (orientation:portrait)');
const heightFit = h => Math.log2(h / (512 * BAND));
const minZoomFor = (w, h) => phoneQ.matches ? Math.min(Math.log2(w / 512), heightFit(h)) : heightFit(h);
const W = innerWidth, H = innerHeight, startZoom = phoneQ.matches ? minZoomFor(W, H) + 1.1 : Math.max(Math.log2(W / 512) + .05, minZoomFor(W, H));
const style = {version:8, glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources:{omt:{type:'vector', url:'https://tiles.openfreemap.org/planet'}},
  layers:[
    {id:'paper', type:'background', paint:{'background-color':'#f1e5c6'}},
    {id:'landcover-wood', type:'fill', source:'omt', 'source-layer':'landcover', minzoom:6, filter:['in',['get','class'],['literal',['wood','grass']]], paint:{'fill-color':'#a8cf8a', 'fill-opacity':.25}},
    {id:'roads', type:'line', source:'omt', 'source-layer':'transportation', minzoom:6.5, filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary']]], paint:{'line-color':'#b79f72', 'line-width':['interpolate',['linear'],['zoom'],7,.5,12,2], 'line-opacity':.7}},
    {id:'state-lines', type:'line', source:'omt', 'source-layer':'boundary', minzoom:2.5, filter:['all',['==',['get','admin_level'],4],['!=',['get','maritime'],1]], paint:{'line-color':INK, 'line-opacity':.28, 'line-width':.8, 'line-dasharray':[2,3]}},
    {id:'country-lines', type:'line', source:'omt', 'source-layer':'boundary', filter:['all',['==',['get','admin_level'],2],['!=',['get','maritime'],1],['!=',['get','disputed'],1]], paint:{'line-color':INK, 'line-opacity':.55, 'line-width':['interpolate',['linear'],['zoom'],1,.6,6,1.4], 'line-dasharray':[3,2]}},
    {id:'rivers', type:'line', source:'omt', 'source-layer':'waterway', minzoom:5, filter:['==',['get','class'],'river'], paint:{'line-color':'#5aa6d6', 'line-width':1.2}},
    {id:'water', type:'fill', source:'omt', 'source-layer':'water', paint:{'fill-pattern':'ocean'}},
    {id:'foam', type:'line', source:'omt', 'source-layer':'water', paint:{'line-color':'#eaf8ff', 'line-width':['interpolate',['linear'],['zoom'],1,4,8,9], 'line-blur':4, 'line-opacity':.9}},
    {id:'coast', type:'line', source:'omt', 'source-layer':'water', paint:{'line-color':INK, 'line-width':['interpolate',['linear'],['zoom'],1,.9,6,1.6,12,2.2], 'line-opacity':.9}},
    {id:'labels', type:'symbol', source:'omt', 'source-layer':'place', minzoom:5, filter:['in',['get','class'],['literal',['city','town']]], layout:{'text-field':['coalesce',['get','name_en'],['get','name:latin'],['get','name']], 'text-font':['Noto Sans Italic'], 'text-size':['interpolate',['linear'],['zoom'],5,10,10,14]}, paint:{'text-color':'#5b5240', 'text-halo-color':'#f6eedb', 'text-halo-width':1.4}},
  ]};
const map = new maplibregl.Map({container:'map', style, center:phoneQ.matches ? [-40, 18] : [-8, 18], zoom:startZoom, minZoom:minZoomFor(W, H), maxZoom:15, attributionControl:false, renderWorldCopies:true, dragRotate:false, pitchWithRotate:false, touchPitch:false});
map.touchZoomRotate.disableRotation();
window.atlasMap = map;
map.addControl(new maplibregl.AttributionControl({compact:true, customAttribution:'OpenFreeMap · © OpenStreetMap · Natural Earth'}), 'bottom-right');
map.addControl(new maplibregl.NavigationControl({showCompass:false}), 'top-right');
if (phoneQ.matches) map.once('load', () => document.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));
map.addImage('ocean', ocean); map.addImage('hatch-lived', hatch('#c8541f')); map.addImage('hatch-visited', hatch('#2a7d50'));
// keep the poster edges on screen: no grey void above the Arctic or below the Southern Ocean
map.transformCameraUpdate = next => {
  const ws = 512 * 2 ** next.zoom, h = map.getContainer().clientHeight, top = mercY(LAT_TOP) * ws + h / 2, bot = mercY(LAT_BOT) * ws - h / 2;
  // when the band is shorter than the screen (phone zoomed out) keep it vertically centred
  const y = top <= bot ? clamp(mercY(next.center.lat) * ws, top, bot) : (top + bot) / 2, lat = (360 / Math.PI) * Math.atan(Math.exp((.5 - y / ws) * 2 * Math.PI)) - 90;
  return {center:new maplibregl.LngLat(next.center.lng, lat)};
};
// MapLibre has no public option to let the ±85° world be shorter than the screen; it zooms in until it fills the
// height. Clearing its internal latitude range on phone allows the width-fit zoom; the camera clamp above still
// keeps the poster band in view.
const latHelper = map.transform._helper, fullLat = latHelper?._latRange && [...latHelper._latRange];
const syncPhone = () => {
  const c = map.getContainer();
  if (fullLat) latHelper._latRange = phoneQ.matches ? null : fullLat;
  map.setMinZoom(minZoomFor(c.clientWidth, c.clientHeight));
  if (map.getLayer('band-edge')) for (const l of ['band-sea', 'band-edge']) map.setLayoutProperty(l, 'visibility', phoneQ.matches ? 'visible' : 'none');
};
syncPhone(); if (phoneQ.matches) map.jumpTo({zoom:startZoom});
addEventListener('resize', syncPhone);
// the parent page reports where its tab pill ends so the title and card clear it
addEventListener('message', e => { if (e.origin === location.origin && e.data?.type === 'atlas-chrome') document.documentElement.style.setProperty('--chrome-top', e.data.top + 'px'); });
{ const c = document.createElement('canvas'); c.width = c.height = 256; c.getContext('2d').putImageData(ocean, 0, 0); $('#map').style.background = `url(${c.toDataURL()}) #9fd3ec`; }

// ---------- overlay elements ----------
// MapLibre only handles touches whose target is inside its canvas container, so on touch screens the overlay moves
// in there and a pan or pinch that starts on a sticker still moves the map
const coarse = matchMedia('(pointer:coarse)').matches;
if (coarse) map.getCanvasContainer().append($('#ov'));

function proj(ll) { const c = map.getCenter().lng; let lng = ll[0]; lng += 360 * Math.round((c - lng) / 360); return map.project([lng, ll[1]]); }

export {LAT_BOT, LAT_TOP, coarse, map, mercY, phoneQ, proj, syncPhone};

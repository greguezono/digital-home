const $ = s => document.querySelector(s), el = (t, a = {}, h) => { const e = Object.assign(document.createElement(t), a); if (h != null) e.innerHTML = h; return e; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), INK = '#2b2733';
const CAT = {lived:{label:'Lived', color:'#d9573b'}, visited:{label:'Visited', color:'#2f9d62'}, surfed:{label:'Surfed', color:'#1d6fa5'}, skied:{label:'Skied', color:'#7b62b8'}};
const priority = ['lived','surfed','skied','visited'], enabled = new Set(priority);
const badge = p => priority.find(k => enabled.has(k) && p.categories.includes(k));
const PALETTE = {1:'#f6d26b',2:'#f4ae7f',3:'#acd88a',4:'#f8dd8c',5:'#a8d9a0',6:'#f2a3b3',7:'#c3b0e6'};
const EDGE = {1:'#c9962a',2:'#cf7442',3:'#6e9f48',4:'#caa340',5:'#5e9d58',6:'#c26178',7:'#8a6fc0'};

// ---------- tiny hand-drawn icons ----------
const WAVE = 'M1 20C5 20 7 16 8.5 12 10 7.5 13.5 4 18 4c2.5 0 4.5 1.5 5 4-1.5-1.2-3.5-1.2-4.8 0-1.6 1.5-1.6 4-.2 6 1.5 2.5 3.5 4.5 5 6Z';
const icon = {
  surfed: (s = 18) => `<svg width="${s}" height="${s*.8}" viewBox="-1 2 26 20"><path d="${WAVE}" fill="#1d6fa5" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M19.5 7.5c-1.4-.6-2.8-.3-3.6.8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  visited: (s = 18) => `<svg width="${s*.75}" height="${s}" viewBox="0 0 18 24"><path d="M9 23C9 23 2 14.5 2 9a7 7 0 0 1 14 0c0 5.5-7 14-7 14Z" fill="#2f9d62" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="9" cy="9" r="2.8" fill="#fbf4e2" stroke="${INK}" stroke-width="1.2"/></svg>`,
  skied: (s = 18) => `<svg width="${s}" height="${s*.8}" viewBox="0 0 26 21"><path d="M1.5 19.5 9.5 6l4 5.5L16.5 2l8 17.5Z" fill="#7b62b8" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M14.6 6.2 16.5 2l2.1 4.6-2 1.4ZM8 8.5 9.5 6l1.6 2.2-1.6 1Z" fill="#fff" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/></svg>`,
  lived: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 22 22"><path d="M15 4.5h3v5" fill="#8a5a3a" stroke="${INK}" stroke-width="1.6"/><rect x="4" y="10" width="14" height="10.5" fill="#fff3d6" stroke="${INK}" stroke-width="1.8"/><path d="M1.5 11.5 11 3l9.5 8.5Z" fill="#d9573b" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><rect x="9" y="14" width="4" height="6.5" fill="#8a5a3a" stroke="${INK}" stroke-width="1.3"/></svg>`
};

const HOME = (s = 40) => `<svg width="${s}" height="${s * 1.05}" viewBox="0 0 40 42"><path d="M27 4c1.5-2.5 5-2 5.5.5 2.5-.5 3.5 2.5 1.5 3.5" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".55"/><path d="M26 9.5h5.5V19" fill="#a9783f" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M6.5 19.5h27v19h-27Z" fill="#fff3d6" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M2 21.5 20 6l18 15.5Z" fill="#d9573b" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 18.5l11-9.5 11 9.5" fill="none" stroke="#f39a5b" stroke-width="1.5" stroke-linecap="round"/><rect x="10" y="23.5" width="7.5" height="7" fill="#9fd3ec" stroke="${INK}" stroke-width="1.8"/><path d="M13.75 23.5v7M10 27h7.5" stroke="${INK}" stroke-width="1.2"/><path d="M22.5 38.5V28a3.5 3.5 0 0 1 7 0v10.5" fill="#a9783f" stroke="${INK}" stroke-width="1.8"/><circle cx="27.6" cy="33.5" r=".9" fill="${INK}"/><path d="M1.5 39.5c4-1.8 7 0 10-.6s6-1.4 9-.2 8 1.2 12 .2 5 .2 6.5.6" fill="none" stroke="#2f9d62" stroke-width="2.2" stroke-linecap="round"/></svg>`;
if (window.top !== window) document.documentElement.classList.add('embedded');
const esc = t => t.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);

// mutable view state shared across modules
const state = {selected:'', clusters:new Map(), active:new Set()};
const ov = $('#ov'), add = (cls, html, data = {}) => { const e = el('div', {className:cls}, html); Object.assign(e.dataset, data); ov.append(e); return e; };
const place = (e, x, y, extra = '') => { e.style.transform = `translate(${x}px,${y}px)${extra}`; };
const show = (e, on) => { e.style.display = on ? '' : 'none'; };

export {$, CAT, EDGE, HOME, INK, PALETTE, add, badge, clamp, el, enabled, esc, icon, ov, place, priority, show, state};

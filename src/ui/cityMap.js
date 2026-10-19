/**
 * cityMap.js – panel Města jako mapa shora v pixel artu (rozložení v data/cityMaps.js).
 *
 * Mapa se kreslí na plátno 320×180 a zvětšuje bez rozmazání (CSS image-rendering: pixelated).
 * Statická část (terén, cesty, stromy, budovy) se kreslí jednou a drží v cache; každý snímek
 * se nad ni dokreslí jen pohyb (voda, květiny, kouř, mlha). Nad budovami leží neviditelná
 * tlačítka (klik, dotyk, klávesnice, popisek), proto se klik neřeší přes plátno.
 * Budovy jsou sprity v pixel artu (tools/pixelize_buildings.py); gym jen u města s gymem,
 * Pokémon League jen na oblasti s Ligou. Plošné prvky (`decals`, např. nádvoří Ligy) leží pod budovami.
 */

import { getBuilding } from "../../data/buildings.js";
import { getGymForCity } from "../../data/gyms.js";
import { leagueForArea } from "../../data/trainers.js";
import { buildingSpriteUrl, citySpriteUrl } from "../core/assets.js";
import { VERSION } from "../core/version.js";

const W = 320, H = 180, OUTL = "#2a2230";
/** Největší rozumná šířka spritu budovy na mapě (S.S. Anne 88 px). Větší obrázek = stará verze z mezipaměti. */
const MAX_SPRITE_W = 120, FALLBACK_W = 46;

// ---------------------------------------------------------------- pomocné funkce
function rng(seed) {
  let a = 0x9e3779b9;
  for (const ch of String(seed)) a = Math.imul(a ^ ch.charCodeAt(0), 2654435761);
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rgbOf = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function mix(a, b, t) { const A = rgbOf(a), B = rgbOf(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); }
function discPx(b, cx, cy, r, col) { b.fillStyle = col; for (let dy = -r; dy <= r; dy++) { const dx = Math.floor(Math.sqrt(r * r - dy * dy)); b.fillRect(Math.round(cx - dx), Math.round(cy + dy), dx * 2 + 1, 1); } }
function ellipsePx(b, cx, cy, rx, ry, col) { b.fillStyle = col; for (let dy = -ry; dy <= ry; dy++) { const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2))); b.fillRect(Math.round(cx - dx), Math.round(cy + dy), dx * 2 + 1, 1); } }
function fillPolyPx(b, pts, col) {
  b.fillStyle = col; let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yc = y + .5, xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax)); }
    xs.sort((a, c) => a - c);
    for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); if (xb > xa) b.fillRect(xa, y, xb - xa, 1); }
  }
}
function linePx(b, a, c, col) {
  let [x0, y0] = a.map(Math.round); const [x1, y1] = c.map(Math.round); b.fillStyle = col;
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  for (;;) { b.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}

// ---------------------------------------------------------------- prvky mapy (pohled shora pod úhlem, jako budovy)
const GROUND = {
  grass: { base: "#78c850", lite: "#9ade6e", dark: "#5aa83e" },
  dusk: { base: "#6e9a6c", lite: "#86b282", dark: "#557e58" },
  sand: { base: "#e8d4a0", lite: "#f6e6bc", dark: "#d2b97f" },
  paved: { base: "#cfcac0", lite: "#e0dcd2", dark: "#b4aea2", tiles: true },
};
const TREE = { round: ["#22461a", "#3a7a2a", "#58a838", "#88d060"], pine: ["#1a3424", "#2a5a3a", "#3a7a4a", "#5e9a6a"], palm: ["#2a4a1a", "#3a7a2a", "#5aa83e", "#8ad062"] };

function tree(b, x, base, kind) {
  const [o, d, m, l] = TREE[kind];
  ellipsePx(b, x + 1, base, 6, 2, "rgba(0,0,0,.25)");
  if (kind === "palm") {
    let tx = x, ty = base;
    for (let k = 0; k < 16; k++) { tx = x + Math.round(Math.sin(k / 16 * 1.3) * 3); ty = base - k; b.fillStyle = OUTL; b.fillRect(tx - 1, ty, 1, 1); b.fillStyle = k % 3 ? "#9a7440" : "#7a5a30"; b.fillRect(tx, ty, 2, 1); }
    for (let i = 0; i < 6; i++) { const a = Math.PI * (.08 + i * .17); for (let k = 1; k < 10; k++) { const fx = tx + Math.round(Math.cos(a) * k * (i < 3 ? -1 : 1) * (i % 3 === 1 ? .6 : 1)), fy = ty - Math.round(Math.sin(a) * k * .5) + Math.round((k / 9) ** 2 * 6) - (i % 3 === 1 ? 2 : 0); b.fillStyle = o; b.fillRect(fx, fy + 1, 1, 1); b.fillStyle = k < 4 ? l : m; b.fillRect(fx, fy, 1, 1); } }
    return;
  }
  if (kind === "pine") {
    b.fillStyle = "#6b4a2e"; b.fillRect(x - 1, base - 3, 3, 3);
    for (let r = 0; r < 18; r++) { const hw = Math.floor(r * .42) + (r % 6 === 5 ? 1 : 0), y = base - 21 + r; b.fillStyle = o; b.fillRect(x - hw - 1, y, hw * 2 + 3, 1); b.fillStyle = r < 9 ? m : d; b.fillRect(x - hw, y, hw * 2 + 1, 1); b.fillStyle = l; b.fillRect(x - hw, y, 1, 1); }
    return;
  }
  b.fillStyle = OUTL; b.fillRect(x - 2, base - 6, 5, 6); b.fillStyle = "#7a5432"; b.fillRect(x - 1, base - 6, 3, 6); b.fillStyle = "#5a3a22"; b.fillRect(x + 1, base - 6, 1, 6);
  const blobs = [[-4, -9, 5], [4, -9, 5], [0, -13, 6]];
  for (const [dx, dy, r] of blobs) discPx(b, x + dx, base + dy, r + 1, o);
  for (const [dx, dy, r] of blobs) discPx(b, x + dx, base + dy, r, d);
  for (const [dx, dy, r] of [[-4, -10, 4], [3, -10, 3], [-1, -14, 5]]) discPx(b, x + dx, base + dy, r, m);
  discPx(b, x - 3, base - 16, 2, l); discPx(b, x - 6, base - 11, 1, l);
}
function rock(b, x, base, s = 7) {
  ellipsePx(b, x + 1, base, s, 2, "rgba(0,0,0,.25)");
  ellipsePx(b, x, base - s + 1, s + 1, s, OUTL); ellipsePx(b, x, base - s + 1, s, s - 1, "#8a8c94");
  ellipsePx(b, x - 1, base - s, s - 2, s - 3, "#a4a6ae"); ellipsePx(b, x - 3, base - s - 2, 2, 1, "#c8cad2");
  b.fillStyle = "#6a6c74"; b.fillRect(x + 1, base - 3, s - 2, 1);
}
function sign(b, x, base) {
  ellipsePx(b, x + 1, base, 4, 1, "rgba(0,0,0,.25)");
  b.fillStyle = OUTL; b.fillRect(x - 1, base - 6, 3, 6); b.fillStyle = "#7a5432"; b.fillRect(x, base - 6, 1, 6);
  b.fillStyle = OUTL; b.fillRect(x - 7, base - 15, 15, 10); b.fillStyle = "#c8964e"; b.fillRect(x - 6, base - 14, 13, 8);
  b.fillStyle = "#e0b26a"; b.fillRect(x - 6, base - 14, 13, 1); b.fillStyle = "#8a5a2a"; b.fillRect(x - 4, base - 12, 9, 1); b.fillRect(x - 4, base - 9, 7, 1);
}
function lamp(b, x, base) {
  ellipsePx(b, x + 1, base, 2, 1, "rgba(0,0,0,.25)");
  b.fillStyle = OUTL; b.fillRect(x - 1, base - 12, 3, 12); b.fillStyle = "#5a5a6a"; b.fillRect(x, base - 12, 1, 12);
  b.fillStyle = OUTL; b.fillRect(x - 2, base - 15, 5, 4); b.fillStyle = "#fff2b0"; b.fillRect(x - 1, base - 14, 3, 2);
}
function fence(b, x0, base, x1) {
  b.fillStyle = OUTL; b.fillRect(x0, base - 6, x1 - x0, 2); b.fillRect(x0, base - 3, x1 - x0, 2);
  b.fillStyle = "#f4f4f8"; b.fillRect(x0, base - 6, x1 - x0, 1); b.fillRect(x0, base - 3, x1 - x0, 1);
  for (let x = x0; x < x1; x += 5) { b.fillStyle = OUTL; b.fillRect(x, base - 8, 3, 8); b.fillStyle = "#ffffff"; b.fillRect(x + 1, base - 8, 1, 7); b.fillStyle = "#c8c8d4"; b.fillRect(x + 1, base - 2, 1, 1); }
}
function fenceV(b, x, y0, y1) { for (let y = y0; y < y1; y += 4) { b.fillStyle = OUTL; b.fillRect(x - 1, y, 3, 5); b.fillStyle = "#ffffff"; b.fillRect(x, y, 1, 4); } }
function fountain(b, cx, base) {
  ellipsePx(b, cx + 1, base, 15, 4, "rgba(0,0,0,.22)"); ellipsePx(b, cx, base - 4, 15, 6, OUTL); ellipsePx(b, cx, base - 4, 14, 5, "#d4d0c6"); ellipsePx(b, cx, base - 5, 11, 3, "#4a9ee8");
  b.fillStyle = OUTL; b.fillRect(cx - 2, base - 15, 5, 10); b.fillStyle = "#ece8de"; b.fillRect(cx - 1, base - 14, 3, 9);
}
function dock(b, x, y, w, h) {
  b.fillStyle = "#6a4a2a"; for (const px of [x, x + w - 2]) b.fillRect(px, y + h, 2, 4);
  b.fillStyle = OUTL; b.fillRect(x - 1, y, w + 2, h + 1); b.fillStyle = "#b08850"; b.fillRect(x, y, w, h);
  b.fillStyle = "#8a6438"; for (let yy = y + 3; yy < y + h; yy += 3) b.fillRect(x, yy, w, 1);
}
function mountain(b, cx, base, w, h) {
  const pts = [[cx - w / 2, base], [cx - w * .4, base - h * .45], [cx - w * .3, base - h * .62], [cx - w * .22, base - h * .9], [cx - w * .12, base - h], [cx + w * .14, base - h], [cx + w * .24, base - h * .84], [cx + w * .32, base - h * .55], [cx + w * .44, base - h * .3], [cx + w / 2, base]];
  ellipsePx(b, cx + 4, base, Math.round(w / 2), 4, "rgba(0,0,0,.22)");
  fillPolyPx(b, pts, "#8a6450");
  fillPolyPx(b, [[cx + w * .02, base - h], [cx + w * .14, base - h], [cx + w * .24, base - h * .84], [cx + w * .32, base - h * .55], [cx + w * .44, base - h * .3], [cx + w / 2, base], [cx + w * .08, base]], "#6e4e3c");
  fillPolyPx(b, [[cx - w / 2, base], [cx - w * .4, base - h * .45], [cx - w * .3, base - h * .62], [cx - w * .22, base - h * .9], [cx - w * .12, base - h], [cx - w * .04, base - h], [cx - w * .18, base]], "#9e7460");
  for (let k = 0; k < 6; k++) { const x = cx - w * .32 + k * w * .12; linePx(b, [x, base - h * .7 + (k % 2) * 6], [x + 3, base - 4], k > 2 ? "#5a3e30" : "#7a5644"); }
  ellipsePx(b, cx + 1, base - h, Math.round(w * .14), Math.round(h * .1), "#a27a5e");
  ellipsePx(b, cx + 1, base - h, Math.round(w * .08), Math.round(h * .06), "#4a2e26"); ellipsePx(b, cx + 1, base - h, Math.round(w * .055), Math.round(h * .04), "#c8401c"); ellipsePx(b, cx, base - h - 1, 2, 1, "#ff9a3a");
  for (let i = 0; i < pts.length; i++) linePx(b, pts[i], pts[(i + 1) % pts.length], OUTL);
  return { x: cx + 1, y: base - h };
}
// Tabulka s názvem města (jako ve hrách při vstupu do města) – pixelové písmo 5×7
const FONT = { A: "01110100011000111111100011000110001", B: "11110100011000111110100011000111110", C: "01110100011000010000100001000101110", D: "11110100011000110001100011000111110", E: "11111100001000011110100001000011111", F: "11111100001000011110100001000010000", G: "01110100011000010111100011000101111", H: "10001100011000111111100011000110001", I: "01110001000010000100001000010001110", J: "00111000100001000010000101001001100", K: "10001100101010011000101001001010001", L: "10000100001000010000100001000011111", M: "10001110111010110101100011000110001", N: "10001110011010110011100011000110001", O: "01110100011000110001100011000101110", P: "11110100011000111110100001000010000", Q: "01110100011000110001101011001001101", R: "11110100011000111110101001001010001", S: "01111100001000001110000010000111110", T: "11111001000010000100001000010000100", U: "10001100011000110001100011000101110", V: "10001100011000110001100010101000100", W: "10001100011000110101101011010101010", X: "10001100010101000100010101000110001", Y: "10001100010101000100001000010000100", Z: "11111000010001000100010001000011111" };
function banner(b, name, x, y) {
  const text = name.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, ""), w = text.length * 6 + 11, h = 15;
  b.fillStyle = "rgba(0,0,0,.28)"; b.fillRect(x + 2, y + 2, w, h);
  b.fillStyle = OUTL; b.fillRect(x, y, w, h); b.fillStyle = "#8a5a32"; b.fillRect(x + 1, y + 1, w - 2, h - 2);
  b.fillStyle = "#f8f0dc"; b.fillRect(x + 3, y + 3, w - 6, h - 6); b.fillStyle = "#d8c8a0"; b.fillRect(x + 3, y + h - 4, w - 6, 1);
  b.fillStyle = "#3a2a20"; let cx = x + 6;
  for (const ch of text) { const g = FONT[ch]; if (g) for (let i = 0; i < 35; i++) if (g[i] === "1") b.fillRect(cx + (i % 5), y + 4 + Math.floor(i / 5), 1, 1); cx += 6; }
}

// ---------------------------------------------------------------- statická vrstva (kreslí se jednou)
function buildStatic(cityId, name, map, placed, decals) {
  const R = rng("town" + cityId), G = GROUND[map.ground] ?? GROUND.grass;
  const bg = document.createElement("canvas"); bg.width = W; bg.height = H; const b = bg.getContext("2d");
  const PATH = map.ground === "sand" ? { base: "#cfc6b4", edge: "#a89e8a", spk: "#bdb4a0" } : map.ground === "paved" ? { base: "#e6dcc4", edge: "#b8ac94", spk: "#d4c8ae" } : { base: "#e2cc94", edge: "#bfa068", spk: "#d2b97f" };
  // terén
  b.fillStyle = G.base; b.fillRect(0, 0, W, H);
  if (G.tiles) { b.fillStyle = G.dark; for (let y = 0; y < H; y += 8) { b.fillRect(0, y, W, 1); for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) b.fillRect(x, y, 1, 8); } b.fillStyle = G.lite; for (let y = 1; y < H; y += 8) b.fillRect(0, y, W, 1); }
  else for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const hs = ((x * 73856093) ^ (y * 19349663)) >>> 0; if (hs % 23 === 0) { b.fillStyle = G.lite; b.fillRect(x, y, 1, 1); } else if (hs % 31 === 0) { b.fillStyle = G.dark; b.fillRect(x, y, 1, 1); } }
  if (map.ground === "grass" || map.ground === "dusk") for (let i = 0; i < 90; i++) { const x = Math.floor(R() * W), y = 40 + Math.floor(R() * 130); b.fillStyle = G.dark; b.fillRect(x, y, 1, 2); b.fillRect(x + 2, y, 1, 2); b.fillStyle = G.lite; b.fillRect(x + 1, y - 1, 1, 2); }
  // voda: moře (s pískem u břehu), řeka, jezírka
  const water = map.water;
  if (water) {
    if (water.left) { b.fillStyle = "#f0dca8"; b.fillRect(water.left, 30, 4, H); b.fillStyle = "#4a9ee8"; b.fillRect(0, 30, water.left, H); b.fillStyle = "#2f78c8"; b.fillRect(water.left - 1, 30, 1, H); }
    const x0 = water.x0 ?? 0, x1 = water.x1 ?? W;
    b.fillStyle = "#f0dca8"; b.fillRect(x0 - (water.x0 ? 4 : 0), water.y - 5, x1 - x0 + (water.x0 ? 4 : 0) + (water.x1 ? 4 : 0), 5);
    if (water.x1) b.fillRect(x1, water.y - 5, 4, H); if (water.x0) b.fillRect(x0 - 4, water.y - 5, 4, H);
    b.fillStyle = "#e0c890"; for (let x = x0; x < x1; x += 3) b.fillRect(x + (x % 2), water.y - 5 + (x % 4), 1, 1);
    b.fillStyle = "#4a9ee8"; b.fillRect(x0, water.y, x1 - x0, H - water.y); b.fillStyle = "#2f78c8"; b.fillRect(x0, water.y, x1 - x0, 1);
    if (water.x1) b.fillRect(x1 - 1, water.y, 1, H); if (water.x0) b.fillRect(x0, water.y, 1, H);
    b.fillStyle = "#3a86d0"; for (let y = water.y + 6; y < H; y += 5) b.fillRect(x0, y, x1 - x0, 1);
  }
  if (map.river) { const { x, w } = map.river; b.fillStyle = "#f0dca8"; b.fillRect(x - 2, 0, w + 4, H); b.fillStyle = "#4a9ee8"; b.fillRect(x, 0, w, H); b.fillStyle = "#2f78c8"; b.fillRect(x, 0, 1, H); b.fillRect(x + w - 1, 0, 1, H); b.fillStyle = "#3a86d0"; for (let y = 3; y < H; y += 6) b.fillRect(x + 3 + (y % 4), y, 5, 1); }
  for (const [cx, cy, rx, ry] of map.ponds ?? []) { ellipsePx(b, cx, cy, rx + 2, ry + 2, "#f0dca8"); ellipsePx(b, cx, cy, rx, ry, "#2f78c8"); ellipsePx(b, cx, cy + 1, rx - 1, ry - 1, "#4a9ee8"); }
  // cesty (přes řeku vede most)
  for (const [x, y, w, h] of map.paths ?? []) {
    b.fillStyle = PATH.base; b.fillRect(x, y, w, h); b.fillStyle = PATH.edge;
    if (w > h) { b.fillRect(x, y, w, 1); b.fillRect(x, y + h - 1, w, 1); } else { b.fillRect(x, y, 1, h); b.fillRect(x + w - 1, y, 1, h); }
    b.fillStyle = PATH.spk; for (let i = 0; i < w * h / 14; i++) b.fillRect(x + 1 + Math.floor(R() * (w - 2)), y + 1 + Math.floor(R() * (h - 2)), 1, 1);
    if (map.river && w > h && x <= map.river.x && x + w >= map.river.x + map.river.w) {
      const rx = map.river.x - 3, rw = map.river.w + 6;
      b.fillStyle = OUTL; b.fillRect(rx, y - 2, rw, h + 4); b.fillStyle = "#b08850"; b.fillRect(rx, y - 1, rw, h + 2);
      b.fillStyle = "#8a6438"; for (let xx = rx + 2; xx < rx + rw; xx += 3) b.fillRect(xx, y - 1, 1, h + 2);
      b.fillStyle = "#e0c08a"; b.fillRect(rx, y - 1, rw, 1);
    }
  }
  if (map.dock) dock(b, ...map.dock);
  for (const d of decals) b.drawImage(d.img, d.x, d.y, d.w, d.h);   // nádvoří apod. – leží na zemi pod vším
  // objekty seřazené podle spodní hrany (níž = blíž = kreslí se později)
  const objs = [], add = (base, draw) => objs.push({ base, draw });
  const border = (x, bs) => (map.border === "rock" ? rock(b, x, bs, 7) : tree(b, x, bs, map.border));
  if (map.border !== "palm") {
    const [ex, ew] = map.exit ?? [-99, 0];
    for (let row = 0; row < 4; row++) for (let x = (row % 2) * 7 - 6; x < W + 8; x += 14) { if (x > ex - 10 && x < ex + ew + 10) continue; const bs = 14 + row * 8; add(bs, () => border(x, bs)); }
    if (map.sideTrees) {
      const [s0, s1] = map.sideTrees, gap = map.roadGap ?? [-1, -1], leftEnd = water && !water.x0 ? water.y - 8 : s1, rightEnd = water && !water.x1 ? water.y - 8 : s1;
      for (let bs = s0; bs <= s1; bs += 10) {
        if (bs > gap[0] && bs < gap[1]) continue;
        if (bs <= leftEnd && !map.noLeftTrees) add(bs, () => border(6, bs));
        if (bs <= rightEnd) add(bs + 1, () => border(W - 6, bs + 1));
      }
    }
  }
  for (const [x, bs] of map.palms ?? []) add(bs, () => tree(b, x, bs, "palm"));
  for (const [x, bs] of map.rocks ?? []) add(bs, () => rock(b, x, bs, 6));
  let vol = null;
  if (map.volcano) { const [vx, vb, vw, vh] = map.volcano; add(vb, () => { vol = mountain(b, vx, vb, vw, vh); }); }
  for (const [x0, bs, x1] of map.fences ?? []) add(bs, () => fence(b, x0, bs, x1));
  for (const [x, y, w, h] of map.pens ?? []) {
    add(y + 8, () => { b.fillStyle = G.dark; b.fillRect(x + 2, y + 9, w - 4, h - 9); fence(b, x, y + 8, x + w); });
    add(y + h - 6, () => tree(b, x + w / 2, y + h - 6, "round"));
    add(y + h, () => { fenceV(b, x + 1, y + 6, y + h - 2); fenceV(b, x + w - 2, y + 6, y + h - 2); fence(b, x, y + h, x + w); });
  }
  if (map.fountain) add(map.fountain[1], () => fountain(b, ...map.fountain));
  for (const [x, bs] of map.signs ?? []) add(bs, () => sign(b, x, bs));
  for (const [x, bs] of map.lamps ?? []) add(bs, () => lamp(b, x, bs));
  for (const p of placed) add(p.base, () => {
    if (p.id !== "ss-anne") ellipsePx(b, p.cx + 2, p.base - 1, Math.round(p.w / 2) - 2, 2, "rgba(0,0,0,.22)");
    b.drawImage(p.img, p.x, p.y, p.w, p.h);
  });
  objs.sort((a, c) => a.base - c.base).forEach((o) => o.draw());
  banner(b, name, 4, 4);
  const flowers = (map.flowers ?? []).flatMap(([x, y, w, h]) => Array.from({ length: Math.round(w * h / 18) }, () => [x + Math.floor(R() * w), y + Math.floor(R() * h), R() < .5]));
  const motes = Array.from({ length: 8 }, () => ({ x: R(), y: R(), ph: R() * 6.28 }));
  // místa, přes která se nekreslí vlnky (budovy stojící na vodě, molo) – jinak by voda překryla loď
  const dry = placed.map((p) => [p.x - 1, p.y - 1, p.x + p.w + 1, p.y + p.h + 1]);
  if (map.dock) { const [x, y, w, h] = map.dock; dry.push([x - 1, y, x + w + 1, y + h + 4]); }
  return { bg, vol, flowers, motes, dry };
}

// ---------------------------------------------------------------- pohyb (každý snímek nad statickou vrstvou)
function drawFrame(a, t) {
  const { ctx, map, S } = a, step = Math.floor(t * 4);
  const wet = (x, y) => !S.dry.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1);
  ctx.globalCompositeOperation = "source-over"; ctx.drawImage(S.bg, 0, 0);
  ctx.fillStyle = "#b8e4ff";
  if (map.water) {
    const wy = map.water.y, x0 = map.water.x0 ?? 0, x1 = map.water.x1 ?? W;
    for (let y = wy + 2; y < H; y++) for (let x = x0 + (y * 5 + step) % 14; x < x1 - 2; x += 14) if (wet(x, y) && wet(x + 1, y)) ctx.fillRect(x, y, 2, 1);
    if (map.water.left) for (let y = 32; y < wy; y += 3) ctx.fillRect((y * 7 + step) % map.water.left, y, 2, 1);
    ctx.fillStyle = "#ffffff"; for (let x = x0; x < x1; x++) { const y = wy - 1 + (Math.sin(x * .3 + t * 2) > 0 ? 0 : 1); if (((x + step) % 7) < 3 && wet(x, y)) ctx.fillRect(x, y, 1, 1); }
  }
  if (map.river) { ctx.fillStyle = "#b8e4ff"; for (let k = 0; k < 14; k++) ctx.fillRect(map.river.x + 3 + (k * 5) % (map.river.w - 6), (k * 13 + step * 2) % H, 2, 1); }
  const fr = Math.floor(t * 2) % 2;
  for (const [x, y, red] of S.flowers) { ctx.fillStyle = red ? "#ff5a5a" : "#ffffff"; ctx.fillRect(x - 1 + fr, y, 3, 1); ctx.fillRect(x + fr, y - 1, 1, 3); ctx.fillStyle = "#ffe066"; ctx.fillRect(x + fr, y, 1, 1); }
  if (map.fountain) { const [fx, fb] = map.fountain; ctx.fillStyle = "#d8f4ff"; for (let k = 0; k < 6; k++) { const ph = (t * 1.5 + k / 6) % 1, dir = k % 2 ? 1 : -1; ctx.fillRect(fx + Math.round(dir * (2 + ph * 7)), fb - 17 + Math.round(ph * ph * 12), 1, 1); } }
  if (S.vol) for (let k = 0; k < 8; k++) { const ph = (t * .07 + k / 8) % 1; discPx(ctx, Math.round(S.vol.x - 4 - ph * 22 + Math.sin(ph * 5 + k) * 2), Math.round(S.vol.y - 4 - ph * 30), Math.round(1 + ph * 5), mix("#ece4de", "#c8c0bc", ph)); }
  if (map.mist) for (let i = 0; i < 4; i++) { const y = 46 + i * 34, off = Math.floor(t * (2 + i)) % 10; ctx.fillStyle = "rgba(235,225,255,.22)"; for (let x = -10 + off; x < W; x += 10) ctx.fillRect(x, y + ((x / 10) & 1), 7, 2); }
  if (map.dusk) { ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "#eadcff"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over"; }
  if (map.wisps) for (const m of S.motes.slice(0, 7)) { const x = Math.round(60 + m.x * 200 + Math.sin(t * .2 + m.ph) * 8), y = Math.round(130 + m.y * 40 + Math.sin(t * .6 + m.ph) * 4); ctx.fillStyle = "rgba(180,140,255,.2)"; ctx.fillRect(x - 1, y - 1, 4, 4); ctx.fillStyle = "#b48cff"; ctx.fillRect(x, y, 2, 2); }
}

// ---------------------------------------------------------------- načítání spritů, cache, smyčka
const images = new Map();
function loadImage(url) {
  if (!images.has(url)) images.set(url, new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = url; }));
  return images.get(url);
}
const statics = new Map();
const REDUCE = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
let active = null, rafId = 0, lastDraw = 0;
function frame(now) {
  if (!active || !active.canvas.isConnected) { active = null; rafId = 0; return; }
  if (now - lastDraw > 66) { drawFrame(active, now / 1000); lastDraw = now; }   // ~15 snímků/s stačí a šetří výkon
  rafId = requestAnimationFrame(frame);
}

/** Budovy mapy s URL spritu (gym jen u města, které gym má; Liga jen na oblasti s Ligou). */
function mapEntries(cityId, map) {
  const gym = getGymForCity(cityId), league = leagueForArea(cityId);
  return map.buildings.flatMap(([id, cx, base]) => {
    // ?v=VERSION: po vydání nové verze si prohlížeč nevezme staré obrázky z mezipaměti
    if (id === "gym") return gym ? [{ id, cx, base, url: `${citySpriteUrl("gym")}?v=${VERSION}` }] : [];
    if (id === "league") return league ? [{ id, cx, base, url: `${citySpriteUrl("league")}?v=${VERSION}` }] : [];
    const def = getBuilding(id);
    return def?.sprite ? [{ id, cx, base, url: `${buildingSpriteUrl(def)}?v=${VERSION}` }] : [];
  });
}

/**
 * Vykreslí mapu města do kontejneru. Kontejner dostane plátno + vrstvu tlačítek nad budovami.
 * @param {HTMLElement} el      kontejner (.city-map)
 * @param {string} cityId
 * @param {object} map           rozložení z data/cityMaps.js
 * @param {{ name: string, labelFor: (id: string) => string, onPick: (id: string) => void }} opts
 */
export function mountCityMap(el, cityId, map, { name, labelFor, onPick }) {
  el.dataset.city = cityId;
  el.innerHTML = `<canvas width="${W}" height="${H}" aria-hidden="true"></canvas><div class="map-hits"></div>`;
  const canvas = el.querySelector("canvas"), hitsEl = el.querySelector(".map-hits");
  const entries = mapEntries(cityId, map);
  const decalDefs = (map.decals ?? []).map(([id, cx, top]) => ({ id, cx, top, url: `${citySpriteUrl(id)}?v=${VERSION}` }));
  Promise.all([...entries, ...decalDefs].map((e) => loadImage(e.url))).then((all) => {
    if (!canvas.isConnected) return;
    const imgs = all.slice(0, entries.length);
    const decals = decalDefs.flatMap((d, i) => { const img = all[entries.length + i]; return img ? [{ ...d, img, w: img.naturalWidth, h: img.naturalHeight, x: Math.round(d.cx - img.naturalWidth / 2), y: d.top }] : []; });
    const placed = entries.flatMap((e, i) => {
      const img = imgs[i]; if (!img) return [];
      // pojistka: nečekaně velký obrázek (stará verze) se zmenší na velikost budovy, ať mapu nerozbije
      const k = img.naturalWidth > MAX_SPRITE_W ? FALLBACK_W / img.naturalWidth : 1, w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      return [{ ...e, img, w, h, x: Math.round(e.cx - w / 2), y: e.base - h + 2 }];
    });
    const key = `${cityId}|${[...entries, ...decalDefs].map((e) => e.url).join(",")}`;
    if (!statics.has(key)) statics.set(key, buildStatic(cityId, name, map, placed, decals));
    active = { canvas, ctx: canvas.getContext("2d"), map, S: statics.get(key) };
    drawFrame(active, performance.now() / 1000);
    if (!REDUCE && !rafId) rafId = requestAnimationFrame(frame);
    const pct = (v, total) => `${(v / total * 100).toFixed(3)}%`;
    hitsEl.innerHTML = placed.map((p) => {
      const label = labelFor(p.id);
      return `<button type="button" class="map-bld" data-id="${p.id}" aria-label="${label}" style="left:${pct(p.x, W)};top:${pct(p.y, H)};width:${pct(p.w, W)};height:${pct(p.h, H)}"><span class="map-tag">${label}</span></button>`;
    }).join("");
    hitsEl.querySelectorAll(".map-bld").forEach((btn) => btn.addEventListener("click", () => onPick(btn.dataset.id)));
  });
}

/** Obnoví popisky budov (úrovně) bez nového vykreslení mapy. */
export function refreshCityMapLabels(el, labelFor) {
  el.querySelectorAll(".map-bld").forEach((btn) => { const label = labelFor(btn.dataset.id); btn.setAttribute("aria-label", label); btn.querySelector(".map-tag").textContent = label; });
}

/**
 * citymapcheck.mjs – kontrola map měst shora (data/cityMaps.js). Spouští tools/citymapcheck.py.
 *
 * Ověří u každé mapy: budovy na mapě = budovy města ve hře (CITY_BUILDINGS) + gym, má-li ho město,
 * + Pokémon League na oblasti s Ligou; soubory plošných prvků (decals) existují;
 * sprite každé budovy existuje; budovy se nepřekrývají a nevyčnívají z mapy 320×180.
 */
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.location = { hostname: "localhost" };
const { CITY_MAPS } = await import(new URL("data/cityMaps.js", root).href);
const { CITY_BUILDINGS, getBuilding } = await import(new URL("data/buildings.js", root).href);
const { getGymForCity } = await import(new URL("data/gyms.js", root).href);
const { AREAS } = await import(new URL("data/areas.js", root).href);
const { leagueForArea } = await import(new URL("data/trainers.js", root).href);

const W = 320, H = 180;
const pngSize = (file) => { const b = readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const genOf = (cityId) => (AREAS.find((a) => a.id === cityId)?.region === "johto" ? 2 : 1);
let fails = 0;
const fail = (msg) => { console.log("FAIL " + msg); fails++; };

for (const [cityId, map] of Object.entries(CITY_MAPS)) {
  const gen = genOf(cityId), want = [...(CITY_BUILDINGS[cityId] ?? [])], hasGym = !!getGymForCity(cityId);
  if (hasGym) want.push("gym");
  if (leagueForArea(cityId)) want.push("league");
  for (const [id] of map.decals ?? []) if (!existsSync(new URL(`assets/gen${gen}/buildings/${id}.png`, root))) fail(`${cityId}: chybí plošný prvek ${id}.png`);
  const ids = map.buildings.map(([id]) => id);
  for (const id of want) if (!ids.includes(id)) fail(`${cityId}: chybí budova ${id}`);
  for (const id of ids) if (!want.includes(id)) fail(`${cityId}: ${id} ve městě není (gym jen u města s gymem, League jen u Ligy)`);
  const boxes = [];
  for (const [id, cx, base] of map.buildings) {
    const file = id === "gym" || id === "league" ? `assets/gen${gen}/buildings/${id}.png` : `assets/gen${gen}/buildings/${(getBuilding(id)?.sprite ?? "").split("/").pop()}`;
    const path = new URL(file, root);
    if (!existsSync(path)) { fail(`${cityId}: chybí sprite ${file}`); continue; }
    const [w, h] = pngSize(path), box = { id, x0: cx - w / 2, y0: base - h + 2, x1: cx + w / 2, y1: base };
    if (box.x0 < 0 || box.x1 > W || box.y0 < 0 || box.y1 > H) fail(`${cityId}: ${id} vyčnívá z mapy`);
    for (const o of boxes) if (Math.min(box.x1, o.x1) - Math.max(box.x0, o.x0) > 0 && Math.min(box.y1, o.y1) - Math.max(box.y0, o.y0) > 0) fail(`${cityId}: ${id} se překrývá s ${o.id}`);
    boxes.push(box);
  }
  console.log(`${fails ? "    " : "OK  "}${cityId.padEnd(18)} ${ids.join(", ")}`);
}
console.log(fails ? `CHYB: ${fails}` : `OK – ${Object.keys(CITY_MAPS).length} map bez chyby`);
process.exit(fails ? 1 : 0);

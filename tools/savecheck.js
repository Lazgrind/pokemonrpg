/**
 * savecheck.js – testy kompatibility savů (systems/save.js).
 *
 * Sdílené pro Node (tools/savecheck_node.mjs, spouští tools/savecheck.py) i prohlížeč
 * (tools/savecheck.html). POZOR: maže localStorage svého prostředí.
 */
import * as Save from "../src/systems/save.js";
import { getState, setState, createNewGame, CURRENT_SAVE_VERSION, SAVE_EPOCH } from "../src/core/state.js";
import { VERSION } from "../src/core/version.js";

const KEY = "pokemonIdleRpg.save";
const lines = [];
let fails = 0;
const check = (name, cond, extra = "") => {
  lines.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? "  | " + extra : ""}`);
  if (!cond) fails++;
};
const reset = () => localStorage.clear();
const stored = () => JSON.parse(localStorage.getItem(KEY));
const reasons = () => Save.listBackups().map((b) => b.reason).sort().join(",");
const putSave = (obj) => localStorage.setItem(KEY, typeof obj === "string" ? obj : JSON.stringify(obj));
/** Jako by se stránka právě načetla (stav hry ještě neexistuje). */
const freshBoot = () => setState(null);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const storageKeys = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));

export async function runSaveChecks() {
  lines.length = 0;
  fails = 0;
  try {
    await run();
  } catch (e) {
    lines.push(`FAIL výjimka: ${(e && e.stack) || e}`);
    fails++;
  } finally {
    reset();
  }
  lines.push(`SUMMARY pass=${lines.filter((l) => l.startsWith("PASS")).length} fail=${fails}`);
  return { lines, fails };
}

async function run() {
  // --- invarianty migrací
  const tos = Save.MIGRATIONS.map((m) => m.to);
  check("MIGRATIONS souvisle od 2", tos.every((t, i) => t === i + 2), JSON.stringify(tos));
  check("CURRENT_SAVE_VERSION = poslední krok", CURRENT_SAVE_VERSION === Save.MIGRATIONS.length + 1,
    `CURRENT=${CURRENT_SAVE_VERSION}, kroků=${Save.MIGRATIONS.length}`);
  check("nová hra má aktuální saveVersion", createNewGame().saveVersion === CURRENT_SAVE_VERSION);

  // --- 1) žádný save
  reset();
  check("1) bez savu → none", Save.loadGame().status === "none");

  // --- 2) nová hra, uložení, načtení
  reset();
  Save.newGame();
  check("2) nová hra bez zálohy (nebylo co zálohovat)", Save.listBackups().length === 0);
  check("2) save nese gameVersion", stored().meta.gameVersion === VERSION);
  getState().resources.gold = 1234;
  Save.saveGame();
  setState(createNewGame());
  let r = Save.loadGame();
  check("2) načtení → loaded, data zachována", r.status === "loaded" && getState().resources.gold === 1234);
  check("2) stejná verze hry → žádná záloha", Save.listBackups().length === 0);

  // --- 3) doplnění chybějících polí (nová funkce bez migrace)
  reset();
  const s3 = createNewGame();
  s3.meta.gameVersion = VERSION;
  delete s3.settings.audio;                    // pole, které starší verze neznala
  delete s3.achievements.stats.gc;
  delete s3.hallOfFame;
  s3.resources.balls = { great: 2 };           // poke spotřebované → klíč smazaný
  s3.resources.items = { potion: 1 };
  s3.story = { momGift: true };
  s3.settings.autoBattle = true;               // volba hráče
  s3.battle = { foo: 1 };                      // jiný tvar než default (null)
  putSave(s3);
  r = Save.loadGame();
  const g = getState();
  check("3) doplněna chybějící pole", r.status === "loaded" && g.settings.audio?.master === 10 && g.achievements.stats.gc?.plays === 0 && Array.isArray(g.hallOfFame));
  check("3) hodnoty hráče nepřepsány", g.settings.autoBattle === true && g.battle.foo === 1 && g.story.momGift === true);
  check("3) mapy id→počet se po klíčích nedoplňují", !("poke" in g.resources.balls) && g.resources.balls.great === 2 && g.resources.items.potion === 1);

  // --- 4) aktualizace hry → záloha, jen jednou
  reset();
  const s4 = createNewGame(); s4.meta.gameVersion = "0.0.1"; s4.resources.gold = 77;
  putSave(s4);
  const raw4 = localStorage.getItem(KEY);
  r = Save.loadGame();
  let b = Save.listBackups();
  check("4) jiná verze hry → záloha 'update'", r.status === "loaded" && b.length === 1 && b[0].reason === "update" && b[0].gameVersion === "0.0.1");
  check("4) záloha = původní text savu", localStorage.getItem("pokemonIdleRpg.backup." + b[0].id) === raw4);
  Save.saveGame();
  Save.loadGame();
  check("4) další načtení už zálohu nedělá", Save.listBackups().length === 1);

  // --- 5) save bez gameVersion a s neplatnou saveVersion (stejná epocha)
  reset();
  const s5 = createNewGame(); delete s5.meta.gameVersion; s5.saveVersion = 0;
  putSave(s5);
  r = Save.loadGame();
  check("5) neplatná/chybějící saveVersion → bere se 1, načte se", r.status === "loaded" && getState().saveVersion === CURRENT_SAVE_VERSION);

  // --- 5b) save ze STARÉ (smazané) hry: jiná/žádná epocha → nenačte se, záloha, nová hra
  reset();
  freshBoot();
  const legacy = createNewGame(); delete legacy.saveEpoch; legacy.saveVersion = 48; legacy.meta.gameVersion = "1.12.4"; legacy.resources.gold = 31337;
  putSave(legacy);
  const rawLegacy = localStorage.getItem(KEY);
  r = Save.loadGame();
  check("5b) save ze staré hry → legacy", r.status === "legacy");
  check("5b) starý save nepřepsán a zazálohován", localStorage.getItem(KEY) === rawLegacy && reasons() === "legacy");
  Save.newGame();
  check("5b) pak čistá nová hra, záloha nezdvojená", getState().resources.gold === 0 && stored().saveEpoch === SAVE_EPOCH && reasons() === "legacy");
  check("5b) obnova staré zálohy odmítnuta", Save.restoreBackup(Save.listBackups()[0].id).reason === "legacy" && getState().resources.gold === 0);
  r = await Save.importSave(new File([await Save.encodeSignedSave(rawLegacy)], "old.txt"));
  check("5b) import exportu ze staré hry odmítnut", !r.ok && r.reason === "legacy" && getState().resources.gold === 0);
  const otherEpoch = createNewGame(); otherEpoch.saveEpoch = SAVE_EPOCH + 1;
  putSave(otherEpoch);
  check("5b) jiná epocha (budoucí reset) → legacy", Save.loadGame().status === "legacy");

  // --- 6) nečitelný save → nic se nepřepíše, záloha
  reset();
  freshBoot();
  putSave("{tohle neni json");
  r = Save.loadGame();
  check("6) nečitelný → unreadable", r.status === "unreadable");
  check("6) save v localStorage zůstal", localStorage.getItem(KEY) === "{tohle neni json");
  check("6) záloha 'unreadable'", reasons() === "unreadable");
  Save.newGame();
  check("6) nová hra po nečitelném savu nezdvojí zálohu", reasons() === "unreadable");
  const unreadId = Save.listBackups()[0].id;
  check("6) obnova nečitelné zálohy selže bez škody", Save.restoreBackup(unreadId).ok === false && getState().saveVersion === CURRENT_SAVE_VERSION);
  putSave("null");
  check("6) save 'null' → unreadable", Save.loadGame().status === "unreadable");

  // --- 7) save z novější verze (návrat na starší nasazení)
  reset();
  const s7 = createNewGame(); s7.saveVersion = CURRENT_SAVE_VERSION + 5; s7.meta.gameVersion = "99.0.0"; s7.futureField = { x: 1 };
  delete s7.settings.audio;
  putSave(s7);
  r = Save.loadGame();
  check("7) novější save se načte + upozornění", r.status === "loaded" && !!r.notice);
  check("7) saveVersion i neznámá pole zachována", getState().saveVersion === CURRENT_SAVE_VERSION + 5 && getState().futureField.x === 1);
  check("7) doplněno, co stará verze potřebuje", getState().settings.audio?.master === 10);
  check("7) záloha 'newer'", reasons() === "newer");

  // --- 8) obnova zálohy
  reset();
  const s8 = createNewGame(); s8.meta.gameVersion = "0.9.0"; s8.resources.gold = 500;
  putSave(s8);
  Save.loadGame();
  getState().resources.gold = 10; Save.saveGame();     // hráč hraje dál
  const up = Save.listBackups().find((x) => x.reason === "update");
  r = Save.restoreBackup(up.id);
  check("8) obnova zálohy vrátí data", r.ok && getState().resources.gold === 500 && stored().resources.gold === 500);
  const before = Save.listBackups().find((x) => x.reason === "before-restore");
  check("8) aktuální hra se před obnovou zazálohovala", !!before);
  r = Save.restoreBackup(before.id);
  check("8) obnovu jde vrátit", r.ok && getState().resources.gold === 10);

  // --- 9) limity počtu záloh
  reset();
  for (let i = 0; i < 6; i++) {
    const s = createNewGame(); s.meta.gameVersion = `0.0.${i}`; s.resources.gold = i;
    putSave(s); Save.loadGame(); await wait(2);
  }
  const ups = Save.listBackups().filter((x) => x.reason === "update");
  check("9) drží se jen 3 poslední zálohy 'update'", ups.length === 3 && ups[0].gameVersion === "0.0.5" && ups[2].gameVersion === "0.0.3",
    ups.map((x) => x.gameVersion).join(","));
  const orphan = storageKeys().filter((k) => k.startsWith("pokemonIdleRpg.backup.") && !ups.some((x) => k.endsWith(x.id)));
  check("9) žádné osiřelé klíče záloh", orphan.length === 0, orphan.join(","));

  // --- 10) migrace (simulovaný budoucí krok přes prepareSave s vlastním seznamem)
  const fake = [
    { to: 2, note: "rename", run(d) { d.settings.newOption = d.settings.legacyOption; delete d.settings.legacyOption; } },
    { to: 3, note: "gold→resources.money", run(d) { d.resources.money = d.resources.gold; } },
  ];
  reset();
  const s10 = createNewGame(); s10.saveVersion = 1; s10.settings.legacyOption = 3; s10.resources.gold = 9;
  const p10 = Save.prepareSave(JSON.parse(JSON.stringify(s10)), JSON.stringify(s10), { migrations: fake, target: 3 });
  check("10) migrace 1→3 proběhnou v pořadí", p10.state.saveVersion === 3 && p10.state.settings.newOption === 3 && !("legacyOption" in p10.state.settings) && p10.state.resources.money === 9);
  const s10b = JSON.parse(JSON.stringify(s10)); s10b.saveVersion = 2; s10b.settings.newOption = 1; delete s10b.settings.legacyOption;
  const p10b = Save.prepareSave(s10b, JSON.stringify(s10b), { migrations: fake, target: 3 });
  check("10) save z v2 spustí jen krok 3", p10b.state.settings.newOption === 1 && p10b.state.resources.money === 9);
  // skutečný krok 2: Sprout Tower / Dragon's Den už nejsou oblasti mapy
  const s10c = createNewGame(); s10c.saveVersion = 1;
  Object.assign(s10c.progress, { activeAreaId: "sprout-tower", visited: ["violet-city", "sprout-tower", "dragons-den"], lastAreaByRegion: { johto: "dragons-den" } });
  s10c.mapPositions = { "sprout-tower": { x: 1, y: 2 } };
  const p10c = Save.prepareSave(s10c, JSON.stringify(s10c)).state;
  check("10) migrace 2: hráč ze Sprout Tower stojí ve Violet City", p10c.progress.activeAreaId === "violet-city" && p10c.progress.lastAreaByRegion.johto === "blackthorn-city"
    && p10c.progress.visited.join() === "violet-city" && !("sprout-tower" in p10c.mapPositions));

  // --- 11) import podepsaného exportu (starší verze hry) → migrace + záloha aktuální hry
  reset();
  Save.newGame(); getState().resources.gold = 42; Save.saveGame();
  const s11 = createNewGame(); s11.meta.gameVersion = "0.5.0"; s11.resources.gold = 999; delete s11.settings.audio;
  const signed = await Save.encodeSignedSave(JSON.stringify(s11));
  r = await Save.importSave(new File([signed], "save.txt"));
  check("11) import starší verze projde", r.ok && getState().resources.gold === 999 && getState().settings.audio?.master === 10);
  check("11) aktuální hra zazálohována před importem", Save.listBackups().some((x) => x.reason === "before-import"));
  r = await Save.importSave(new File([signed.replace(/\|([0-9a-f])/, "|0")], "save.txt"));
  check("11) upravený soubor se odmítne a nic nezmění", !r.ok && getState().resources.gold === 999);

  // --- 12) dojde místo → mažou se zálohy, save se uloží
  reset();
  const big = "x".repeat(900_000);
  for (let i = 0; i < 3; i++) {
    const s = createNewGame(); s.meta.gameVersion = `0.1.${i}`; s.pad = big + i;
    putSave(s); Save.loadGame(); await wait(2);
  }
  const nBefore = Save.listBackups().length;
  let filler = 0;
  try { for (;;) { localStorage.setItem("filler" + filler, "y".repeat(250_000)); filler++; } } catch { /* plno */ }
  getState().pad = big + big + "NEW"; // větší než volné místo → musí se smazat zálohy
  const okSave = Save.saveGame();
  check("12) při plném úložišti se save uloží", okSave && stored().pad.endsWith("NEW"), `záloh před ${nBefore}, po ${Save.listBackups().length}, filler ${filler}`);
  check("12) místo uvolnily zálohy", Save.listBackups().length < nBefore);
  reset();
}


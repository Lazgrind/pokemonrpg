/**
 * audioSystem.js – sprava zvuku (SFX + BGM).
 *
 * Tichý fallback: pokud zvukový soubor neexistuje nebo se nehraje,
 * systém to tiše ignoruje (try/catch, .catch na promise).
 * Hra nikdy nespadne kvůli zvuku.
 *
 * Throttling: hit/faint zvuky se v idle režimu (auto-battle / full-auto)
 * NEPŘEHRÁVAJÍ, aby nespamovaly.
 */

import { getState } from "../core/state.js";

/** Výchozí hodnoty hlasitosti (0–100). */
export const AUDIO_DEFAULTS = {
  // master škáluje všechny kanály (final = master/100 * kanál/100), takže
  // ztlumení na polovinu řešíme jedním číslem: 70 -> 35 = ~o půlku tišší default.
  master: 35,
  music: 50,
  sfx: 80,
  mute: false,
};

/** Mapa SFX názvů na relativní cesty. */
const SFX_MAP = {
  hit: "hit",
  faint: "faint",
  catch: "catch",
  "catch-fail": "catch-fail",
  levelup: "levelup",
  evolve: "evolve",
  hatch: "hatch",
  achievement: "achievement",
  click: "click",
};

/** BGM audio objekt (modul-scope). */
let bgmAudio = null;
let currentBgm = null;

/** Poslední čas přehrání každého SFX (throttling). */
const lastPlayed = {};

/**
 * Vrátí aktuální audio nastavení se fallbackem na defaulty.
 */
export function audioSettings() {
  const settings = getState().settings?.audio;
  if (!settings) return AUDIO_DEFAULTS;
  return {
    master: settings.master ?? AUDIO_DEFAULTS.master,
    music: settings.music ?? AUDIO_DEFAULTS.music,
    sfx: settings.sfx ?? AUDIO_DEFAULTS.sfx,
    mute: settings.mute ?? AUDIO_DEFAULTS.mute,
  };
}

/**
 * Přehraje SFX zvuk.
 * @param {string} name klíč z SFX_MAP
 */
export function playSfx(name) {
  const settings = audioSettings();
  if (settings.mute || settings.master === 0 || settings.sfx === 0) return;

  // Throttle: stejný SFX nehraj častěji než ~70 ms.
  const now = Date.now();
  if (lastPlayed[name] && now - lastPlayed[name] < 70) return;
  lastPlayed[name] = now;

  const path = SFX_MAP[name];
  if (!path) return;

  const url = `assets/audio/sfx/${path}.mp3`;
  try {
    const audio = new Audio(url);
    audio.volume = (settings.master / 100) * (settings.sfx / 100);
    audio.play().catch(() => {}); // tiše polkni chybu (NotAllowedError, 404, atd.)
  } catch (e) {
    // ignoruj
  }
}

/**
 * Přehraje cry (hlas) konkrétního Pokémona.
 * Soubory: assets/audio/cries/<speciesId>.mp3 (stáhne tools/fetch_cries.ps1 z
 * Pokémon Showdown). Cry se řídí hlasitostí SFX; tichý fallback jako u playSfx.
 * @param {string} speciesId id druhu (data/pokemon.js), např. "pikachu", "mr-mime"
 */
export function playCry(speciesId) {
  if (!speciesId) return;
  const settings = audioSettings();
  if (settings.mute || settings.master === 0 || settings.sfx === 0) return;

  // Throttle podle druhu (rychlé překreslení scény nespamuje týž cry).
  const key = `cry:${speciesId}`;
  const now = Date.now();
  if (lastPlayed[key] && now - lastPlayed[key] < 120) return;
  lastPlayed[key] = now;

  const url = `assets/audio/cries/${speciesId}.mp3`;
  try {
    const audio = new Audio(url);
    audio.volume = (settings.master / 100) * (settings.sfx / 100);
    audio.play().catch(() => {}); // tiše polkni chybu (chybějící soubor, NotAllowedError…)
  } catch (e) {
    // ignoruj
  }
}

/**
 * Přehraje BGM (hudbu).
 * @param {string} name klíč BGM (výchozí "main")
 */
export function playBgm(name = "main") {
  const settings = audioSettings();
  if (settings.mute || settings.master === 0 || settings.music === 0) return;

  // Pokud už hraje stejné → jen uprav hlasitost.
  if (currentBgm === name && bgmAudio) {
    bgmAudio.volume = (settings.master / 100) * (settings.music / 100);
    if (bgmAudio.paused) bgmAudio.play().catch(() => {});
    return;
  }

  // Zastavení starého BGM.
  stopBgm();

  const url = `assets/audio/bgm/${name}.mp3`;
  try {
    bgmAudio = new Audio(url);
    bgmAudio.loop = true;
    bgmAudio.volume = (settings.master / 100) * (settings.music / 100);
    currentBgm = name;
    bgmAudio.play().catch(() => {}); // tiše polkni chybu
  } catch (e) {
    bgmAudio = null;
    currentBgm = null;
  }
}

/**
 * Zastaví BGM.
 */
export function stopBgm() {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmAudio = null;
    currentBgm = null;
  }
}

/**
 * Znovu nastavi hlasitost BGM dle aktuálních settings.
 * Pokud je mute nebo master/music = 0, BGM se pausuje.
 */
export function applyAudioSettings() {
  const settings = audioSettings();

  if (bgmAudio) {
    if (settings.mute || settings.master === 0 || settings.music === 0) {
      bgmAudio.pause();
    } else {
      bgmAudio.volume = (settings.master / 100) * (settings.music / 100);
      if (bgmAudio.paused) bgmAudio.play().catch(() => {});
    }
  }
}

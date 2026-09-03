# NOTES – deník projektu Pokémon Idle RPG

Chronologický záznam všeho, o čem se bavíme: diskuze, rozhodnutí, otázky, nápady.
Nejnovější nahoře. Slouží k tomu, abychom vše zpětně dohledali.

> **Stav nasazení:** GitHub Pages zapnuto a funkční na https://lazgrind.github.io/pokemonrpg/ (repo je veřejné → Pages zdarma). Ověřeno 2026-08-31.

Legenda stavů rozhodnutí:
- 🟡 **NÁVRH** – navrženo, čeká na potvrzení
- 🟢 **SCHVÁLENO** – odsouhlaseno, platí
- 🔴 **ZAMÍTNUTO** – neschváleno / opuštěno
- ⚪ **OTEVŘENO** – k dořešení později

---

## 2026-09-03 – Title screen, sdílené nastavení, škálování spritů, GIFy, přesné learnsety (v0.56.0)

### Zadání (uživatel) – 4 body + úpravy
1. **Škálování spritů v souboji**: „pokemoni musí být při roztažení tak 2-3×
   větší a dále z rohu"; posléze zpřesněno: velikost má záviset na **úhlopříčce**
   battle areny (ne že se mění jen aréna a Pokémon zůstává stejný); a „když udělám
   hodně úzký panel, rámečky o Pokémonech překrývají Pokémony" → ošetřit.
2. **Title screen** z `assets/Title_screen.png` při startu s CONTINUE + SETTINGS.
   Klíčová korekce: „ta tlačítka jsou už v tom obrázku namalovaná, ty přes ně
   musíš udělat **klikatelnou zónu** – ne že pod to uděláš vlastní čudlíky."
3. **Learnsety + moves** přegenerovat z PokeAPI (Gen 9 Scarlet/Violet) – stávající
   data byla LLM aproximace (staré generace), ne kanonická. „ten skript na API pro
   moves udělej **globálnější**, budeme ho potřebovat na všechny generace potom."
4. **GIF animace** v manuálním souboji pro **obě strany**; statické PNG v auto/idle.
- Navíc: Ditto pryč ze starterů. A: „ty už neděláš notes ani backlog?" → vést dál.

### Hotovo teď
- **Škálování spritů podle úhlopříčky (JS).** CSS container-query nestačilo
  (drželo se na výškovém stropu u nízkých arén). `battleView.applySpriteScale()`
  měří `.battle-field` přes `getBoundingClientRect`, spočítá úhlopříčku
  (`Math.hypot(w,h)`), nastaví `--sprite = clamp(96..460, diag*0.21)`. Sleduje se
  `ResizeObserver` na rootu + přepočet v `draw()`. Sprite CSS: `width:var(--sprite)`,
  `max-width:44%`. **Úzký panel:** `.c-info` má `flex:0 1 auto; min-width:0;
  max-width:54%; overflow-wrap:anywhere` → rámečky se scvrknou, nepřekrývají sprite.
- **Title screen jako klikací zóny.** `index.html` `#title-screen` = `<img>` +
  dva průhledné `.title-hotspot` (data-act continue/settings) napozicované v %
  změřených z obrázku (1672×941; oba vodorovně 37–63 %, CONTINUE 43–54 %,
  SETTINGS 54–65 %). `src/ui/titleScreen.js` napojí CONTINUE (schová overlay) a
  SETTINGS (otevře sdílený modal). Žádná vlastní tlačítka pod obrázkem.
- **Sdílené nastavení jako modal.** `settingsView.js` přepsán: `renderSettings`
  kreslí jen ⚙ v horní liště, `openSettingsModal()` je sdílený (topbar i title
  screen). Rychlost hry uvnitř; připraveno na další volby.
- **GIF na obou stranách v manuálu.** `combatantHtml(..., animated)` volí příponu
  gif→png→glyph; `draw()` předává `anim = !getAutoBattle()` pro OBĚ strany.
  Root cause chybějících animací = pokrytí (evoluce neměly gify) → dostaženo
  přes `tools/dl_gifs.py` (čte druhy z `data/pokemon.js`, žádný ruční seznam).
- **Přesné learnsety + moves z PokeAPI (Gen 9).** Nový **generačně nezávislý**
  `tools/gen_movepools.py`: druhy i dexNo čte z `data/pokemon.js`; pro každý druh
  vybere level-up movepool z první dostupné version group dle priority
  (scarlet-violet → … → red-blue); stáhne kanonická data tahů. **MERGE** do
  `moves.js`: objektivní staty z API, ale **ruční `effect`/`ailment` pole se
  zachovají** (verbatim). U nových tahů se z PokeAPI meta odvodí bezpečná
  podmnožina efektů (ailment/sleep/confuse/flinch/statChange/recoil/drain/heal/
  highCrit). JSDoc hlavičky obou souborů zachovány. Pustitelný znovu na další gen.

### Rozhodnutí
- 🟢 **Škálování řešit v JS, ne čistým CSS** – úhlopříčka je jediná metrika, co
  splní „2–3× větší a dál z rohu" napříč tvary okna; container-query neumí hypot.
- 🟢 **Title tlačítka = klikací zóny nad obrázkem**, ne vlastní UI (obrázek už je
  má namalované). Souřadnice v % → drží se při libovolném zvětšení obrázku.
- 🟢 **API skript generačně nezávislý** – druhy z dat, VG fallback řetězec, merge
  zachovává ruční efekty. Žádné ruční seznamy druhů v Pythonu (viz dřívější
  „hrozná kravina" s hardcoded dictem).

### Pozn. / k ověření uživatelem
- Odvozené efekty u nových tahů jsou konzervativní (co engine umí); ostatní tahy
  zůstávají „připravené" (jen damage) – doladí se ručně později.
- Ověřit ve hře: zarovnání hotspotů, škálování dle úhlopříčky, úzký panel.

## 2026-09-01 – Krok 5: manuální souboj (menu) + popup nahrazení tahu (v0.35.0)

### Zadání (uživatel)
- Manuální mód jako v klasických hrách: **4 tlačítka Battle / Run / Items / Switch**,
  pod „Battle" útoky. Items = batoh s míčky (chytání), Switch = prohození, Run = útěk.
- Když se jedinec učí **5. tah a má plné 4 sloty** → **vyskakovací volba nahrazení**.

### Hotovo teď
- **Manuální menu** (battleView): při vypnutém Auto battle spodní ovládání = root
  menu (Battle/Run/Items/Switch) + podmenu fight (tahy) / bag (míčky + hod) /
  switch (dlaždice týmu). Akce v battleSystem: `playerMove` / `playerSwitch` /
  `playerCatch` / `playerRun`; společný `runActions()` vytažený z `tick()`
  (null akce hráče = kolo, kde útočí jen nepřítel – po switchi/hodu/chybě).
- **Popup nahrazení tahu.** `learnLevelUpMoves` už tah nezahazuje – při plných
  slotech ho dá do fronty **`state.moveLearnQueue`** (`{uid, moveId}`). Nový
  `moveLearnView.js` frontu sleduje přes `STATE_CHANGED` a postupně nabízí modal:
  ukáže nový tah vedle čtyř stávajících, klik na slot = přepsání, „Don't learn" =
  zahodit. `resolveMoveLearn(uid, moveId, replaceIndex|null)` v pokemonSystem
  mutuje kolekci (nekomituje – commit dělá UI). Funguje i pro tahy z offline
  (fronta je součástí save → **migrace v14**). Auto-vyřeší nesmyslné položky
  (jedinec puštěn / už tah umí / mezitím se uvolnil slot).

### Rozhodnutí
- 🟢 Fronta je **v herním stavu** (ne modul-level), aby přežila reload a pokryla
  offline level-upy. `queueMoveLearn` deduplikuje.
- 🟢 Modal se nezavírá klikem do prázdna – rozhodnutí je záměrné (Escape = skip).

## 2026-09-01 – Rychlý heal na obrazovce prohry + doladění PP regen (v0.34.0)

### Zadání (uživatel)
- PP regen zpět na **1 %/level až 100 %**, ať to chvíli trvá nasbírat.
- Na obrazovce „Defeated" chci **rychlý proklik na Heal team** – překlikávat
  celé město je otravné.

### Hotovo teď
- **PP regen retune:** track `ppRegen` na `poke-center` → `maxLevel 100`,
  `perLevel 1`, `baseCost 120`, `growth 1.1` (bylo 20×5 %). 0 % dokud nekoupeno.
- **Heal team na obrazovce prohry:** overlay `.battle-over` má teď `🏥 Heal team`
  (jen když je co léčit – `teamNeedsHeal()` v battleSystem: chybí HP nebo PP).
  Klik → `healTeam()` → redraw → tlačítko vystřídá „✓ Team healed — ready to go"
  vedle „New battle". Bez chození do Poké Centra.

## 2026-09-01 – Plovoucí damage + PP regen upgrade (v0.33.0)

### Zadání (uživatel)
- Chci, aby damage „lítal" na vizuálu – červené „-7", „-3" apod.
- PP problém vyřešit **PP regenem jako upgradem v Poké Centru**.

### Hotovo teď
- **Plovoucí čísla poškození.** Nový event `BATTLE_HIT` (`{ side, dmg }`).
  `useMove` teď vrací způsobené poškození; `tick()` posbírá zásahy kola a vydá
  je **až po `emit()` (překreslení scény)**, aby float přežil redraw. `battleView`
  na `BATTLE_HIT` spawne `<span class="dmg-float">-N` do `.battle-sprite`
  zasaženého bojovníka (kotva `position:relative`), animace `dmgFloat` (vylétne
  nahoru + fade), po `animationend`/pojistce se odstraní. Minutí = žádný float.
- **PP regen upgrade v Poké Centru.** Nová linie (track) `ppRegen` na `poke-center`
  (`data/buildings.js`): `startLevel 0` (výchozí 0 %, tj. nekoupeno), `maxLevel 20`,
  `perLevel 5` → 0–100 %, `baseCost 150`, `growth 1.18`. `ppRegenPercent()` v
  buildingSystem. Po výhře **v auto battle** `battleSystem.restorePpAfterWin()`
  doplní každému neplnému tahu `floor(maxPp*pct/100)` (aspoň 1) PP. Manuál PP
  neobnovuje – jen ruční **Heal team**. UI: řádek statu v detailu Centra +
  položka v okně Upgrades (`trackUpgradeEffect` case `ppRegen`).

## 2026-09-01 – Krok 4: damage/turn engine přes tahy (v0.32.0)

### Rozhodnutí (🟢 SCHVÁLENO)
- Výběr tahu (auto i nepřítel): **nejvyšší očekávaný damage** – placeholder
  politika, dokud nebude skutečné auto-AI (krok 6, odloženo).
- Když dojdou PP na všech tazích: **Struggle** – slabý typeless útok
  (power 40, bez STAB i typové efektivity). Recoil (zpětné poškození) později.

### Hotovo teď (`src/systems/battleSystem.js`)
- **`calcMoveDamage(attacker, defender, move, avg)`** – damage dle tahu:
  kategorie physical/special (Attack/Defense vs. Sp.Atk/Sp.Def), **STAB ×1.5**
  (shoduje-li se typ tahu s typem útočníka), **typová efektivita**, rozptyl
  0.85–1.0 (nebo střed 0.925 pro `avg`). Status/power 0 → dmg 0.
- **`chooseAction(attacker, defender)`** – z tahů s PP>0 vybere ten s nejvyšším
  očekávaným damage; bez použitelného tahu vrátí **Struggle**.
- **`useMove(attacker, defender, action)`** – spotřebuje 1 PP, hodí na
  **accuracy** (minutí), odečte damage, zaloguje (vč. super/not effective).
- **`turnOrder(actions)`** – pořadí: **priority tahu** (Quick Attack +1) → Speed
  → náhoda. `tick()` teď volí akce obou, seřadí je a odehraje `useMove`
  (padne-li útočník v první půlce kola, druhou už neodehraje).
- **`avgDamage`** (pro idle) teď počítá přes nejlepší tah (`chooseAction` +
  `calcMoveDamage(avg)`) – idle dál ignoruje HP/PP (čistá abstrakce).
- Starý `calcDamage` (fixní power 40) odstraněn.

### Pozn. / backlog
- V auto battle módu Poké Centrum po výhře doléčí **HP, ne PP** → po delším
  běhu tahy dojdou a Pokémon spadne na Struggle. Případné doplnění PP
  (nebo jeho regenerace) zvážit později (viz R-029).

## 2026-09-01 – Krok 3: jedinci mají tahy + PP (v0.31.0)

### Rozhodnutí (🟢 SCHVÁLENO)
- Tvar slotu tahu: **`{ id, pp, maxPp }`** (per-jedinec max kvůli budoucím PP Up).
- Level-up: **auto-naučit nový tah do volného slotu** (max 4); když jsou plné,
  přeskočit (výběr/nahrazování až v manuálním UI, krok 5).

### Hotovo teď
- **`owned.moves`** (≤4 sloty `{id, pp, maxPp}`), přiřazení v `createPokemon`
  přes `defaultMovesFor(speciesId, level)` (z learnsetu, plné PP).
- **Migrace save v12 → v13** – stávajícím doplní tahy z learnsetu dle levelu.
- **Učení při level-upu**: `learnLevelUpMoves(pokemon, prevLevel)` v pokemonSystem,
  volané z `grantXp` (pokryje boj i offline idle). Přidává jen do volných slotů.
- **`healTeam` obnovuje i PP** (plné vyléčení = i plné PP). PP se zatím
  nespotřebovává (přijde s turn enginem, krok 4).
- **Karta Pokémona**: nová sekce **Moves** (jméno, typ, kategorie, PP x/max),
  ať jsou tahy vidět a jde krok 3 ověřit.

### Další
- Krok 4: **damage/turn engine přes tahy** (kategorie physical/special, STAB,
  typy, accuracy, spotřeba PP; `performTurn`). Krok 5: manuální UI (Fight/Run/Switch).

---

## 2026-09-01 – Trvalé HP + základy battle reworku (v0.30.0)

### Zpětná vazba / zadání uživatele
- Bug: „Při souboji pokémoni snižují HP i v týmu, ale poté co pokémon padne, má
  v týmu zase plné HP – to být nemá. Bude problém při battle módu se swapem."
- K modelu HP: „Super, první možnost (trvalé HP), s tím, že by se musel člověk
  vyléčit v Poké Centru." 🟢
- Zpřesnění módů: „Když dá člověk auto battle a padne mu to, je to jeho chyba.
  V kompletním Idle by se HP neřešilo vůbec. V manuálním módu člověk fakt ztrácí
  HP, pokémoni umírají a musí se vyléčit v Poké Centru. Vylepšené Centrum by
  v auto battle módu regenerovalo HP na nějaká procenta – to neplatí pro manuál." 🟢

### Rozhodnutí – model HP (🟢 SCHVÁLENO)
- **Kompletní/background idle** (`idle.js`): HP se neřeší, zůstává abstrakce
  (odhad rychlosti zabíjení ze statů).
- **Auto battle mód**: HP je trvalé; Poké Centrum po výhře doléčí aktivního
  pokémona o % dle levelu Centra (strop `maxPercent`). Wipe = chyba hráče.
- **Manuální mód** (staví se): HP se fakt ztrácí, pokémoni padají; léčení jen
  ručně v Poké Centru.
- Level-up dál léčí na plno (oba módy).

### Hotovo teď
- **Trvalé HP na jedinci** (`owned.hp`) – přežije faint, swap i konec souboje.
  Migrace save **v11 → v12** (stávajícím doplní plné HP). `createPokemon` dává
  nově vzniklým plné HP.
- **`makeCombatant`** napojen na `owned.hp` přes accessor (`combatant.hp` čte/píše
  jedince; clamp do [0, aktuální maxHp], respektuje level-up). Pomocník `hpOf()`.
- **Oprava bugu**: `teamView` čte HP přímo z `owned.hp` (zrušen speciál přes
  `getBattle()`), vyřazený se ukáže s šedým HP barem (`.hpfill.fainted`).
- **Swap na dalšího ŽIVÉHO** člena při faintu; `startBattle` začíná prvním živým
  (celý padlý tým → hláška „heal at the Poké Center“).
- **Doléčení po výhře** v `handleFaint` je nově jen v **auto battle** módu.
- **`healTeam()`** v battleSystem + tlačítko **Heal team** v Poké Centru
  (`buildingView`). Popisek Centra upřesněn: auto-heal po výhře platí pro Auto battle.
- **Battle rework krok 1–2**: `data/moves.js` (8 tahů, model physical/special +
  accuracy + PP) a `data/learnsets.js` (level-up learnsety 6 druhů + `movesAtLevel`).
  Zatím jen data, nezapojeno do hry.

### Další kroky (roadmap battle reworku)
- Krok 3: jedinci mají i **tahy + PP** (`owned.moves`), přiřazení z learnsetu v
  `createPokemon`, migrace save. (Discutovat před implementací.)
- Krok 4: **damage/turn engine přes tahy** (kategorie, STAB, typy, accuracy, PP).
- Krok 5: **manuální UI** (Fight menu, Run, Switch) + ruční heal v Centru.
- Krok 6 (později): auto-battle politika (výběr tahu). ⚪

---

## 2026-09-01 – Battle Area: ovládání část 2 (v0.29.0)

### Zpětná vazba / zadání uživatele
- „Pause dej taky nahoru vedle Auto battle."
- „Tlačítko Catch předěláme úplně s celým dalším krokem interface." → teď needit,
  jen zachovat funkční. ⚪
- „Resume a Auto battle budou 2 jiné entity: resume/pause pozastavuje souboj,
  Auto battle zapíná auto-battle mód (pokémoni bojují sami; opak = manuál později)."
- „Informace o souboji potřebujeme mít taky v okně souboje, jako v normální
  pokémon hře." (textbox)
- „Nastavení Auto catch módu: vedle Auto catch volit, zda chytat všechny pokémony,
  nebo jen shiny (Better IVs zatím zrušíme)." 🟢

### Hotovo teď
- **Pause/Resume přesunuto nahoru** do `.battle-toggles` (vedle přepínačů); řádek
  `.battle-controls` pod scénou zrušen. Tlačítko `#battle-toggle` = pauza/resume
  (nebo Start, když souboj neběží).
- **Oddělení Pause vs Auto battle.** `running` (pauza) a `settings.autoBattle`
  (mód) jsou nezávislé. `schedule()` naplánuje automatické kolo jen když
  `running && getAutoBattle()`. `setAutoBattle` už NEpauzuje – jen (ne)spouští
  tiky (`schedule()` / `clearTimeout`). `restore()` drží `running` ze save
  (pauza přežije refresh); tiky se rozběhnou jen v auto módu. Manuální boj
  (hráč spouští kola) = TODO později.
- **Battle info „textbox"** (`.battle-info`, dřív `.battle-log`) – rámovaný panel
  pod scénou, auto-scroll na nejnovější hlášku (ta výrazněji). Bere zbylé místo,
  posouvá se jen on (okno zůstává fixní).
- **Auto catch mód** – `settings.autocatch = { enabled, mode }`, `mode: "all" |
  "shiny"`. Vedle přepínače Auto catch je `<select>` (All / Shiny only), aktivní
  jen když je Auto catch zapnutý. `shouldAutocatch` = mód "shiny" → jen shiny,
  jinak vše. **Better IVs a New species filtry zrušeny** (`ivWouldImprove` už se
  v souboji nepoužívá). Starý tvar autocatch v save se normalizuje v
  `getAutocatch()` (default `mode:"all"`).
- **Catch tlačítko:** ponecháno funkční beze změny – předělá se s dalším krokem
  interface (⚪ TODO).

---

## 2026-09-01 – Battle Area: fixní okno + přesun ovládání (v0.28.0)

### Zpětná vazba / zadání uživatele
- „Okno musí být fixní, nesmí tam být nikdy posuvník u battle areny."
- „Odebereme možnost rychlosti – nebude se ovládat v tomto menu, ale vytvoříme
  celkové nastavení někde nahoře (viz backlog: lock max level, nuzlocke… – ty
  zatím ne)."
- „Když člověk prohraje (umřou všichni pokémoni), ukáže se v okénku *Defeated* a
  tlačítko *New battle* přímo v okně boje."
- „Nahoře vpravo v okně 2 přepínače (checkbox): 1. Auto battle mód, 2. Auto Catch
  mód. Zatím tohle, zbytek potom." 🟢

### Hotovo teď
- **Fixní okno bez scrollbaru.** `#battle-panel` je flex sloupec `overflow:hidden`;
  `.battle-field` má ohraničenou výšku (`clamp(150px,34vh,300px)`, šířka se dopočítá
  z výšky přes `aspect-ratio` → celý obrázek, žádný ořez); posouvá se jen `.battle-log`
  uvnitř. 🟢
- **Rychlost = GLOBÁLNÍ nastavení.** Přesunuta z okna souboje do `⚙` v horní liště
  (`src/ui/settingsView.js`, kontejner `#settings-controls`). Stav v
  `settings.speed` (default 1), čte `getSpeed()`, mění `setSpeed()` (přeplánuje
  běžící souboj). `battle.speed` zrušeno (serialize/restore/startBattle). 🟢
- **Přepínače vpravo nahoře v okně** (`.battle-toggles` v `.battle-head`):
  - *Auto battle* → `settings.autoBattle` (`getAutoBattle`/`setAutoBattle`). Zapnutí
    spustí/pokračuje souboj, vypnutí pauzne. `restore()` po načtení souboj rozběhne
    jen když je Auto battle zapnuté (jinak pauza + ruční Resume).
  - *Auto catch* → přesunutý dřívější `autocatch.enabled` (filtry New/Better/Shiny
    zůstaly dole pod tlačítkem Catch). Zrušen samostatný checkbox „Autocatch".
- **Defeat overlay** (`.battle-over`) přes celou scénu při `result==="defeat"`:
  nápis *Defeated* + tlačítko *New battle* (volá `toggleBattle` → `startBattle`,
  který tým doléčí na plné HP).
- **Poznámka k rozšíření:** celé okno souboje se ještě bude předělávat („zbytek
  potom") – tohle je mezikrok. Globální nastavení je připravené na další volby
  (Lock max level, Nuzlocke…).

---

## 2026-09-01 – Přepracování souboje: návrh (R-029) + sprity a pozadí do Battle Area

### Zpětná vazba / zadání uživatele
- „Soubojový systém předěláme úplně celý, nevím, zda to dělat teď."
- „Pojďme to celé připravit; zatím ti dám do assets nějaké battlegrounds /
  backgrounds pro souboje."
- Rozhodnutí: **velký přepis teď nekódit**, jen připravit půdu (assety, seam,
  návrh). Malé vizuální kroky, které přežijí přepis, ale nechat.

### Hotovo teď (přežije přepis)
- **Sprity v Battle Area** (`battleView.js`): soupeř zepředu (`front`), náš
  Pokémon zezadu (`back`), vedle info karty. Respektuje shiny i `-f` samice.
  Logika souboje (`battleSystem.js`) **netknuta**. 🟢
- **Pozadí souboje – SDÍLENÁ přes prostředí (biome), ne per route.** Zpětná vazba
  uživatele: „cesty nebudou vázané na route – route-01 může mít stejné pozadí jako
  route-03; pojit v area s obrázky, ne naopak." → přepsáno:
  - Obrázky žijí **naplocho** v `assets/backgrounds/` s popisnými názvy
    (`grass-forest.png`, `grass-path.png`, `grass-field.png`).
  - `data/backgrounds.js` (`BACKGROUND_BIOMES`) mapuje **biome → [soubory]**;
    helper `biomeBackgrounds(biome)`.
  - Oblast se odkazuje přes `area.biome` (Route 1 = `"grassland"`). Víc oblastí
    stejného biome sdílí stejný pool.
  - `battleSystem.pickBackground(area)` losuje z `biomeBackgrounds(area.biome)`,
    uloží do `battle.background` (serializuje/restoruje). **Přehazuje se při každém
    novém setkání** (po výhře i po chycení) → pozadí se mění souboj od souboje;
    během jednoho střetu stabilní (nebliká při tiku).
  - Statický web neumí vylistovat složku → seznam obrázků musí být v datech.
  - Testovací sada rozřezaná z `battlegrounds.png` (714×158 → 3× 238×158).
- **Oprava vizuálu Battle Area – scéna místo karet.** Zpětná vazba: „pozadí vypadá
  strašně, ukazuje se 1/10." Příčina: pole bylo vysoké (dvě neprůhledné karty pod
  sebou), `cover` ze širokého obrázku ukázal proužek a karty ho zakrývaly. →
  `.battle-field` má teď `aspect-ratio: 3/2` (poměr = poměr obrázku, `cover` ukáže
  celý obrázek), pozadí se renderuje **hladce** (`image-rendering: auto`, ne
  pixelated – malované), bojovníci jsou **overlay**: soupeř nahoře (sprite vpravo),
  náš dole (sprite vlevo), jméno + HP/XP v malém průsvitném panelu. Sprity zůstávají
  ostré (pixelated z `.mon-sprite img`). Standard pozadí = **3:2**. `battleView` kreslí vrstvu
  `.battle-field .bg`; chybí-li soubor, prosvítá fallback gradient (CSS 404 nic
  nerozbije). Statický web neumí vylistovat složku → varianty **musí** být v
  datech. Konvence: `assets/backgrounds/README.md`.
  - **Proč v datech, ne autodetekcí:** GitHub Pages nevrací výpis složky; JS by
    musel „hádat" názvy. Pole `backgrounds` v oblasti je jednoznačný zdroj pravdy.
- 🟡 **Čeká na uživatele:** nahrát varianty pozadí do
  `assets/backgrounds/route-01/` (`1.png`, `2.png`; registrováno v `data/areas.js`)
  a chybějící `back`/`front` sprity dalších druhů.

### Návrh celého přepisu (R-029) – SCHVÁLIT PO ČÁSTECH
Cíl: z „textového" auto-souboje udělat plnohodnotnou bojovou obrazovku se sprity,
volbou Auto/Manual a reálnými útoky. Stavíme **fázově**, každá fáze samostatně
funkční (MVP filozofie):

- **Fáze 1 – vizuál (rozpracováno).** Pozadí + sprity (hotovo výše). Zbývá:
  animace útoku (drobný posun/záblesk spritu při zásahu), „faint" animace
  (zprůhlednění/propad), lepší rozvržení (sprity „stojí" ve scéně, HP/XP boxy
  jako overlay v rozích jako v klasických hrách). Čistě UI nad stávající logikou.
- **Fáze 2 – Auto / Manual.** Přepínač režimu (`state.settings.battleMode`).
  - *Auto*: jako teď (tik = výměna úderů, rychlost 1/2/4×).
  - *Manual*: souboj čeká na hráče; hráč klika **útok** (viz fáze 3), pak
    proběhne kolo. Bez Moves zatím jen „Attack" (současný damage vzorec).
  - Řídí se v `battleSystem.tick`/`schedule` (v Manualu se neplánuje autotik).
- **Fáze 3 – Move systém (velký kus, samostatné sezení).**
  - `data/moves.js`: `{ id, name, type, category: "physical"|"special", power,
    accuracy, pp, priority, effect? }`. Napřed pár základních útoků.
  - **Movepool / learnset** na druhu (`data/pokemon.js`): které útoky a od
    kterého levelu se učí; jedinec drží aktivní 4 útoky (`OwnedPokemon.moves` +
    aktuální PP). Save migrace (dorovnat existující jedince výchozím útokem).
  - Damage vzorec rozšířit o `move.power`, kategorii (Attack/Defense vs.
    SpAtk/SpDef), STAB (×1.5 při shodě typu), typovou efektivitu (už máme
    `typeMultiplier`), accuracy (šance na minutí), PP (spotřeba, „Struggle" při 0).
  - UI: v Manualu 4 tlačítka útoků (typ, PP), v Autu volí jednoduchá heuristika.
- **Fáze 4 (později) – statusy a další** (spánek/paralýza/jed…, priority, criticals,
  víc oblastí). Až po fázi 3.

### Datové/technické poznámky k přepisu
- Souboj zůstává **transient** (`battleSystem.js`), do save jen výsledek + nutné
  minimum pro obnovu (už existuje `serialize/restore`). Moves/PP jedince ale
  patří do save (jsou to trvalé vlastnosti jedince, ne stav souboje).
- Držet oddělení DATA (`data/moves.js`, learnsety) → SYSTEMS (výpočet, engine) →
  UI (`battleView.js`). Vzorec damage je už v `battleSystem.calcDamage` – rozšířit,
  ne přepisovat od nuly.
- Pozadí oblasti (`assets/backgrounds/<id>.png`) se hodí i pro obrazovku **mapy**
  (R-028/R-032) – jeden asset, dvě využití.

## 2026-09-01 – HP a EXP bary v týmu, EXP bar v Battle Area (v0.27.0)

### Zpětná vazba / zadání uživatele
- „V rámci team bych prosil o přidání health bar a experience bar. Experience bar
  přidat zatím i pro battle area."

### Co jsem udělal
- **Team tab** (`teamView.js`): každý slot má nově **HP bar** a **EXP bar**.
  - HP bar ukazuje **živé HP jen u toho, kdo zrovna bojuje** (match přes
    `getBattle().player.ref.uid`); ostatní jsou mimo boj → plné max HP. Souboj
    drží aktuální HP jen pro aktivního bojovníka (`battle.player.hp`), jinde se
    HP per-jedinec neukládá, takže „plné mimo boj" je korektní default.
  - EXP bar = `p.xp / xpForNextLevel(p.level)`.
- **Battle Area** (`battleView.js`): pod HP barem hráčova Pokémona přibyl **EXP
  bar** (`combatantHtml(..., showXp=true)`). Nepřítel EXP bar nemá – divoký
  Pokémon XP nesbírá.
- **CSS**: nové `.xpbar`/`.xpfill` (modrá výplň, sdílí track s `.hpbar`) a
  rozvržení `.slot-bars`/`.bar-line` (popisek HP/XP · bar · hodnota).

### Konvence samičích spritů (`-f`) – dořešeno
- Rattata má jiný sprite samice (jen **záda**). Zavedena volitelná přípona `-f`:
  samice zkusí `<view>-f.png`, při chybějícím souboru spadne na výchozí (samčí)
  sprite (mechanismus `data-fb` v `spriteImg`). `-f` se přidává **jen tam, kde se
  sprit liší** – u rattaty tedy jen `back-f.png` a `shiny-back-f.png`.
  Zdokumentováno v `assets/pokemon/README.md`.

## 2026-09-01 – Pipeline na sprity: odstranění pozadí, sjednocení velikosti, stažení z pokemondb

### Zpětná vazba / zadání uživatele
- „Dokážeš odebrat bílé pozadí u snímku?" → ano, flood fill od okrajů.
- „Zkus udělat stejným stylem i front a udělat postavičky stejně velké vždy."
- „Tímhle toolem budeme prohánět všechny obrázky všech pokemonů, až je nahraju."
- „Mohl bych ti poslat `<a><img src=…pokemondb…></a>` a ty z toho vytáhneš sprite."

### Nástroje (v `tools/`)
- **`tools/remove_bg.py`** – jen odstranění pozadí (flood fill od okrajů, světlé/
  bílé/šedé pixely spojené s okrajem → alpha 0; vnitřní světlá místa zůstanou).
- **`tools/prep_sprite.py`** – plná příprava do standardu: odstraní pozadí →
  ořízne na postavu → zmenší (delší strana = **232 px**) → vycentruje na plátno
  **256×256**. Zvětšování `NEAREST` (ostrý pixel-art), zmenšování `LANCZOS`.
  - Dávka: `python tools/prep_sprite.py assets/pokemon` (rekurzivně, přeskočí už
    hotové 256×256 s průhledností; `--force` přepracuje vše).

### Standard spritu (🟢 rozhodnuto)
- Plátno **256×256**, průhledné pozadí, postava **232 px** delší stranou, vycentrovaná
  → všechny postavičky „stejně velké".
- **Názvy (🟢 volba uživatele): `shiny-front` / `shiny-back`** (ne `front-shiny`).
  Kód `src/ui/sprites.js` upraven: shiny varianta = `shiny-${view}`. Sada 4 souborů:
  `front.png`, `back.png`, `shiny-front.png`, `shiny-back.png`.

### Workflow „pošlu HTML, ty vytáhneš sprite" (ověřeno)
- Z `<img src="…">` vezmu URL, stáhnu `curl -sS --ssl-no-revoke -o …` (Windows
  schannel jinak padá na kontrole revokace certifikátu), proženu `prep_sprite.py`,
  uložím do `assets/pokemon/<id>/<view>.png`.
- **Mapování pokemondb (black-white) → náš název:**
  - `…/normal/<id>.png` → `front.png`
  - `…/back-normal/<id>.png` → `back.png`
  - `…/shiny/<id>.png` → `shiny-front.png`
  - `…/back-shiny/<id>.png` → `shiny-back.png`
- Demo: charmander `back-normal` stažen a uložen jako `back.png` (96×96 → 256×256,
  ostrý). Charmander teď má `front.png`, `back.png`, `shiny-front.png`
  (chybí už jen `shiny-back.png`).

## 2026-09-01 – Příprava spritů Pokémonů (bez vkládání obrázků)

### Zpětná vazba uživatele
- „Sprite u pokemonů můžeme zatím připravit a vše, ale zatím je tam nebudu vkládat."
- „Asi budeme potřebovat 4 sprite… front normal, back normal, front shiny a back
  shiny (back pro budoucí boje)."

### Rozhodnutí a stav
- 🟢 **Sada = 4 sprity na druh:** `front.png`, `back.png`, `front-shiny.png`,
  `back-shiny.png`. `back*` je pro budoucí souboj se sprity (R-029).
- **Kód je už hotový** – `src/ui/sprites.js` (`spriteUrl`/`spriteImg`/
  `silhouetteHtml`) skládá cestu `assets/pokemon/<id>/<view>.png` (u shiny přidá
  `-shiny`) a kreslí `<img>` s fallbackem na glyf „?". Zapojeno v Pokédexu a na
  kartě Pokémona; souboj se sprity je samostatný krok (R-029).
- Složky všech 6 druhů připravené; **jediný zbývající krok = nahrát obrázky**,
  žádná změna kódu. README v `assets/pokemon/` aktualizováno na 4 sprity + „kód
  hotový".
- Bez změny verze (jen dokumentace + potvrzení; kód se neměnil).

## 2026-09-01 – Pohlaví jedince ♂/♀ (v0.25.0)

### Zpětná vazba uživatele
- Na otázku „co dál na pořadu dne?" vybráno: **Pohlaví jedince ♂/♀.**

### Co jsme udělali
- **Per-jedinec pohlaví:** každý jedinec má `gender` (`"m"|"f"|"genderless"`).
  `rollGender(species)` v `pokemonSystem.js` losuje z `genderRatio` druhu;
  `createPokemon` ho nastaví (nebo přebere z `opts.gender`). Bezpohlavní druhy
  (Ditto) = `"genderless"`.
- **Save v11:** migrace v10→v11 dorovná stávající jedince (rozlosuje pohlaví
  jednorázově z poměru druhu). `CURRENT_SAVE_VERSION = 11`, typedef `OwnedPokemon`.
- **UI:** helper `src/ui/gender.js` (`genderSymbolHtml`) – ♂ modrá / ♀ růžová,
  genderless nekreslí nic (prázdný span). Zapojeno na kartě Pokémona (jméno +
  řádek „Gender" vedle poměru druhu), na chycených kartách Pokédexu a ve slotech
  Týmu. CSS `.gender.male/.female`.

### Sprity ballů – dodáno + rezervace budoucích
- Uživatel dodal **26 spritů ballů** do `assets/pokeballs/` (konvence `<id>-ball.png`).
  Všech **13 ballů, které hra používá**, tím má obrázek (naskočí samo, emoji fallback
  zmizí). Navíc dorazily sprity pro **13 budoucích** ballů.
- **Rezervace místa (na přání uživatele):** budoucích 13 ballů přidáno do
  `data/pokeballs.js` s `comingSoon: true`, `tier:null`, `price:null` – drží si id
  → napojený sprite, ale NEobjevují se v obchodě ani v souboji. Zapojení později =
  doplnit tier/price/bonus + mechaniku.
- **Beast Ball** – jediný chybějící z kánonu (nemá sprite ani data). Rozhodnuto:
  🟢 **řešit až s Ultra Beasts**, teď záměrně vynecháno (zapsáno v BACKLOGu).

### Otevřené / navazující
- ⚪ **Love ball** má datový základ (pohlaví existuje) – chybí už jen mechanika
  bonusu proti opačnému pohlaví stejného druhu (zapsáno v BACKLOGu).

## 2026-09-01 – Startéři „seen", ikony ballů, caughtBall (v0.24.0)

### Zpětná vazba uživatele
- „Jako seen musíme vždy mít všechny starter pokemony, protože jsme je reálně viděli."
- „Nikde nevidím ikonku pokeballu, ve kterém byl chycen, navíc nevidím ikonku
  pokeballu, kterou jsem ti dával do assetu a má být nahoře jako ikonka i u pokeballu."

### Co jsme udělali
- **Startéři vždy „seen":** `STARTER_IDS` jako jeden zdroj pravdy v `data/pokemon.js`.
  `pokedex.ensureStartersSeen()` je označí; volá se v `chooseStarter` i v `init`
  (dorovná starší save). `pokedexView` a `teamView` už berou startéry odsud.
- **Ikony ballů z assetu:** `src/ui/ballIcon.js` (`ballIconHtml`) – PNG z
  `assets/pokeballs/<id>-ball.png` s emoji fallbackem. Zapojeno v horní liště
  (Poké Balls), ve výběru ballu v souboji a v Poké Martu. Konvence `<id>-ball.png`
  (id „poke" → `poke-ball.png`), jak je v assets/pokeballs/README.md.
- **`caughtBall`:** nové pole na `OwnedPokemon`. Zaznamená se v `doCatch`
  (vybraný ball), startér = „poke", vylíhnutí/dar = null. Save **v10** + migrace
  (staré jedince dorovná na „poke"). Karta ukazuje „Caught in" = ikona + název.

### Rozhodnutí
- Migrace dorovnává staré úlovky na „poke" – ball se dřív nezaznamenával, „poke"
  je nejčastější raný ball; poctivější default než nic. U vylíhnutých/darovaných
  ball nedává smysl → null a karta píše „— (gift / hatched)".

## 2026-09-01 – Karta Pokémona (v0.23.0)

### Zpětná vazba uživatele
- „Pojďme na ty karty pokemonů. Tam bychom viděli všechny informace o pokemonovi
  a i to, kde se dá chytit."
- Připomínka: „Nezapomeň se koukat do backlogu, zda jsi tam ode mě neměl nějaké
  nápady, jak co udělat." → zkontrolováno R-025 (sekce Karta Pokémona).

### Co jsme udělali
- `src/ui/pokemonCard.js` (`openPokemonCard({ uid | speciesId })`): modal se
  všemi informacemi. Chycený jedinec = sprite, level + EXP bar, tabulka statů
  (base / hodnota / IV bar / EV bar) + IV %/total + EV total, poměr pohlaví,
  egg groups, generace, shiny. Viděný druh = silueta + base staty (bez IV/EV).
- „Kde chytit" z `areasForSpecies` (jen skutečné oblasti; jinak „Not found in the
  wild"). Otevírá se klikem na slot v Týmu i kartu v Pokédexu (neznámé druhy ne).

### Rozhodnutí z backlogu
- **Pohlaví:** per-jedinec pohlaví se zatím neukládá → na kartě ukazuji jen
  **poměr pohlaví druhu**, nic si nevymýšlím. Per-jedinec pohlaví = nová ⚪ položka.
- **Ball, ve kterém byl chycen:** pole `caughtBall` v datech neexistuje → na kartě
  zatím není. Přidáno jako ⚪ položka (zaznamenat při chycení + migrace).
- **Vizualizace IV/EV:** zvolil jsem jednoduché bary. Hezčí **hexagonový radar**
  necháváme na později – backlog říká **před grafem načíst skill `dataviz`**.

## 2026-09-01 – Pokédex místo Kolekce (v0.22.0)

### Zpětná vazba uživatele
- „Ano udělejme kartu pokemona, ale předtím vytvoř ten pokedex místo collection."

### Co jsme udělali
- Nová záložka **Pokédex** nahradila Kolekci (`src/ui/pokedexView.js`,
  `renderPokedexTab`). Všechny druhy řazené dle `dexNo`, ukazatel „chyceno X / z Y".
- Tři stavy: **caught** (sprite + akce Team) / **seen** (silueta + jméno + tag
  Seen) / **unseen** (silueta + „???"). Logika v `src/systems/pokedex.js`
  (`markSeen`, `dexStatus`, `dexCounts`, `isCaught`, `areasForSpecies`).
- Nový stav `state.pokedex = { seen: [] }` (chycené se odvozují z kolekce, R-018),
  **save v9** + migrace. `markSeen(id)` se volá v `battleSystem.spawnEnemy`.
- Sprity: `src/ui/sprites.js` (`spriteImg` s fallback glyphem „?", `silhouetteHtml`).
  Hra funguje i bez nahraných obrázků. Cesty `assets/pokemon/<id>/<view>.png`.
- Hledání + filtry (stav All/Caught/Seen/Missing, typ). Neobjevené druhy nejdou
  hledat podle jména (jen dle dex čísla), ať se neprozrazují.
- Výběr startéra a přidání do týmu se přesunuly z bývalé Kolekce do Pokédexu;
  `teamView.js` očištěn (zbyl jen `renderTeamTab`).
- **Sbalitelný changelog** (na žádost uživatele): okno „What's new" ukazuje verze
  jako klik-rozbal (`<details>`), nejnovější rozbalená. Konec scrollování celým
  seznamem. `changelogView.js` teď markdown dělí po `## ` verzích do `<details>`.

### Poznámka
- Levý panel se překresluje na každý `commit` (i v souboji), proto Pokédex po
  re-renderu obnovuje fokus/caret vyhledávání a scroll mřížky.
- `areasForSpecies` je připravené pro budoucí „detail druhu = kde ho chytit"
  (zůstává ⚪ v BACKLOGu) a pro chystanou **Kartu Pokémona** (další krok).

## 2026-09-01 – Schéma druhu: gen + genderRatio (v0.21.0)

### Zpětná vazba uživatele
- „Pojďme možná první na 1. Schéma druhu – přidat `genderRatio` a `gen`. Čistě
  data, nulové riziko, žádný bump save. Základ pro kartu, Pokédex i mapy."

### Co jsme udělali
- `data/pokemon.js`: ke všem druhům přidány `gen` (všichni gen 1) a `genderRatio`
  (startéři 87,5/12,5 ♂/♀, Pidgey/Rattata 50/50, Ditto `"genderless"`). Rozšířeny
  typedefy (`GenderRatio`; `gen`/`genderRatio` na `Species`), poznámka že `id` =
  slug jména = i název složky spritů.
- `gen` řídí, na které mapě se druh chytá (R-032), NEovlivňuje cestu ke spritu
  (sprity zůstávají naplocho podle `id`).

### Poznámka
- Čistě data – **bez save bumpu**, žádná viditelná změna chování (pole se zatím
  nikde nevykreslují, využije je až Karta/Pokédex/mapy). Verze 0.20.1 → 0.21.0.

### Dotaz uživatele: „co když je Pokémon ve víc gen? Víc záznamů?"
- **Ne – jeden záznam na druh.** Vyjasněn rozdíl (zapsáno i do BACKLOG R-032):
  - `species.gen` = generace, kde byl druh *představen* (identita, jedna hodnota).
  - „Kde se dá chytit" = `area.species` (druh může být ve víc oblastech, pořád
    jeden záznam).
  - „Na mapě jen Pokémoni dané generace" = konvence při psaní dat oblastí
    (volitelně helper filtrující `area.species` na `area.gen`), ne napevno přes
    `gen`.
  - Nové evoluce/baby = vlastní druh s vlastním `gen`; regionální formy přes
    samostatné `id`/„formu", ne přes `gen`.

### Otevřené
- ⚪ Volitelná dex pole (`height`/`weight`/`category`/`dexEntry`) doplnit, až je
  bude Karta/Pokédex potřebovat.

### Pracujeme LOKÁLNĚ
- Nic nepushováno – commit/push jen na výslovný pokyn.

---

## 2026-09-01 – Oprava: jedinec v breedingu šel přidat do týmu (v0.20.1)

### Zpětná vazba uživatele
- „Našel jsem ještě chybku, jde do teamu vložit pokemony, kteří jsou již v
  breedingu."

### Co jsme udělali
- `buildingSystem.js`: nový sdílený helper `pokemonEngagement(uid)` →
  `null | "day-care" | "breeding"` (kde je jedinec zaměstnaný mimo tým).
- `team.js`: `addToTeam` nově odmítne jedince, který je ve Školce nebo breedingu
  (guard přes `pokemonEngagement`).
- `teamView.js` (Kolekce): pro takové jedince místo tlačítka „Add to team" ukáže
  „in Day Care" / „in breeding" (stejný vzor jako stávající „in team").
- Pravidlo „jedinec může být jen na jednom místě" je uzavřené v obou směrech –
  pickery Školky/breedingu tým vylučovaly už od 0.20.0.

### Poznámka
- Bez zásahu do save (jen čtení stavu). Verze 0.20.0 → 0.20.1 (patch).
- Vychází z už zaznamenané položky v BACKLOG („Rodič v breedingu vs. tým").

### Pracujeme LOKÁLNĚ
- Nic nepushováno – commit/push jen na výslovný pokyn.

---

## 2026-09-01 – Brainstorm: sprity, karta, Pokédex, boxy, mapa, souboj

### Zpětná vazba uživatele (seznam nápadů z předchozího dne)
1. Předělat strukturu Pokémonů – složka per druh se sprity + info (egg groups,
   male/female %…), ať to není roztroušené a „nepíše se to u každé route".
2. Karta Pokémona (klik na jedince v kolekci/týmu) – IV, EV, staty, EXP bar,
   obrázek, info. + jak dělat sprity (složka per druh, 2 sprity front/back, nebo
   rychlejší metoda?). IV 1–31 v 6 doménách, EV číselně + graf.
3. Pokédex jako záložka u City – chyceno X/Y (Y = počet druhů ve hře), karty
   (sprite + dex číslo + jméno) řazené dle ID, search + filtry, klik = kde se
   druh vyskytuje (jen když objeven).
4. Kolekce → Boxy (PC): boxy po 30 místech, drag & drop, sprity jedinců.
5. Hráč by neviděl, kteří Pokémoni na cestě jsou – jen kolik jich může potkat.
6. Mapa vpravo dole – reálný obrázek oblasti + pozice postavy; kam jít = bar;
   klasická progress pravidla; první svět Kanto.
7. Ball na kartě týmu jako vizuál; uživatel dodá sprity ballů → použít všude.
8. Horní ikonu „počet Pokémonů" změnit na ikonu Pokédexu.
9. Sprite vajíčka per druh (Rattata = bílé s červenými puntíky…), random
   generované každou novou hru na daný průchod.
10. Přepracovat souboj – reálné sprity, animace útoků; přepínač Auto/Manual;
    potřeba front (soupeř) + back (náš) sprite; front i do Pokédexu.
11. Nastavení hry – Nuzlocke, level cap (dle gymu dalšího města), no items,
    no potions…
12. Responzivní layout dle rozlišení (zúžit levý, roztáhnout pravý; úzké Město
    domek pod domkem).

### Co jsme udělali
- Vše zapsáno do `docs/BACKLOG.md`: rozšířeny sekce Chytání (skryté druhy),
  Vajíčka (egg sprity), Poké Bally (ikony všude + ball na kartě); nové sekce
  Sprity + struktura dat, Karta Pokémona, Pokédex, Boxy, Mapa světa, Souboj –
  přepracování, Nastavení hry, Responzivní layout. Nová R-čísla R-023…R-031
  jako **návrhy** (⚪, čekají na potvrzení).

### Moje doporučení (návrhy k potvrzení)
- 🟡 **R-024 Sprity:** konvence `assets/pokemon/<id>/front.png` + `back.png`
  (+ shiny varianty později), cesty se **odvozují z `id`** → nic se neregistruje
  ani nepíše per druh (to je ta rychlejší metoda). Front se recykluje na
  souboj-soupeř, Pokédex i kartu; back jen náš Pokémon v souboji.
- 🟡 **Struktura dat:** DATA nechat centrálně v `data/pokemon.js` (jen rozšířit
  schéma o `genderRatio` ap.), složku per druh použít **jen na assety**. Pozn.:
  info o druzích už teď NENÍ u routes (oblast drží jen `species: [...]`), takže
  ta bolest je z větší části vyřešená.
- 🟡 **R-021/egg sprity:** procedurální vzor z druhu; k rozhodnutí deterministicky
  (přenosná znalost) vs. seedované per-průchod (`runSeed` do save).
- 🟡 **R-029 Souboj:** fázově – (1) sprity + animace, (2) Auto/Manual přepínač,
  (3) reálné Moves (nový `data/moves.js`, velký kus).

### Upřesnění uživatele (2026-09-01, 2. kolo)
- **Mapy per generace:** bude mapa pro každou generaci a na dané mapě jdou chytit
  jen Pokémoni té generace. → nové R-032; přidáno pole `gen` na druh; data i
  sprity členit per generace.
- **Sprity podle jména, ne čísla** (u 1000+ je číslo nepoužitelné). Vyjasněno:
  `species.id` už JE slug jména (`pikachu`). Konvence `assets/pokemon/<id>/front.png`.
  Slug (ne `name`) kvůli mezerám/diakritice/apostrofům v cestách.
- **Složka spritů naplocho** – uživatel NEchce dělit po generacích, všechny druhy
  vedle sebe v `assets/pokemon/`. `gen` na druhu zůstává, ale jen pro mapy/spawn
  (R-032), na cestu ke spritu nemá vliv.
- Požádáno o **2–3 nejlevnější položky** → doporučeno: (1) rozšíření schématu
  druhu `genderRatio`+`gen` (data-only), (2) responzivní layout (CSS-only),
  (3) `caughtBall` seam + `ballIcon()` helper.

### Otevřené / k rozhodnutí příště
- ⚪ Čím začít z nabídnuté trojice (doporučeno #1 jako základ).
- ⚪ Egg sprity: deterministicky vs. per-průchod.
- ⚪ Pořadí větších milníků: **sprite konvence + Karta Pokémona** → **Pokédex**
  → **Boxy** → **Mapa (per generace)** → souboj + nastavení.

### Pracujeme LOKÁLNĚ
- Nic nepushováno – jen dokumentace (BACKLOG/NOTES). Commit/push na pokyn.

---

## 2026-08-31 – Breeding podle egg groups (v0.20.0)

### Zpětná vazba uživatele
- „Egg groups pojďme dořešit, má to být na stejném principu jako ve franchise:
  každý má egg group a stejné egg group (popřípadě žolíci) spolu udělají vajíčko,
  které může mít lepší IVs nebo být shiny, tentokrát s odds 1/4096."
- Na doplňující otázky: **přidat Ditto teď** (žolík); **dědění 3 IV / 3 random**
  s tím, že později přibude item Destiny Knot (pak 5 dědí).
- Následně: „Ditto nedávej na Route 1, dej mi ho prozatím jako startera."

### Co jsme udělali
- `data/pokemon.js`: přidán **Ditto** (dexNo 132, egg group `ditto`).
- `data/breeding.js` (nové): laditelná data + čistá pravidla nad druhy –
  `BREED_MINUTES=30`, `INHERIT_IV_COUNT=3`, `BREED_SHINY_CHANCE=1/4096`,
  `areCompatible()` (sdílená egg group / žolík; dva Ditti ne; `no-eggs` ne),
  `chooseChildSpeciesId()` (žolík → druhý rodič, jinak náhodně jeden).
- `pokemonSystem.js`: `inheritIvs(parents, count)` – zdědí `count` náhodných
  statů po náhodném rodiči, zbytek random (losuje se až při vylíhnutí).
- `buildingSystem.js`: breeding slot `city.daycare.breeding = { a, b, buffer }` +
  `get/setBreedingParent`, `clearBreedingParent`, `getBreedingParents`. Výcvik a
  breeding se navzájem vylučují.
- `breedingSystem.js` (nové): `breedingStatus`, `accrueBreeding` (produkce vejce
  aktivně i offline, více najednou), smyčka + `applyBreedingOffline`. Vejce vzniká
  přes `makeBredEgg` v `eggSystem.js` a nese `breed = { parents, inherit, shinyChance }`.
- `eggSystem.js`: při vylíhnutí breeding vejce použije `inheritIvs` + `shinyChance`.
- `buildingView.js`: okno **„💞 Breeding"** (dva rodičovské sloty, kompatibilita,
  progress). Výběr Pokémona sjednocen do obecného `openPokemonPicker` (sdílí
  Školka i breeding).
- `main.js` + `offlineView.js`: offline breeding + hláška `EVENTS.EGG_BRED`.
- Ditto **dočasně jako starter** (`teamView.js`), ať jde breeding vyzkoušet.
- Save **v7 → v8** (breeding slot lazy).

### Rozhodnutí
- **R-022 🟢 Breeding podle egg groups.** Sdílená egg group nebo žolík Ditto →
  vejce po `BREED_MINUTES`; dědí 3 IV (laditelné, budoucí Destiny Knot = 5), shiny
  1/4096. Druh i genetika skryté do vylíhnutí (drží R-021). (schváleno 2026-08-31)

### K ověření uživatelem v prohlížeči (tvrdý refresh!)
- Nová hra → jako startera lze vybrat **Ditto**. Chyť/měj druhý druh (např.
  bulbasaur), oba dej do Školky → „💞 Breeding" → Parent A/B.
- Ditto + cokoli = kompatibilní; dva stejné egg groupy = kompatibilní; nekompatibilní
  pár to hlásí. Progress bar roste; po čase (i offline) přibude 🥚 v inventáři.
- Vylíhni breeding vejce → potomek má část IV po rodičích, shiny šance vyšší.

### Otevřené / další v plánu
- ⚪ Ditto ze starterů → běžný úlovek; Destiny Knot item (5 IV); rychlost
  breedingu jako upgrade; potomek = základní forma po evolucích. (viz BACKLOG)

### Pracujeme LOKÁLNĚ
- Nic nepushováno – commit/push jen na výslovný pokyn.

---

## 2026-08-31 – Market okno v Poké Martu (v0.19.0)

### Zpětná vazba uživatele
- „V rámci Poké Martu bych chtěl tlačítko Market, pod kterým by se schovávaly
  itemy rozdělené do sekcí. Zatím udělej sekci pro pokebally."

### Co jsme udělali
- `buildingView.js`: `openMarket()` je **rozcestník sekcí** (departments) jako
  karty (`.dept-card`); `openBallShop()` je samostatné okno sekce Poké Balls,
  kde jsou jednotlivé bally přehledné **bary** (řádky `.ball-row`).
- **Zamčené / neodemčené věci se v obchodě neukazují** vůbec – seznam ballů
  filtruje `ball.price != null && isBallUnlocked(ball)`, takže je vidět jen to,
  co jde teď koupit. Připraveno na další sekce (items, kameny).
- `css/main.css`: `.market-depts / .dept-card` (rozcestník karty) +
  `.ball-shop / .ball-row / .ball-buy` (bary); `.ball-card*` odstraněny.

### Poznámka
- Doladění dle uživatele: rozcestník sekcí = okna (karty), jednotlivé bally =
  bary (přehlednost), a zamčené věci schované. Stejný vzor jako „Upgrades" –
  hlavní okno budovy zůstává čisté, detail je za klikacími okny.

---

## 2026-08-31 – Filtry v pickerech (v0.18.0)

### Zpětná vazba uživatele
- „Chtěl bych filtry jak u Day Care, tak u Hatch an egg – rarity, jméno atd."

### Rozhodnutí
- 🟢 Day Care picker: hledání jménem + přepínače **rarita**, **typ**, **jen
  shiny** + **řazení** (level ↓ / jméno / dex). Nabídky se staví z toho, co hráč
  vlastní.
- 🟢 Egg picker: **respektovat skrytí druhu** (R-021) – filtr jen podle rarity
  a řazení podle doby líhnutí (↑/↓). Žádné jméno/druh/typ (byl by to spoiler).

### Co jsme udělali
- `buildingView.js`: `openDaycarePicker` a `openEggPicker` přepsány na
  filtrovací panel (`.filter-bar`, chips `.filter-chip`, `renderGrid()` řadí a
  filtruje client-side, bez commitu). Dlaždice Pokémona ukazují i raritu/typ.
- `css/main.css`: styly `.filter-bar / .filter-row / .filter-chip / .filter-sort`.
- Na přání: celý filtrovací panel je schovaný pod tlačítkem **„🔎 Filters"**
  (`.filter-bar[hidden]` + toggle), aby picker zůstal čistý.

### Zpětná vazba uživatele
- „Hatch an egg chci mít vizuálně tak, že se ukáže max 10 egg breederů, tolik
  kolik mám odemčeno; zamčené budou zamčené. Pod nimi čudlík Hatch an egg."
- „Chci všude mít upgrade taky za klikacím menu… celé zpřehlednit."
- „Vajíčka nemáš vědět, co tam je za druh, dokud se nevylíhne."

### Rozhodnutí (výběr)
- 🟢 Upgrady: **podnabídka v okně** – tlačítko „Upgrades" otevře samostatné okno
  se všemi liniemi (budova + tracks). Platí pro všechny budovy.
- 🟢 Zamčené egg sloty: **jen ikona zámku** 🔒 (odemyká se v Upgrades menu).
- 🟢 Vejce: **skrýt druh, nechat čas** – ukazuje se jen „Egg" + postup/čas.

### Co jsme udělali
- `buildingView.js` přepsán: hlavní okno budovy = stav + akce (obchod / školka /
  breederi). Nová funkce `openUpgrades()` (společné okno upgradů).
- **Egg Breeders okno**: v Day Care jeden čudlík „🥚 Hatch an egg" otevře okno
  s mřížkou hatcherů (`.breeder-grid`, max = `eggSlots.maxLevel`). Odemčená
  prázdná hatchery = vlastní tlačítko „Hatch an egg" (výběr vejce), obsazená =
  🥚 + progress + čas + „Take out", zamčená = „Locked" 🔒.
- Druh vejce **skryt** v breederech i v pickeru – jen „Egg #N" + odhad `~X min`
  (čas dle rarity ponechán jako jediná nápověda).
- `css/main.css`: styly `.breeder-*` a `.upgrade-*` (staré `.egg-incubator*`
  nahrazeny).

---

## 2026-08-31 – Upgrady Školky: rychlost líhnutí + sloty (v0.16.0)

### Zpětná vazba uživatele
- „Ještě bych v rámci daycare chtěl vylepšení na rychlost líhnutí od 1 %–50 %
  a pak sloty hatchování 1–10 slotů pro vajíčka."
- Rozhodnutí přes výběr: **dvě oddělené upgrade linie** (každá s vlastní úrovní
  i cenou).
- Oprava: „A rychlost jsem chtěl na 50 lvl ne 10." → 🟢 Hatch speed má **50
  úrovní** (+1 %/lvl = +50 %), Egg slots zůstávají 10 úrovní (1→10 vajec).

### Co jsme udělali
- `data/buildings.js`: obecný `tracks` (typedef `TrackDef`) na Školce –
  `hatchSpeed` (Lv 1→50, baseCost 50, growth 1,12) a `eggSlots`
  (Lv 1→10, baseCost 300, growth 1,7).
- `buildingSystem.js`: obecné funkce linií (`getTrackLevel`, `trackUpgradeCost`,
  `upgradeTrack`, …) + `hatchSpeedPercent()` a `eggSlotCount()`. Úroveň žije v
  `city.buildings[id].tracks[key]`.
- `eggSystem.js`: inkubace přešla ze single slotu (`city.daycare.egg`) na **pole
  slotů** (`city.daycare.eggs`) s lazy migrací (bez bumpu save verze).
  `accrueIncubation`/`applyEggOffline` vrací **pole** vylíhnutých vajec;
  `speedMultiplier()` zrychluje dle `hatchSpeedPercent`.
- UI (`buildingView.js`): řádek pro každé inkubované vejce s vlastním „Take out",
  staty „⏩ Hatch speed / 🥚 Egg slots used/max", dvě upgrade tlačítka.
  `offlineView.js` + `main.js` zpracují pole vylíhnutých vajec.

### Poznámka
- Mechanismus `tracks` je obecný – použitelný pro budoucí upgrade linie jiných
  budov (data → logika → UI beze změny základní budovy).

---

## 2026-08-31 – Vajíčka a líhnutí (v0.15.0)

### Zpětná vazba uživatele
- „Tak pojďme na ta vajíčka." + připomněl vazbu na `acquirePokemon`.
- Rozhodnutí přes výběr: druh ve vejci = **náhodný druh z oblasti**; genetika
  (IV/shiny) se losuje **až při vylíhnutí**; doba líhnutí **podle rarity druhu**.

### Co jsme udělali
- `data/eggs.js` (nový): rarity → doba líhnutí (min), `EGG_DROP_CHANCE = 0,03`,
  rozsah levelu vylíhnutí 1–5.
- `data/areas.js`: přidán `species` pool oblasti (Route 1: pidgey/rattata).
  `battleSystem.spawnEnemy` losuje odtud (dřív natvrdo `ENEMY_POOL`).
- `src/systems/eggSystem.js` (nový): `rollEggDrop(area)` (drop po výhře),
  inventář `state.eggs`, inkubace ve druhém slotu Školky
  (`city.daycare.egg`), `accrueIncubation` (aktivní smyčka + offline dopočet,
  bez nerfu, strop `OFFLINE_CAP_HOURS`), po dosažení doby vylíhne přes
  `acquirePokemon()` (R-018) – genetika se rolluje teprve tady.
- `battleSystem.handleFaint`: po výhře losuje vejce + píše do logu.
- `buildingView`: Školka má sekci inkubace (progress bar) + výběr vejce
  (`openEggPicker`), tlačítka „Incubate an egg" / „Take egg out".
- `offlineView`: sekce „vejce se vylíhlo" v přehledu „Welcome back".
- `main.js`: `applyEggOffline`, `startEggLoop`, 🥚 počet vajec v liště,
  hláška při vylíhnutí za běhu (`EVENTS.EGG_HATCHED`).
- Save **v6 → v7** (`eggs: []`; slot inkubace lazy).

### Rozhodnutí
- **R-021 🟢 Vajíčka + líhnutí.** Drop po výhře (druh z oblasti), genetika až při
  vylíhnutí, doba líhnutí dle rarity, líhnutí přes `acquirePokemon`. (schváleno
  2026-08-31)

### K ověření uživatelem v prohlížeči (tvrdý refresh!)
- Vyhrávej souboje → občas „🥚 You found a … Egg!"; v liště roste 🥚.
- Školka → „Incubate an egg" → progress bar; po čase (i po návratu offline) se
  vylíhne a objeví v kolekci (nebo zlepší IV, když druh už máš).

### Otevřené / další v plánu
- ⚪ Breeding podle egg groups (staví na tomto systému).
- ⚪ Shiny-boost u vajec (Masuda), egg chance/doba per oblast.

### Pracujeme LOKÁLNĚ
- Nic nepushováno – commit/push jen na výslovný pokyn.

---

## 2026-08-31 – Unikátní druhy + výběr do školky jako boxy (v0.10.0)

### Zpětná vazba uživatele
- „Každého pokemona můžeš mít jenom 1." + „vybírání pokemonů v daycare bych rád měl jako boxes / bar… když má člověk 1100 pokemonů, tak tam nevybere ani prd."

### Co jsme udělali
- `team.js`: `ownsSpecies()` + `catchWild` chytá jen nevlastněné druhy; při vyčerpání nekonzumuje Poké Ball.
- `buildingView.js`: výběr do školky = tlačítko v detailu → samostatné okno `openDaycarePicker` s mřížkou dlaždic (`.daycare-grid`) + hledáním podle jména (`#daycare-search`, filtruje viditelnost dlaždic bez re-renderu). Klik na dlaždici uloží a zavře. Nahradilo `<select>`.
- CSS `.daycare-picker/.daycare-search/.daycare-grid/.daycare-tile`.

### Rozhodnutí
- **R-017 🟢 Každý druh Pokémona jen 1× (unikátní kolekce = de facto Pokédex).** (schváleno 2026-08-31)
- **R-018 🟢 Výběr Pokémona (školka) jako mřížka dlaždic s hledáním, ne rozbalovací seznam.** (škáluje na stovky+)

### Otevřené
- ⚪ Starší duplikáty v existujícím save se nemažou automaticky (nevratné) – pročistit jen na vyžádání.
- ⚪ Stejný „box" picker se hodí i jinam (např. správa týmu/kolekce), až bude druhů víc.

### Pracujeme LOKÁLNĚ
- Od v0.9.0 nic nepushováno na GitHub (viz zpětná vazba uživatele) – commit/push jen na výslovný pokyn.

---

## 2026-08-31 – Školka (Day Care) + vyvážení Centra (v0.9.0)

### Zpětná vazba uživatele
- „Udělejme daycare, jako školku." + „snížení healingu v rámci pokecenter na 1 % za level s max 50 %".

### Co jsme udělali
- **Školka** `data/buildings.js` (`day-care`, `daycare { xpPerMinute:3, perLevel:3 }`) + `src/systems/daycare.js`.
  - Slot svěřence v `city.daycare { uid, buffer }` (zlomkový XP buffer, nic se neztrácí).
  - Aktivní smyčka `startDaycareLoop` (tik 15 s, commit jen když padne aspoň 1 XP) + offline `applyDaycareOffline` (plná rychlost, strop 8 h – NENÍ nerfováno ×0,1 jako bojový idle, protože pasivní výcvik je smysl budovy).
  - Do školky lze dát jen Pokémona mimo tým (zabrání dvojímu XP a rozladění statů bojovníka).
  - `buildingView` rozšířen o sekci školky (výběr/vyzvednutí), `offlineView` je sekcový (souboj + školka).
- **Centrum vyváženo** dle přání: `heal { basePercent:1, perLevel:1, maxPercent:50 }`, `healPercent()` respektuje strop.
  - Aby šel strop 50 % reálně dosáhnout při 1 %/úroveň, Centrum má `maxLevel:50` a mírnější křivku `upgrade { baseCost:50, growth:1.12 }`. **K rozhodnutí:** jestli je 50 úrovní OK, nebo raději méně úrovní / jiná křivka.
- Bez změny verze save – slot školky se doplňuje lazy (jako budovy).

### Rozhodnutí
- **R-015 🟢 Třetí budova = Školka (pasivní idle XP, offline v plné rychlosti, strop 8 h).** (schváleno 2026-08-31)
- **R-016 🟢 Léčení Centra = 1 %/úroveň, strop 50 %.** (schváleno 2026-08-31; dosažitelnost stropu řešena zvýšením max. úrovně na 50 – k případnému doladění)

### K ověření uživatelem v prohlížeči (tvrdý refresh!)
- Ve městě přibyla Školka; klik → výběr Pokémona mimo tým → „Dát do školky"; svěřenec pomalu levuje (i po návratu se ukáže v přehledu „Vítej zpět").
- Centrum: doléčení po výhře je teď mnohem nižší (1 % na Lv 1).

### Otevřené / další v plánu
- ⚪ Doladit křivku/úrovně Centra podle pocitu z 1 %/úroveň.
- ⚪ Vlastní obrázkové sprity pro Školku.
- ⚪ Další budovy: 🏦 Banka (idle gold), 💻 PC/Box, 🏋️ Gym.

---

## 2026-08-31 – Druhá budova: Pokémon Centrum (v0.8.0)

### Zpětná vazba uživatele
- „Uděláme další budovy, chci mít město tak nějak hotové." Nabídl jsem přehled budov (Centrum, Školka, Banka, PC, Gym) s jejich herní funkcí a doporučil začít třemi idle pilíři; uživatel vybral **Pokémon Centrum**.

### Co jsme udělali
- `data/buildings.js`: nová budova `poke-center` s polem `heal { basePercent: 10, perLevel: 5 }`. `ball` je nyní volitelné pole.
- `buildingSystem.js`: `healPercent()` (10 % + 5 % za úroveň).
- `battleSystem.js`: po vítězství (mimo level-up, kde se HP plní na max) Centrum doléčí hráče o % max HP a zapíše to do logu. Import ze `buildingSystem`.
- `buildingView.js` přepsán na **datově obecný** detail: stat sekce i akce se skládají podle schopností budovy (`ball`/`heal`), upgrade společný.
- CSS `.iso-b-poke-center` fasáda (bílá klinika) jako fallback bez obrázku; `color` střechy `#e0524e`.
- Otestováno v local buildu.

### Rozhodnutí
- **R-014 🟢 Druhá budova = Pokémon Centrum; efekt „doléčení po vítězství" (% max HP, škáluje s upgradem).** (schváleno 2026-08-31)
  - Zvolen model „heal po výhře" místo plynulé regenerace: celá čísla HP, tematické, žádná změna save verze.

### K ověření uživatelem v prohlížeči (tvrdý refresh!)
- Ve městě přibyla budova Pokémon Centrum (fallback domeček s červenou střechou), klik otevře detail s doléčením a upgradem. V logu souboje se po výhře objeví „Centrum doléčilo …".

### Otevřené / další v plánu
- ⚪ Další budovy dle přehledu: 🐣 Školka (idle XP), 🏦 Banka (idle gold), 💻 PC/Box, 🏋️ Gym.
- ⚪ Vlastní obrázkové sprity pro nové budovy (zatím CSS fallback).

---

## 2026-08-31 – Obrázkový sprite budovy (v0.7.0)

### Zpětná vazba uživatele
- CSS budova vypadala jako modrá kostka; uživatel dodal vlastní pixel-art obrázek Poké Martu.

### Co jsme udělali
- Vytvořena složka `assets/buildings/`; uživatel nahrál `pokemart.png` (447×447, čelní pixel-art se světle modrým pozadím).
- Pillow skript odstranil pozadí (flood fill z rohů, thresh 40) a ořízl → `poke-mart.png` (271×263, průhledné).
- `data/buildings.js`: nové pole `sprite`; `cityView.js` zobrazí budovu jako `<img>` (CSS domeček zůstává fallback). `image-rendering: pixelated`.
- Klik na sprite dál otevírá detail budovy.
- Otestováno v local buildu (HTTP 200).

### Rozhodnutí
- **R-013 🟢 Budovy jako obrázkové sprity (lokální assety, bez závislostí), vzhled řízený daty.** (schváleno 2026-08-31)
  - Původní obrázek `pokemart.png` ponechán jako zdroj; hra používá zpracovaný `poke-mart.png`.

### K ověření uživatelem v prohlížeči (tvrdý refresh!)
- Záložka Město ukáže pixel-art Poké Mart (bez modrého čtverce kolem); klik otevře detail; volné parcely zůstávají.

---

## 2026-08-31 – Izometrické 2.5D město (v0.6.2)

### Zpětná vazba uživatele
- Mřížka čtverců mu nestačila, chtěl **3D vizualizaci města**.

### Rozhodnutí (probráno jako větší feature)
- Nabídnuty 3 cesty: A) izometrické 2.5D (CSS), B) skutečné 3D (Three.js/WebGL), C) 2D ilustrované.
- Upozornění: skutečné 3D přidává externí závislost, výrazně složitější kód, potřebuje víc prostoru než úzký levý panel, a vzhled je dle zadání nejnižší priorita.
- **R-012 🟢 Vizualizace města = izometrické 2.5D (CSS).** (schváleno 2026-08-31)
  - WebGL 3D odloženo jako pozdější volitelný upgrade (klidně v celoobrazovkovém režimu města).

### Co jsme udělali
- `cityView.js` + CSS: izometrické domečky (střecha + 2 stěny přes `clip-path`, stínování přes `brightness`), travnatá plocha, volné parcely jako ploché kosočtverce, hover „nadzvednutí“.
- Barva střechy je datová (`color` v `data/buildings.js`).
- Detail budovy (modal z v0.6.1) beze změny.
- Otestováno v local buildu (moduly HTTP 200).

### K ověření uživatelem v prohlížeči (tvrdý refresh!)
- Záložka Město ukáže izometrické domky na trávě; Poké Mart je klikatelný a otevře detail; volné parcely jsou naznačené.

---

## 2026-08-31 – Město jako klikatelná mapa (v0.6.1)

### Zpětná vazba uživatele
- Budovy nechtěl jako seznam, ale jako **skutečné město**, kde se klikne na jednotlivou budovu a otevře se její menu s možnostmi.

### Co jsme udělali
- `cityView.js` přepsán na **mapu města**: budovy = klikatelné dlaždice (ikona, název, úroveň) + volné parcely (🏗️) naznačující růst města.
- Nový `src/ui/buildingView.js`: **detail budovy jako modal** – po kliknutí na budovu; možnosti (Koupit Poké Ball / Vylepšit), živě aktualizovaná čísla (přes STATE_CHANGED), zavření tlačítkem / Esc / klikem mimo.
- Styly mapy města (`.city-map`, `.plot`…) a detailu budovy.
- Bez zásahu do herní logiky/dat (jen UI) – `buildingSystem.js` a `data/buildings.js` beze změny.
- Otestováno v local buildu (moduly HTTP 200).

### Rozhodnutí
- **R-011 🟢 Město jako vizuální klikatelná mapa; možnosti budovy v detailu (modal).** (schváleno 2026-08-31)
  - Rozšiřitelné: přidání budovy = jen data; volné parcely dají prostor pro růst.

### K ověření uživatelem v prohlížeči
- Záložka Město ukáže mapu; klik na Poké Mart otevře detail s nákupem/vylepšením; zavření funguje; po akci se čísla i úroveň dlaždice aktualizují.

---

## 2026-08-31 – Krok 5: město + building → MVP hotovo (v0.6.0)

### Co jsme udělali
- Zaveden koncept **City → Building**: `data/buildings.js` (definice, cenové křivky) + `src/systems/buildingSystem.js` (`getLevel`, `upgradeCost`, `upgradeBuilding`, `ballPrice`, `buyPokeballs`).
- První budova **Poké Mart**: nákup Poké Ballů za gold; vylepšení budovy (Lv 1–10) postupně snižuje cenu Poké Ballu (z 30 na min. 6). Cena vylepšení roste ×1,6.
- Funkční záložka **Město** `src/ui/cityView.js` (karta budovy, tlačítka Koupit / Vylepšit, disabled při nedostatku goldu). Styly budov + disabled tlačítek.
- Stav rozšířen o `city.buildings`, `CURRENT_SAVE_VERSION = 3`, migrace v2 → v3.
- Otestováno v local buildu (moduly HTTP 200).

### Rozhodnutí
- **R-010 🟢 První building = Poké Mart (nákup Poké Ballů, upgrade snižuje cenu).** (schváleno 2026-08-31)
  - Uzavírá ekonomickou smyčku: gold z bojů/idle → Poké Bally → víc chytání → větší tým.
  - Budovy jsou datově řízené; další budovy (bonus gold/XP, léčení…) půjdou přidat jen do dat.

### 🎉 MVP hotové
- Tímto krokem jsou splněné **Kroky 0–5** z roadmapy (R-003): kostra → save → tým → souboj → idle/loot → město. Hra má kompletní základní smyčku.

### K ověření uživatelem v prohlížeči
- Záložka **Město**: kup Poké Ball (ubere gold, přidá Poké Ball v liště); vylepši Poké Mart (ubere gold, zvýší Lv, klesne cena Poké Ballu); tlačítka se samy zablokují při nedostatku goldu; vše přežije refresh; starý save se načte (migrace na v3).

### Další na řadě (po MVP)
- ⚪ Rozšíření obsahu: víc oblastí, víc druhů Pokémonů, další budovy, Move systém, questy – vše převážně přidáváním dat.

---

## 2026-08-31 – Krok 4: idle/offline progres + loot (v0.5.0)

### Co jsme udělali
- **Idle systém** `src/systems/idle.js`: `applyOfflineProgress(savedBattle, elapsedMs)` – z uloženého souboje odhadne rychlost zabíjení (průměrný damage vs HP nepřítele), spočítá počet poražených za čas pryč × `OFFLINE_EFFICIENCY`, aplikuje XP/gold/loot. Počítá se jen z **běžícího** uloženého souboje; strop `OFFLINE_CAP_HOURS = 8`; ignoruje pauzy < 60 s.
- **Loot systém** `src/systems/loot.js`: `rollLoot(area)` (aktivní souboj) a `expectedLoot(area, kills)` (offline průměr). Drop tabulka je v datech oblasti (`data/areas.js` → Route 1: 12% šance na Poké Ball).
- Sdílené vzorce vytaženy z `battleSystem.js`: `battleRewards`, `avgDamage`, `makeCombatant`, `lootLabel` (jeden zdroj pravdy).
- `handleFaint` nově losuje a připisuje loot + píše ho do logu.
- `main.js`: offline se počítá ze snímku PŘED `restore` (jinak by běh přepsal na pauzu), pak přehled `src/ui/offlineView.js` a okamžité uložení (reset `lastSaved` → žádné dvojí počítání).
- Otestováno v local buildu (moduly HTTP 200).

### Rozhodnutí
- **R-009 🟢 Idle model = odhad podle síly; offline účinnost 1/10; loot minimální.** (schváleno 2026-08-31)
  - Uživatel chtěl offline záměrně slabší, aby návrat po 8 h nebyl jako 8 h aktivní hry. Zvoleno `OFFLINE_EFFICIENCY = 0.1` (jedna laditelná konstanta – Claude mírně preferuje ~1/4, doladíme podle reálných čísel).
  - Progres se počítá jen když hráč nechal souboj běžet (pauza/stop = neidluje) – intuitivní a čisté.
  - Loot zatím bez Item/Inventory systému: dropy jsou datově řízené a jdou přímo do `resources` (zatím Poké Ball). Plný inventář přijde později.

### K ověření uživatelem v prohlížeči
- Spusť souboj, nech ho **běžet**, zavři/refresh a vrať se za chvíli → po návratu se ukáže panel „Vítej zpět!“ s XP/gold/lootem (řádově 1/10 aktivního zisku).
- Kontrola nerfu: srovnej zisk za X minut aktivního hraní vs X minut offline – offline má být výrazně nižší.
- Loot: v aktivním souboji občas v logu přibude „+1 Poké Ball“ a počet Poké Balls v liště roste.
- Pauznutý/ukončený souboj = po návratu žádný offline zisk.

### Další na řadě
- ⚪ Krok 5: malé město + jeden building upgrade → dokončení MVP.

---

## 2026-08-31 – Oprava: přímý save souboje (v0.4.1)

### Zpětná vazba uživatele
- Po testu Kroku 3: „Vše vypadá super, akorát F5 mi oživý pokemony, takže to jakoby není ‚přímý save‘.“
- V R-007 byl souboj záměrně transient (mezi souboji i po refreshi plné HP). Uživatel to považuje za chybu – chce, aby refresh zachoval stav.

### Co jsme udělali
- Souboj se nyní **ukládá do save** a po načtení obnoví (pozastavený).
- `battleSystem.js`: `serialize()` (snapshot: oblast, rychlost, běží/výsledek, teamCursor, log, hráč uid+HP, nepřítel druh+level+HP), `restore(saved)` (znovu sestaví bojovníky, souboj `running=false`), `persist()` volaný v `emit()`.
- `state.js`: pole `battle` v `createNewGame`, `CURRENT_SAVE_VERSION = 2`.
- `save.js`: migrace v1 → v2 doplní `battle: null`.
- `main.js`: po načtení/založení volá `restore(getState().battle)`.
- Otestováno v local buildu (moduly HTTP 200).

### Rozhodnutí
- **R-008 🟢 „Přímý save“ souboje.** Rozehraný souboj přežije refresh a obnoví se pozastavený. (schváleno 2026-08-31)
  - Upřesňuje R-007: souboj už není čistě transient. Připravuje půdu pro Krok 4 (idle/offline progres).

### K ověření uživatelem v prohlížeči
- Spustit souboj → F5: HP hráče i nepřítele, log a nepřítel zůstanou; souboj je pozastavený a tlačítkem se znovu rozběhne (žádné „oživení“ na plné HP).

### Další na řadě
- ⚪ Krok 4: jedna oblast + idle/offline progres + základní loot.

---

## 2026-08-31 – Krok 3: Battle Area (v0.4.0)

### Co jsme udělali
- Datová tabulka typové efektivity `data/types.js` + `typeMultiplier`.
- `computeStats` v `pokemonSystem.js` (staty z base + level).
- Progression `src/systems/progression.js` (XP křivka, level-up).
- Battle systém `src/systems/battleSystem.js`: automatický souboj, kola dle rychlosti, damage s typovou efektivitou, XP+level, gold odměna, střídání týmu, prohra; start/pauza/rychlost; `stopBattle`.
- Vizuální `src/ui/battleView.js`: HP bary, VS layout, ovládání, log.
- `stopBattle` napojen na Nová hra / Import v `saveControls.js`.
- Otestováno v local buildu (moduly HTTP 200).

### Rozhodnutí
- **R-007 🟢 Battle MVP: damage s typovou efektivitou (datová tabulka) + auto režim se start/pauzou a rychlostí 1/2/4×.** (schváleno 2026-08-31)
  - Manuální výběr útoků a Move systém přijdou později. Souboj je transient (neukládá se), do save jde jen výsledek (XP/level/gold). Mezi souboji se Pokémon léčí na plné HP (zjednodušení MVP).

### K ověření uživatelem v prohlížeči
- Battle Area → Start: HP bary klesají, log běží, super efektivní/slabé zásahy; přepínání rychlosti; po výhře další nepřítel; gold v liště roste; level-up při dostatku XP; prohra při vyřazení celého týmu.

### Další na řadě
- ⚪ Krok 4: jedna oblast + idle/offline progres + základní loot.

---

## 2026-08-31 – Krok 2: tým a získávání Pokémonů (v0.3.0)

### Co jsme udělali
- Pokémon systém (`src/systems/pokemonSystem.js`) – tvorba jedinců z druhů.
- Team systém (`src/systems/team.js`) – výběr startéra, chytání divokých (za Poké Ball), přidání/odebrání/řazení v týmu (max 6), pomocné funkce.
- UI: levý panel má záložky Tým / Kolekce / Město (`src/ui/leftPanel.js`, `src/ui/teamView.js`).
- Napojeno v `main.js` (překreslení levého panelu na změnu stavu).
- Otestováno v local buildu (moduly HTTP 200).

### Rozhodnutí
- **R-006 🟢 Levý panel se záložkami (Tým / Kolekce / Město).** (schváleno 2026-08-31)
  - Proč: tým i správa Pokémonů potřebují místo; zachováváme tři panely dle zadání a jen zpřehledňujeme levý sloupec. Zadání layout povoluje měnit (sekce 16).

### K ověření uživatelem v prohlížeči
- Nová hra → záložka Kolekce nabídne startéra; po výběru je v týmu.
- Chytání divokých ubírá Poké Balls a plní kolekci; přidání do týmu respektuje max 6; řazení a odebírání funguje; vše přežije refresh.

### Další na řadě
- ⚪ Krok 3: vizuální Battle Area + automatický souboj + XP/level.

---

## 2026-08-31 – Krok 1: perzistentní základ (v0.2.0)

### Co jsme udělali
- Rozhodnutí uživatele: pokračovat ve vývoji lokálně (local build), verze posílat na GitHub po každém hotovém kroku.
- Postaven základ perzistence: event sběrnice, jádro stavu, save systém, datová vrstva Pokémonů, UI pro save.
- Implementováno: `src/core/events.js`, `src/core/state.js`, `src/systems/save.js`, `data/pokemon.js`, `src/ui/saveControls.js`; upraven `src/main.js`; zdrojová lišta čte reálný stav.
- Save je verzovaný (`saveVersion`) s připraveným migračním bodem; export/import přes .txt dle zadání (sekce 7, 15).
- Otestováno v local buildu (všechny moduly HTTP 200).

### K ověření uživatelem v prohlížeči
- Tlačítka Uložit / Export / Import / Nová hra fungují, stav přežije refresh (localStorage), export stáhne .txt, import ho načte zpět.

### Další na řadě
- ⚪ Krok 2: tým (max 6) + získání startovních Pokémonů.

---

## 2026-08-31 – Zahájení projektu

### O čem jsme se bavili
- Naučili jsme se naklonovat a otestovat repozitář z pracovního (firemního) počítače.
- Ověřili jsme technické prostředí a dostupnost GitHubu.
- Přečetli jsme kompletní zadání `Zadání ver. 1.0.docx` (22 sekcí).
- Navrhl jsem technologii, architekturu a postup po krocích.
- Zavedli jsme tuto dokumentaci (NOTES.md + CHANGELOG.md).

### Zjištění o prostředí
- Git 2.54, účet: Dominik Šamanek / dominik.samanek@t-mobile.cz.
- **GitHub přes HTTPS funguje** (klon i push ověřeny). **SSH (port 22) je blokován** firewallem → používáme HTTPS remotes.
- **Node.js / npm nejsou nainstalované** → volíme technologii bez build kroku.
- **Python 3.14.6 je dostupný** (`python` / `py`) → použijeme ho jako lokální server pro testování (`python -m http.server`).
- Repo: https://github.com/Lazgrind/pokemonrpg.git (větev `main`).

### Rozhodnutí k projednání
Detaily a odůvodnění jsou u každého bodu níže; stav se aktualizuje po potvrzení.

- **R-001 🟢 Technologie: Vanilla JavaScript + nativní ES moduly, bez build kroku.** (schváleno 2026-08-31)
  - Proč: není Node/npm; zadání chce jednoduchý deployment; ES moduly pokryjí modularitu.
  - Alternativa (zamítnuto pro teď): TypeScript + Vite – potřebuje build nástroje, které nemáme. Náhrada: typová nápověda přes JSDoc bez buildu. K TS lze přejít později.
  - Upřesnění uživatele: nic se neinstaluje ani netestuje přes vývojové prostředí na počítači; testuje se maximálně v **local buildu** (lokálně v prohlížeči). Viz R-005.

- **R-002 🟢 Architektura složek** oddělující DATA → SYSTEM → UI: (schváleno 2026-08-31)
  ```
  pokemonrpg/
  ├── index.html
  ├── css/
  ├── src/
  │   ├── main.js
  │   ├── core/       (game loop, event bus, stav)
  │   ├── systems/    (logika: battle, team, idle, save …)
  │   └── ui/         (vykreslování: cityView, battleView, mapView)
  ├── data/           (pokemon, moves, items, areas …)
  ├── assets/
  └── docs/
  ```

- **R-003 🟢 Postup po krocích (roadmapa):** (schváleno 2026-08-31)
  - Krok 0: kostra projektu + rozvržení hlavní obrazovky + zapnutí GitHub Pages.
  - Krok 1: datová vrstva + jádro stavu + Save (localStorage) + export/import .txt.
  - Krok 2: tým (max 6) + startovní Pokémoni.
  - Krok 3: vizuální Battle Area + automatický souboj + XP/level.
  - Krok 4: jedna oblast + idle/offline progres + základní loot.
  - Krok 5: malé město + jeden building upgrade → MVP.

- **R-004 🟢 Dokumentace projektu:** vést `docs/NOTES.md` (deník) a `CHANGELOG.md` (verze) uvnitř repa, verzované přes git. (schváleno 2026-08-31)

- **R-005 🟢 Testování jen v „local buildu“.** (schváleno 2026-08-31)
  - Nic se neinstaluje jako vývojové prostředí na počítač. Lokální testování běží přes `python -m http.server` (Python 3.14 je na stroji dostupný) a otevření `http://localhost:8000` v prohlížeči.
  - Stažení knihoven přes CDN je přípustné, pokud to bude přínosné; zatím ale držíme projekt bez závislostí (čistě vanilla).

### Otevřené otázky
- ✅ Rozhodnutí R-001 až R-005 schválena → pouštíme Krok 0.
- ⚪ Zapnutí GitHub Pages provede uživatel v nastavení repa (návod je součástí Kroku 0).

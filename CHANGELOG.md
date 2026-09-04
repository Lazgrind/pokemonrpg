# CHANGELOG

An overview of what we have actually done. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [semantic versioning](https://semver.org/).

Change types: **Added**, **Changed**, **Fixed**, **Removed**.
For details on discussions and decisions see [docs/NOTES.md](docs/NOTES.md).

## [0.63.0] – 2026-09-04 · responsive layout
### Added
- **Responsive layout: panels now stack vertically on narrow screens/windows instead of shrinking (playable on phones and half-screen).** New layout switch in Settings: Auto (responsive), Wide (always two columns), Stacked (always one column).
- **Customizable stacked order.** In Stacked mode, reorder panels (Battle → Map → Menu) via arrow buttons in Settings. Rearrangement persists in saves.
### Changed
- **Výrazně rychlejší načtení úvodní obrazovky (title screen).** `Title_screen.png` (2,74 MB) blokoval první vykreslení; nově se servíruje jako **WebP (~488 KB) s JPG fallbackem** přes `<picture>` (−82 % dat). Obrázek má navíc `fetchpriority="high"` a `decoding="async"`. Originál PNG zachován jako `assets/Title_screen_original_backup.png`.
### Fixed
- **Auto battle už nevybírá sebe-poškozující tahy (recoil: Take Down, Double-Edge, Submission, Flare Blitz, Brave Bird, Wood Hammer, Wild Charge).** Dřív auto vyhodnotilo Take Down (power 90) jako „nejlepší“ útok a Pokémon si tak v auto souboji ubližoval recoilem sám sobě. Nově je auto vybere jen jako KRAJNÍ fallback (kdyby nebylo čím jiným útočit) – jinak nikdy. Manuální souboj se nemění, hráč si recoil tah dál může zvolit.
- **Auto-učení tahů (auto battle / offline / Školka) už si recoil tahy samo nenaučí.** Vyvážená sada „útočné-first“ recoil přeskočí (fallback jen když by jinak nebyl žádný útočný tah). Existující jedinci s Take Down apod. si ho v auto souboji přestanou vybírat okamžitě a při dalším auto level-upu ho ze sady vypustí.
- **Skládaný layout: stránka už „neuskakuje“ nahoru při kliknutí (auto battle, přepínače…).** Ve skládaném/úzkém režimu scrolluje celé okno; překreslení panelu (přepis innerHTML, hlavně rychlé tiky auto souboje) dokument na okamžik zkrátilo a prohlížeč scroll vyhodil nahoru. Nově se pozice okna při každém překreslení battle i levého panelu zachovává.

## [0.62.1] – 2026-09-03 · oprava přesunu jedinců mezi PC boxy (drag & drop)
### Fixed
- **Výběr boxů při přetažení jedince už „nespadne".** Když nad horní lištu (jméno boxu) přetáhneš jedince, rozbalí se výběr boxů a **zůstane otevřený, dokud jedince držíš „v ruce"** – zavře se až po puštění na box nebo po konci tažení. Dřív se picker kvůli překreslování panelu (živé progress bary) i falešnému `dragleave` zavíral okamžitě, takže se do jiného boxu nedalo trefit.
- **Výběr boxů je teď mřížka dlaždic 6×5 (všech 30 boxů naráz), ne scrollovací seznam.** Každá dlaždice ukazuje číslo boxu a obsazenost (x/30), aktivní box je zvýrazněný, plný box má obsazenost červeně. Konec se scrollbarem, na cílový box stačí pustit jedince na příslušnou dlaždici.

## [0.62.0] – 2026-09-03 · breeding & vajíčka · nové Poké Bally · přehlednější léčení
### Added
- **Destiny Knot (held item, 2000 gold).** Drží-li ho jeden z rodičů ve Školce, potomek zdědí **5 IV místo 3**. Kupuje se v Marketu (sekce held items), nasazuje jako ostatní held předměty.
- **Potomek se líhne v základní formě.** Breeding vejce teď vždy vyprodukuje kořen evoluční linie (dědí po ne-Ditto rodiči) – dřív mohlo vzniknout přímo vyvinutého druhu.
- **Procedurální sprite vajíček (per druh).** Skořápka se deterministicky odvodí ze species.id (barva + puntíky), takže vejce druh vizuálně naznačuje a hráč se učí vzory. Jméno a staty zůstávají skryté až do vylíhnutí (R-021). Zobrazuje se ve slotech líhně i ve výběru vejce.
- **Nové Poké Bally (odemčeno z „coming soon").**
  - **Love Ball** (tier 2, 100 g) – ×8 na stejný druh opačného pohlaví, než je tvůj aktivní Pokémon.
  - **Heavy Ball** (tier 2, 80 g) – čím těžší druh, tím lepší (×2 / ×3 / ×4 dle hmotnosti).
  - **Dream Ball** (tier 3, 120 g) – ×4 na soupeře se stavovým postižením, ×6 pokud spí.
  - **Moon Ball** (tier 3, 140 g) – ×4 na druhy vyvíjené Měsíčním kamenem.
### Changed
- **Léčení v Poké Centru zůstává zdarma; jen zpřehledněno.** Manuální **Heal team** je nově označen „(free)" a jasně uvádí, že obnovuje **plné HP, vyléčí status i doplní PP naplno** (potiony tak mají smysl hlavně v souboji, kde do Centra nelze). Hláška po vyléčení to potvrzuje.
### Poznámky
- Master Ball zůstává bez zdroje (plán až na konec release 1.0). Dusk Ball zůstává „coming soon" (chybí noc/jeskyně). Bez batch-použití itemů (vždy po 1 ks). Rychlost breedingu se záměrně neupgraduje.

## [0.61.2] – 2026-09-03 · přehlednější Herní pravidla (tabulka + toggle)
### Changed
- **Sekce „Herní pravidla" v Nastavení přepsána do kompaktní tabulky** s toggle přepínači vpravo (dřív roztažené checkboxy s dlouhým popisem, nepřehledné v úzkém okně). Každé pravidlo = řádek: název + krátký popis vlevo, zapínač vpravo (zapnuto = zelený).

## [0.61.1] – 2026-09-03 · oprava auto-výběru tahů (jedinec vždy „bojeschopný")
### Fixed
- **Auto režim už nedá jedinci převahu status tahů (dřív např. 3 status + 1 útok).** Výběr tahů teď dává přednost ÚTOČNÝM tahům (zaplní klidně všechny 4 sloty), status tahy jen doplní zbylé sloty. Platí pro výchozí sadu při vzniku jedince i pro auto battle / offline / Školku, kde se sada při každém level-upu přeskládá na „útočné-first" (zachová i egg/TM tahy mimo learnset a PP naučených tahů). Důsledek: v auto souboji má jedinec vždy čím ubírat HP a souboj se nezasekne. V manuálním souboji zůstává chování beze změny (nový tah při plných slotech nabídne frontu na nahrazení).
- **Oprava už pokažených save (migrace v20 → v21).** Jedinci s ≤ 1 útočným tahem, u kterých jde získat víc útočných, se při načtení přeskládají na útočné-first (řeší i deadlock, kdy zaseknutý jedinec v auto souboji nedostával XP, takže se sám nikdy neopravil level-upem). Záměrné vyvážené sady (2+ útoky) se nemění.

## [0.61.0] – 2026-09-03 · dokončení soubojových mechanik · skutečné ikony míčků · herní režimy (No items / No potions / Nuzlocke)
### Added
- **Dokončené soubojové mechaniky (Gen 1).**
  - **Reflect / Light Screen** – po dobu 5 kol půlí přijaté fyzické (Reflect) resp. speciální (Light Screen) poškození; kritické zásahy clonu ignorují. Clona po odeznění zmizí („wore off").
  - **Substitute** – obětuje ¼ max HP a vytvoří návnadu, která pohlcuje poškození i navěšování statusů, dokud nepraskne.
  - **Counter** – vrátí 2× poslední přijaté FYZICKÉ poškození (priorita −5, takže jde poslední). Jinak selže.
  - **Rest** – jedinec se plně vyléčí, vyčistí status a usne na 2 kola.
  - **Whirlwind / Roar (force switch)** – u divokého soupeře přivolá nového (bez odměny), hráče vytáhne náhodného zdravého člena z lavičky.
  - **Transform / Mimic (Metamorf)** – Transform převezme typy, staty, stat-stage, jméno i tahy soupeře; Mimic dočasně zkopíruje jeho poslední tah. Dočasné tahy (`moveOverride`) mizí po výměně/konci souboje.
  - **Sleep a Freeze jako trvalé (non-volatile) stavy** – přežijí výměnu jedince (dle kánonu). Spánek trvá 1–3 kola, zmrznutí má 20% šanci na rozmrznutí každé kolo a rozmrazí ho i zásah Fire tahem. Ice typ nelze zmrazit. Odznaky **SLP** / **FRZ** na kartě i v souboji.
- **Herní režimy / pravidla (⚙ Nastavení → Rules).**
  - **No items** – v souboji nelze použít žádný předmět (ani auto-heal). Batoh v souboji to hlásí.
  - **No potions** – zakáže jen léčivé (HP) předměty; ostatní zůstávají.
  - **Nuzlocke** – **permadeath** (omdlelý jedinec navždy opouští tým i kolekci) + na každé oblasti smíš chytit jen **jeden** úlovek (další chytání je zablokované).
### Changed
- **Skutečné ikony Poké Ballů místo emoji 🔴.** Catch tlačítka v liště i v batohu, hod míčkem a hlavičky/oddělení v Poké Martu teď používají opravdový obrázek vybraného míčku (fallback na emoji zůstává, když obrázek chybí). Ikona chyceného míčku na kartě i v týmu už fungovala dřív.
### Fixed
- (nic nového – viz 0.60.0)

## [0.60.0] – 2026-09-03 · plynulý scroll (konec záseků kolečkem)
### Fixed
- **Scroll se už neseká.** Okna i panely se překreslovaly každý herní tik (kvůli živým progress barům); když překreslení padlo doprostřed scrollu kolečkem, prohlížeč scroll přerušil (element pod kolečkem se zničil) a uživatel musel pustit a scrollovat znovu. Nově se během aktivního scrollování překreslení odloží a proběhne až po jeho uklidnění (~200 ms), víc ticků se sloučí do jednoho. Platí pro market/obchody, batoh, kartu Pokémona, tým, PC, Pokédex i nastavení. Živé prvky (bary, počítadlo zlata) při scrollu na okamžik „zamrznou" a hned se dorovnají; počítadlo zlata v horní liště zůstává živé i během scrollu.
### Changed
- `scrollPreserve.js` má nově sdílené helpery `isScrolling()` a `scrollAware(renderFn)` (obalí render callback, aby se během scrollu neprováděl). Nasazeno na všechna překreslení řízená `STATE_CHANGED`.

## [0.59.0] – 2026-09-03 · dědičnost tahů (egg moves) · evoluce kamenem + výměnou · multi-stat boost tahy · prodej itemů
### Added
- **Dědičnost tahů (egg moves).** Vejce z breedingu předá potomkovi „egg moves": vezme se sjednocení aktivních tahů obou rodičů, ponechají se jen ty, které druh potomka umí naučit (celý level-up movepool), a max 4 dostanou při vylíhnutí přednost před výchozí sadou. Ukládá se na vejce (`breed.eggMoves`), zpětně kompatibilní (stará vejce = beze změny).
- **Evoluce kamenem.** Nová kategorie itemů „🪨 Evolution": Fire/Water/Thunder/Leaf/Moon Stone + Linking Cord (náhrada výměny). Kameny i cord jsou k dostání v obchodě Items. Použití z batohu → výběr vhodného jedince → evoluce (spotřebuje kámen). Větvené evoluce řeší volba kamene (Eevee → Vaporeon vodním / Jolteon hromovým / Flareon ohnivým kamenem).
- **Evoluce výměnou (Linking Cord).** Kadabra→Alakazam, Machoke→Machamp, Graveler→Golem, Haunter→Gengar se vyvinou přes Linking Cord z batohu.
- **Prodej itemů.** V batohu má každý consumable i held item tlačítka „Sell 1" / „Sell all" (výkup za 50 % nákupní ceny). Seznamy v batohu se řadí abecedně.
- **Multi-stat boost tahy.** Engine efektů nově umí měnit víc statů jedním tahem (`effect.changes[]`). Přidáno/rozšířeno: Dragon Dance (Atk+Spe), Calm Mind (SpA+SpD), Bulk Up (Atk+Def), Shell Smash (Atk/SpA/Spe +2, Def/SpD −1); Swords Dance a Nasty Plot zůstávají jednostatové. Napojeno do learnsetů (Dragonite, Gyarados, Alakazam, Machamp, Squirtle, Scyther).
### Changed
- Evoluční druhy (kámen/výměna) mají v datech nové pole `evolutions: [{toId, method, item?}]` a vynulované levelové `evolvesTo`/`evolutionLevel`; levelové evoluce fungují beze změny.
### Fixed
- (nic nového – viz 0.58.0)

## [0.58.0] – 2026-09-03 · ikona Pokédexu v liště · hromadný nákup · autocatch fallback · PC boxy (30, drag mezi boxy, přejmenování)
### Added
- **Ikona Pokédexu v horní liště.** Položka „📕 Pokédex" (s počtem chycených) je klikatelná (i klávesnicí) a otevře záložku Pokédex v levém panelu. Dřív tam byl jen neinteraktivní počet „📦 Pokémon".
- **Hromadný nákup v obchodech.** Poké Mart i Items mají přepínač množství **×1 / ×5 / ×10 / Max**; tlačítko nákupu ukazuje reálný počet a celkovou cenu, „Max" koupí tolik, na kolik stačí zlato. Deaktivuje se, když není na jediný kus.
- **Přesun mezi PC boxy a přejmenování boxu.** Jedince lze přetáhnout na navigační šipky ◀/▶ (přesun do sousedního boxu) **nebo na jméno boxu → rozbalí se seznam všech 30 boxů** a lze ho přesunout o víc než jeden box. Klik na jméno boxu ho přejmenuje.
- **Globální Dev menu v Nastavení (⚙).** Nová sekce „🔧 Dev tools": přidat peníze (+1 000 / +10 000), přidat vejce (náhodný druh) a přidat Ditta, a per-jedincové úpravy **level (−10/−1/+1/+10/Max) a shiny** s výběrem cílového Pokémona z rozbalovacího seznamu.
### Changed
- **PC má napevno 30 boxů** (po 30 slotech). Tlačítko „＋ Box" zrušeno; `reconcile()` počet boxů vždy dorovná.
- **Dev nástroje přesunuty z Karty Pokémona do globálního Dev menu.** Řádek „🔧 Dev level" a shiny přepínač na kartě zrušeny; totéž (a víc) je teď v ⚙ Settings s výběrem cíle.
### Fixed
- **Autocatch fallback při došlém míčku.** Když dojde vybraný typ Poké Ballu, autocatch se nezastaví, ale přepne na jiný vlastněný (nejlevnější → nešetří prémiové). Chytá, dokud má hráč aspoň jeden míček.
- **Čas líhnutí ukazoval `13.539999… s`.** `formatDuration` teď vstup nejdřív zaokrouhlí na celé sekundy (řeší i přetečení 60 s), takže se zlomkové zbývající sekundy zobrazí čistě.
- **Changelog servíroval starou verzi z cache.** `fetch("CHANGELOG.md")` má nově `{ cache: "no-store" }`, takže se „Co je nového" vždy načte aktuální (dřív rozpor „verze 0.55 vs. changelog 0.45").
- **Hatchery (Egg Breeders) přetékaly okno.** Mřížka slotů měla `repeat(5, 1fr)`; obsazené sloty (bar + čas + „Take out") mají větší min-content, takže po naplnění pár slotů řádek utekl doprava mimo modal. Nově `repeat(5, minmax(0, 1fr))` + `min-width:0` na slotu (a zalamování textu/tlačítek), takže se sloupce korektně zúží a zůstanou v okně.

## [0.57.0] – 2026-09-03 · Pokédex info (výška/váha/entry) · sprity podle výšky · title screen jako brána
### Added
- **Pokédex info u všech 151 druhů.** Do `data/pokemon.js` doplněny `height` (m), `weight` (kg), `genus` (angl. druhový popisek) a `dexEntry` (angl. flavor text) z PokeAPI. Zobrazují se na Kartě Pokémona (chycený i jen viděný druh): druhový popisek pod jménem, flavor text jako citace a řádky Height/Weight v meta přehledu.
- **Nový generačně nezávislý nástroj `tools/gen_pokedex_info.py`.** Druhy (id + dexNo) čte z `data/pokemon.js`, info stahuje z PokeAPI; idempotentní (dá se pouštět opakovaně) a připravený na další generace.
### Changed
- **Velikost spritu v Battle Area podle výšky druhu.** Pidgey (0,3 m) už není stejně velký jako Charizard (1,7 m) ani Onix (8,8 m). Reálné výšky mají obrovský rozptyl, takže se komprimují mocninou a ořezávají do pásma [0,55 – 1,5]× (`spriteScaleForHeight`); poměr se násobí přes CSS proměnnou `--mon-scale` nad rámec škálování scény podle úhlopříčky.
- **Title screen je teď skutečná BRÁNA do hry.** Offline souhrn, nabídky naučení tahu a výběr startéra se ukážou až PO kliknutí na Continue (dřív probleskly pod úvodní obrazovkou). Overlay leží nad herním obsahem (z-index 200), modály nad ním (300), aby šlo Nastavení otevřít i z title screenu.
### Fixed
- **Rozbité načtení hry po přegenerování learnsetů (v0.56.0).** Tři klíče druhů s pomlčkou (`nidoran-f`, `nidoran-m`, `mr-mime`) byly v `data/learnsets.js` bez uvozovek → `SyntaxError: Unexpected token '-'` → celý modul se nenačetl a po Continue zůstal prázdný layout. Klíče s pomlčkou teď VŽDY v uvozovkách (opraveno i v generátoru `tools/gen_movepools.py`).
- **Trvalý on-page zachytávač chyb.** Jakákoli neodchycená chyba (včetně selhání načtení ES modulu) se vypíše dole na stránce, aby šla přečíst i bez F12.

## [0.56.0] – 2026-09-03 · Title screen · sdílené nastavení · větší sprity · gify obou stran
### Added
- **Úvodní obrazovka (title screen).** Po načtení se přes hru položí `assets/Title_screen.png` s tlačítky **CONTINUE** (vstup do hry) a **SETTINGS**.
- **Sdílené modální nastavení (`openSettingsModal`).** Jedno okno nastavení dostupné z horní lišty (⚙) i z title screenu; herní rychlost se v něm živě překresluje. Zdroj pravdy je jeden (žádný duplicitní dropdown).
- **Animované gify pro celé evoluční linie obtainable druhů.** Doplněny front/back i shiny varianty pro Ivysaur, Venusaur, Charmeleon, Charizard, Wartortle, Blastoise, Pidgeotto, Pidgeot a Raticate → hráčův Pokémon animuje v manuálním souboji i po evoluci (obě strany scény).
### Changed
- **Škálování soubojové scény podle úhlopříčky.** Velikost spritů teď řídí JS (`ResizeObserver`) podle **úhlopříčky** battle areny (√(š²+v²)), takže sprite roste i klesá s celkovou velikostí scény při každé změně okna/panelu (dřív CSS container queries reagovaly jen na jeden rozměr → na nízké aréně se sprite zasekl). Bojovníci se rozestoupí dál od rohů; na úzkém panelu se info panel a sprite už nepřekrývají (omezené šířky + zalamování). Auto/idle mód dál používá statické png.
- **Horní lišta ⚙** místo malého rozbalovacího menu otevírá plné modální nastavení.
- **Přesné learnsety a data tahů z PokeAPI (Gen 9 Scarlet/Violet).** `data/learnsets.js` a `data/moves.js` přegenerovány kanonicky z PokeAPI (dřív šlo o aproximaci se starogeneračními úrovněmi). Ruční bojová pole (`effect`, `ailment`/`ailmentChance`) se při merge **zachovala**; u nově přidaných tahů se z PokeAPI meta odvodila bezpečná podmnožina efektů. Nový generačně nezávislý nástroj `tools/gen_movepools.py` (druhy čte z dat, version-group fallback řetězec) → znovupustitelný na další generace.
### Removed
- **Ditto z výběru startérů** (zůstává v Pokédexu a pro breeding).

## [0.55.0] – 2026-09-02 · PC boxy · úložiště mimo tým · drag & drop
### Added
- **Nová záložka „PC"** v levém panelu (vedle Team). Úložiště všech vlastněných jedinců, kteří nejsou v týmu, v boxech po 30 slotech (mřížka 6×5).
- **Více boxů + navigace.** Přepínání mezi boxy (◀ / ▶) a tlačítko „＋ Box" pro založení dalšího; boxy se zakládají automaticky, když se úložiště zaplní.
- **Drag & drop.** Jedince lze přetáhnout na jiný slot v boxu; obsazený cíl se prohodí. Klik na slot otevře Kartu Pokémona, tlačítko „＋ Team" ho přidá do týmu.
- **Samohojivé úložiště (`pcSystem.reconcile`).** Každý vlastněný jedinec mimo tým je vždy právě v jednom slotu: přidání úlovku ho do boxu doplní, přidání do týmu ho z boxu vyjme, odebrání z týmu ho zase uloží – bez duplikátů a osiřelých slotů.
### Changed
- **Save v18 → v19:** doplněno pole `pcBoxes`. Staré save se při načtení rozmístí do boxů automaticky (Pokédex zůstává beze změny).

## [0.54.0] – 2026-09-02 · Kanto data layer · 151 druhů · learnsety · 268 tahů
### Added
- **Všech 151 druhů Kanto v `data/pokemon.js`.** Doplněny kanonické staty a typy dle nejnovější mainline generace, s moderním přetypováním Fairy/Steel, evoluční řetězce včetně evolucí kamenem a náhradního trade-itemu „linking-cord" (zastoupuje výměnu), `genderRatio` a `eggGroups` na každém druhu, `gen` (generace) a všechny relevantní evoliční informace.
- **Kompletní level-up movepooly v `data/learnsets.js`.** Všech 151 druhů má kanonický level-up movepool se všemi svými tahy (267 unikátních tahů celkem), sjednocené move-id napojené na `data/moves.js`.
- **Rozšířená `data/moves.js` na 268 tahů** (+213 nově). Všechny tahy Kanta s kanonickými daty (power, accuracy, PP, kategorie, typ), připravené efekty (`effect.kind` pročištěno pro budoucí implementaci).
- **Bezpečnostní guardy pro nová data:** Eevee s větvovanou evolucí, kamenné a trade evoluce se zatím auto-nespouští (tlačítko, ne automatika); null-guardy pro `eggGroups`, spawn a startéry, aby chyba v datech nezbourala hru.
- **Křížová validace:** všech 151 druhů má souvislý Dex, unikátní `id`, všechny cíle evolucí i všechny tahy v learnsetech existují. Integrity check v `pokemonSystem.validatePokemonData()`.

## [0.53.0] – 2026-09-02 · Move effects wired up · stat stages · full 18-type chart
### Added
- **Stat-stage system.** Battlers now track the seven classic stat stages — **Attack, Defense, Sp. Atk, Sp. Def, Speed, accuracy and evasion** — with the standard stage multipliers. Stages feed into **damage** (Atk/Def/SpA/SpD), **turn order** (Speed) and **hit chance** (accuracy vs. evasion), so a Swords Dance, an Agility or a Sand-Attack finally does what it should.
- **Move effects are live (`move.effect`), in both auto and manual battle.** The battle engine now executes the effect data that shipped "prepared" in 0.50.0: **statChange**, **recoil** (Take Down / Double-Edge), **drain**, **heal** (Roost / Synthesis), **highCrit** and **critUp** (Focus Energy), **flinch**, **confuse**, **sleep**, **leechSeed**, **trap** (Fire Spin & co.), **rapidSpin** (clears trap/Leech Seed), **fixedDamageHalf** (Super Fang), **twoTurn** (Solar Beam / Skull Bash — a charging turn), **thrash** (Petal Dance — locks in, then confuses), **weather / rain** (Rain Dance: Water ×1.5, Fire ×0.5), **tailwind** (×2 Speed) and **rage**.
- **Type chart expanded to the full 18 types**, adding **Dark** and **Fairy** (among the missing ones). Dual-type damage now multiplies both matchups correctly.
### Changed
- **End-of-round residual damage is unified.** Poison / burn, **Leech Seed** and **trap** damage now resolve through one shared path (with step-by-step animation in manual battle), instead of poison/burn being handled on their own.
- **Self-KO from recoil or confusion is resolved correctly** — a Pokémon that faints itself (recoil, a confusion hit) is now properly counted as fainted.
### Notes
- **Save format is unchanged** — move effects are runtime/transient state, so there's no migration.
- **Deferred (data is "prepared", but the effect does nothing yet / shows "but it failed!"):** **transform**, **copyMove**, **forceSwitch**.

## [0.52.0] – 2026-09-02 · Evolution sprites · building sprites · shiny dev toggle
### Added
- **Real sprites for all nine evolved species.** Ivysaur, Venusaur, Charmeleon, Charizard, Wartortle, Blastoise, Pidgeotto, Pidgeot and Raticate now show their proper artwork (front, back and shiny variants) instead of the "?" placeholder — in the Pokédex, on the Pokémon card and in battle. Venusaur and Raticate also have their female-form sprites.
- **Sprites for the Training Grounds and Move Tutor buildings**, normalized to the same 256×256 transparent standard as the other buildings.
### Changed
- **Shiny survives evolution — confirmed.** A shiny stays shiny through every evolution step (e.g. a shiny Squirtle evolves into a shiny Wartortle and then a shiny Blastoise). This already worked; the new sprites just make it visible.
### Added (dev)
- **Shiny toggle on the Pokémon card's dev row** (next to the level tools) to flip a Pokémon's shiny state for testing shiny sprites and shiny-through-evolution. Debug only.

## [0.51.0] – 2026-09-02 · Move Tutor building · learn-on-level-up asks in manual battle
### Added
- **Move Tutor — a new building.** A place to freely rearrange any Pokémon's four active moves. Pick a Pokémon, and you see **every move it can learn by level-up** up to its current level — tick up to four to make them its active set. Reteaching is **free** and **keeps the remaining PP** of moves you keep. This solves two long-standing pains: getting back a move that was overwritten on level-up, and picking up an **evolved form's new moves** (an evolved species' learnset includes its own moves, so they show up here after you evolve).
### Changed
- **Learning a move on level-up now depends on the battle mode.** In **manual battle**, when a Pokémon with four moves would learn a new one, the game **asks** whether to learn it and which move to replace (as before). In **auto battle** — and for offline/Day Care XP — it **auto-replaces** the weakest move (by power; it never downgrades itself), so nothing interrupts an unattended run. Use the Move Tutor afterwards to fine-tune the set.

## [0.50.0] – 2026-09-02 · Full level-up movepools · dev level-setter
### Added
- **Complete level-up movepools for every current species.** All 15 Pokémon (the three starter lines, the Pidgey line, the Rattata line and Ditto) now learn their **full canonical level-up move list**, not just their damaging attacks. That means the support/status moves are in too — Growl, Leer, Tail Whip, Sand-Attack, Growth, Swords Dance, Focus Energy, Sweet Scent, Withdraw, Agility, Feather Dance, Whirlwind, Mirror Move, Leech Seed, Sleep Powder, Poison Powder, Smokescreen, Roost, Tailwind, Rain Dance, Synthesis and Ditto's Transform — plus more attacks (Take Down, Double-Edge, Rage, Skull Bash, Rapid Spin, Water Pulse, Aqua Tail, Fire Spin, Petal Dance, Super Fang, Pursuit, Sucker Punch, Crunch, Hurricane…).
- **Move data is "prepared" for future mechanics.** Every move now carries an optional `effect` descriptor (stat changes, sleep, confusion, flinch, recoil, drain, two-turn charge, multi-hit, force-switch, copy-move, transform, heal, weather…). ⚠️ **Heads-up:** the battle engine does **not** execute these special effects yet — for now the game still only resolves direct damage, accuracy/miss, PP, priority and the poison/burn/paralysis conditions. The rest are in the data so they're ready to be wired up later; a status move whose effect isn't implemented simply does nothing this version.
### Added (dev)
- **Dev level-setter on the Pokémon card** (for testing evolutions/learnsets): a 🔧 row with −10 / −1 / +1 / +10, a jump-to-evolution-level button and **Max (Lv 100)**. Setting a level re-rolls the move set for that level and refills HP. It's a debug tool, not part of normal play.

## [0.49.0] – 2026-09-02 · Evolutions (opt-in) · Nature inheritance · Everstone
### Added
- **Evolutions — but you decide.** Nine new evolved species are in the game (Ivysaur, Venusaur, Charmeleon, Charizard, Wartortle, Blastoise, Pidgeotto, Pidgeot, Raticate). Evolution is **never automatic**: once a Pokémon reaches its evolution level, an **✨ Evolve** button appears on its **Team** slot and on its **Pokémon card** (also reachable from the Pokédex). Evolving keeps the same individual (level, XP, IVs, EVs, nature, gender, shiny) — it just grows into the stronger form, gains the max-HP bump, and learns the new form's moves. One step per click; the next stage becomes available when it reaches its own level.
- **Level cap is 100.** Because evolution is optional, any Pokémon — even an un-evolved starter — can now be trained all the way to **Lv 100**.
- **Nature inheritance via Everstone.** A new held item, **🪨 Everstone** (Poké Mart, Held Items). If a breeding parent holds one, the baby inherits **that parent's Nature** instead of a random one (if both hold one, one is picked at random). A Pokémon holding an Everstone also won't show the Evolve button (the classic "won't evolve" rule).
- The Pokémon card now shows **what a species evolves into and at what level** (and notes when an Everstone is blocking it).

## [0.48.0] – 2026-09-02 · Auto-battle AI · unequip held items · market scroll fix
### Added
- **Smarter auto-battle.** With auto-battle on, your Pokémon now plays a real strategy instead of always spamming its first move:
  - **Move choice weighs damage and accuracy** — it picks the move with the best expected damage (average roll × accuracy), so a shaky high-power move no longer beats a reliable one.
  - **Status-inflicting moves are preferred on a healthy target** — against a full-ish, status-free opponent it favours a move that can inflict a condition (e.g. Body Slam's paralysis) over a plain hit.
  - **Auto-heal** — when the active Pokémon drops below 30% HP and you own a healing Potion, it uses the smallest Potion that covers the missing HP (spending the turn, as in the classic games).
  - **Auto-switch on a type disadvantage** — if the opponent's best move would hit your active Pokémon for ≥2× and a benched Pokémon resists it better, it switches out (with a guard so it never switch-loops).
- **Unequip held items from the Bag.** The Bag now has a **📌 Currently held** section listing every Pokémon carrying an item, each with a **Remove** button that returns the item to your inventory.
### Fixed
- **Nothing jumps to the top on a refresh anymore.** Previously any scrollable window would snap back to the top whenever the game state changed — most visibly the market while buying items or when gold ticked up during auto-battle. Windows now keep their scroll position across refreshes. This covers all city/market windows (market, Poké Balls, Items, Upgrades, Training, Breeders, Breeding) as well as the Bag, the Pokémon card, the Pokédex and the Team panel. (The scroll lives on the inner scroll containers, not the outer modal, which is why the earlier attempt didn't help.)

## [0.47.0] – 2026-09-02 · Held items managed in the Bag · radar layout
### Changed
- **Held items are now managed from the Bag**, not from the Pokémon card. The Bag is split into **Consumables** and a **💎 Held Items** section. Tap a held item and choose **Use** (a berry heals a chosen Pokémon right away and is consumed) or **Equip as Held Item** (pick who carries it). The Pokémon card now shows the held item read-only, with a hint to manage it in the Bag.
- **Oran Berry** can now be used directly from the Bag to restore 10 HP (on top of its held effect).
- **Stat radar** on the Pokémon card was reordered. Clockwise from the top vertex: **HP, Attack, Defense, Speed, Sp. Def, Sp. Atk**. The nature's boosted/lowered axes stay highlighted on the correct stats.

## [0.46.0] – 2026-09-02 · Item targeting in battle · Revive in battle · Held items
### Added
- **Choose the target for items in battle.** The battle **Items** menu no longer only heals your active Pokémon — after picking an item you now choose which team member it applies to. The target list is filtered to valid choices (a Potion only lists hurt Pokémon, a status cure only afflicted ones, a Revive only fainted ones). Using an item still costs your turn.
- **Revive in battle.** With targeting in place, **Revive / Max Revive** can now bring a fainted teammate back **during** a battle (pick it from the item's target list). The revived Pokémon stays on the bench — switch it in when you want it.
- **Held items.** Pokémon can now hold an item that works automatically in battle. Two to start: **🍖 Leftovers** (restores 1/16 max HP at the end of every turn) and **🍒 Oran Berry** (restores 10 HP the first time HP drops below 50%, then is consumed). Equip/unequip from the Pokémon card; the held item shows on the team slot. Buy them in the new **Held Items** section of the Poké Mart.
- Save migrates to **v18** (adds the `heldItem` field to every Pokémon, defaulting to none).

## [0.45.0] – 2026-09-01 · Healing items · Poké Mart Items section · Bag (in & out of battle)
### Added
- **Healing items.** A full line of consumables you can buy and use: **Potions** (Potion / Super / Hyper / Max Potion — restore 20 / 60 / 120 / full HP), **status heals** (Antidote, Burn Heal, Paralyze Heal, and Full Heal for any condition), and **Revives** (Revive → half HP, Max Revive → full HP) that bring back a fainted Pokémon. Items are data-driven (`data/items.js`), so adding more later is just a new entry.
- **Poké Mart — Items section.** The market now has an **Items** department next to Poké Balls, grouped by category (Potions / Status Heals / Revives) with live prices and your current stock.
- **Bag (outside battle).** A new **🎒 Bag** button on the Team tab opens your inventory: pick an item, then pick a valid target from your whole collection (only Pokémon the item can actually help are offered — e.g. Revive only lists fainted ones). This is the main way to heal HP, cure status, and revive between battles.
- **Items in battle.** The battle **Items** menu now lists healing items usable on your active Pokémon (HP potions and status cures) in addition to Poké Balls. Using one costs your turn — the enemy gets a free attack, as in the classic games.
- Save migrates to **v17** (adds the item inventory `resources.items`).

### Notes
- Revive is bag-only (outside battle) for now, since the active Pokémon can't be fainted mid-battle.

## [0.44.0] – 2026-09-01 · Natures · EV training (Training Grounds) · stat radar
### Added
- **Natures.** Every Pokémon now has one of the 25 classic natures. A nature raises one stat by **+10%** and lowers another by **−10%** (HP is never affected); five natures are neutral. Natures are rolled at creation (caught, gifted, hatched) and shown on the Pokémon card, with the boosted/lowered stat colour-coded (green/red). Existing Pokémon get a random nature via save migration to **v16** — their stats shift slightly to match.
- **Training Grounds (new building).** A new building in the city where you spend gold to add **Effort Values (EV)** to a stat of your choice. Pick a Pokémon, pick a stat, and each paid session adds EV (respecting the classic caps: **252 per stat, 510 total**). Upgrading the building raises the EV gained per session; gold isn't spent if a stat is already maxed.
- **Stat radar.** The Pokémon card now shows a hexagonal **radar chart** of the six stats above the stat table, so a Pokémon's shape (its strengths and weaknesses) is readable at a glance. The nature's boosted/lowered axes are highlighted.

### Notes
- EV training is active (gold-for-EV) for now; a passive/idle EV track can come later.
- Natures are rolled randomly on hatched Pokémon — nature inheritance (Everstone) is a future addition.

## [0.43.0] – 2026-09-01 · Status effects persist · paralysis · cure status
### Added
- **Status effects now persist.** Poison, burn (and the new paralysis) stay on a Pokémon through switching out **and** page refreshes — they no longer clear on their own. They last until you heal, for **both** your Pokémon and the enemy. Save migrates to **v15**.
- **Status is shown everywhere.** The PSN/BRN/PAR badge now appears not just in the Battle Area (for both sides) but also on each Pokémon in the **Team** tab and on its **card** (modal).
- **Paralysis.** A new status: a paralyzed Pokémon has a **25% chance to lose its turn** and moves at **half Speed** (affecting who acts first). It's inflicted by the new move **Body Slam** (Normal, 30% chance), which Rattata and Pidgey learn as they level up. Electric-types are immune.
- **Cure status.** A **💊 Cure** button appears on any team member with a status effect — it removes the status without restoring HP/PP (a full **Heal team** at the Poké Center still clears status too).

### Notes
- Status moves with no direct damage (power 0) are now supported by the engine, laying the groundwork for pure status moves (Thunder Wave, Stun Spore) later.

## [0.42.0] – 2026-09-01 · Critical hits · status effects · rarity affects catch rate
### Added
- **Critical hits.** Every attack has a ~1 in 16 chance to land a critical hit for 1.5× damage, called out in the log ("A critical hit!") and shown as a bigger, golden damage number.
- **Status effects — poison & burn.** Some moves can now inflict a status: **Poison Sting** may poison (30%), **Ember** may burn (10%). Poison drains 1/8 of max HP each round, burn drains 1/16 **and** halves the victim's physical damage. Immunities apply (Fire can't be burned; Poison/Steel can't be poisoned). A small **PSN/BRN badge** shows next to the affected Pokémon, and end-of-round damage floats up in the status colour.
- **Rarity now affects catch rate.** Rarer species are harder to catch — the base catch chance is scaled down by rarity (common 100% → uncommon 85% → rare 60% → epic 45% → legendary 30%), on top of the existing HP-based chance.

### Notes
- Status is tracked per battle for now (it clears if you switch that Pokémon out or on a page refresh). Paralysis and status persistence will come later.
### Added
- **A fainted Pokémon now drops and fades out.** When a Pokémon goes down (in a manual battle), it tilts, sinks and disappears before the scene moves on — the victory/catch window or the next team member only appears once the faint animation has played.

## [0.40.0] – 2026-09-01 · Manual battles play out turn by turn
### Changed
- **A manual round now resolves one attack at a time.** The faster Pokémon (by priority, then Speed) strikes first — its attack animation plays — and only after a short pause does the second Pokémon act, instead of both hitting at the same instant.
- **A knockout blow now shows its animation before the result window.** Fainting is handled after the attack animation finishes, so the finishing hit is always visible (previously the scene could switch to the victory/catch window before the animation played, which made the leap look like it "randomly" didn't happen).

### Fixed
- **You can no longer squeeze in another move mid-round.** Input is locked while the round is playing out (`resolving`), preventing overlapping turns from double-clicks.

## [0.39.2] – 2026-09-01 · Physical leap now actually reaches the target
### Fixed
- **The physical-attack leap now lands on the opponent.** The jump distance is measured from the sprites' real positions on screen instead of a fixed offset, so the attacker reaches the enemy sprite regardless of the battle area's size.

## [0.39.1] – 2026-09-01 · Physical vs. special attack animation · changelog tidy-up
### Added
- **Physical attacks now leap onto the target.** When a Pokémon uses a **physical** move, it jumps across and lands right on its opponent (a bigger arcing lunge), while **special** moves keep the previous short lunge for now.

### Changed
- **The in-game changelog opens fully collapsed.** No version is expanded by default anymore — click any version to read its entry.

### Removed
- **Dropped the empty "Unreleased" section** from the changelog.

## [0.39.0] – 2026-09-01 · Battle animations: attack lunge & hit reaction
### Added
- **Attack animation.** When a Pokémon lands a hit, the attacker now lunges toward its opponent and springs back — the enemy from the top, your Pokémon from the bottom.
- **Hit reaction.** The Pokémon that gets hit shakes and briefly flashes red (alongside the floating damage number), so exchanges read at a glance.
- *(Next: a faint animation when a Pokémon goes down.)*

## [0.38.5] – 2026-09-01 · "No Poké Balls" hint moved into the Catch button
### Changed
- **The "No Poké Balls" hint no longer sits below the battle log.** When you're out of balls in Auto mode, the header Catch button itself now reads **🔴 No Poké Balls** (disabled, with a tooltip pointing to the Poké Mart). Nothing is shown below the log anymore.

## [0.38.4] – 2026-09-01 · Catch button moved into the battle header
### Changed
- **The Catch button (Auto mode) moved up into the Battle Area header**, next to Pause/Resume and the Auto battle / Auto catch toggles, instead of sitting below the battle log. It still shows the current catch chance (%). Below the log there's now just a "No Poké Balls" hint when you're out.

## [0.38.3] – 2026-09-01 · Poké Ball inventory moved to the top bar
### Changed
- **The Poké Ball chips below the Catch button (Auto catch) are gone.** The catch controls now just show the **Catch** button (with a "no balls" hint when you're out).
- **Your Poké Ball inventory now lives in the top bar.** Hover the Poké Ball icon to see a breakdown of how many of each ball type you own.

## [0.38.2] – 2026-09-01 · Hide enemy HP numbers
### Changed
- **The wild Pokémon's numeric HP is now hidden** — only its HP bar is shown, so you can gauge roughly how hurt it is without knowing the exact value. Your own Pokémon still shows its full HP number.

## [0.38.1] – 2026-09-01 · Per-fight battle log · colored log lines
### Changed
- **The battle log now resets between fights** — it only ever shows the current encounter, instead of piling up across the whole session.
- **Log lines are color-coded by side:** your actions (attacks, catches, level-ups, wins) are green, the enemy's (its attacks, your Pokémon fainting, a Pokémon breaking free) are red; other lines stay neutral.

## [0.38.0] – 2026-09-01 · Victory & catch result window · manual is the default mode
### Added
- **Result window between encounters (manual mode only).** After you win or catch a wild Pokémon in a normal (non-Auto) battle, the fight now pauses and shows a result window before the next enemy appears, with a **Next battle ▶** button to continue.
  - **On a win:** a "Victory!" window listing the rewards — XP, gold, any loot, an egg if one dropped, and a level-up notice.
  - **On a successful catch:** a "Gotcha!" window showing the thrown Poké Ball (with a little wiggle) and the caught Pokémon settling inside it, plus whether it was added to your collection, improved an existing one, or was released.
- **A failed catch does not open a window** — the battle simply continues (the wild Pokémon gets its free attack), as before.
### Changed
- **Normal (manual) battle is now the default mode** for new games instead of Auto battle. Auto battle is still one toggle away in the Battle Area header.
- **Auto battle is unchanged** — it keeps chaining encounters continuously with no result window (idle behavior).

## [0.37.1] – 2026-09-01 · Bigger, bold battle command labels
### Changed
- **Battle command buttons now use large, bold, white labels** — **Battle / Run / Items / Switch** — with the icons removed, for a cleaner in-game look like the mainline titles.

## [0.37.0] – 2026-09-01 · Starter picker popup · type-colored battle UI
### Added
- **Starter selection popup on a new game.** Starting a new game now opens a modal with the starter Pokémon as picture cards (sprite, name, colored types) — pick one to begin, instead of hunting for the choice in the Pokédex. The window stays until you choose.
- **Type colors across the Battle Area.** Type badges (on both combatants' HP boxes and the enemy info panel) are now colored by their Pokémon type using the classic palette, and the move buttons in the Battle menu are tinted by each move's type.
### Changed
- **Battle command buttons use the classic menu colors** — **Battle** red, **Run** blue, **Items** orange, **Switch** green — like the mainline Pokémon games. – 2026-09-01 · Battle area redesign · scene fills the panel · side log · enemy info
### Changed
- **The battle scene now fills the whole Battle Area** instead of being locked to a 3:2 box that only used about a third of the panel. The background stretches across the available space.
- **The battle log moved to a side panel** on the right of the Battle Area (with the catch controls / message line below it), instead of sitting under the scene.
- **The command menu is overlaid in the scene.** In manual mode the root menu is a row of four tiles — **Battle / Run / Items / Switch** — along the bottom of the scene, so all four are always visible (nothing gets clipped by the fixed window). The player's sprite/HP box shifts up so the tiles don't cover it.
### Added
- **Battle opens a move window with enemy info.** Clicking **Battle** now opens an overlay over the scene: the wild Pokémon at the top with the 4 moves as a 2×2 grid below, and a **← Back** button. The enemy's **type and base stats (HP/Atk/Def/SpA/SpD/Spe)** are shown **only if you've already caught that species** (it's in your Pokédex); otherwise they read **???** with a hint to catch one. **Items** and **Switch** open in the same overlay window.

## [0.35.0] – 2026-09-01 · Manual battle UI · move-replacement popup
### Added
- **Manual battle menu (like a classic Pokémon game).** With **Auto battle** off, the battle window now shows a 4-button menu — **Battle / Run / Items / Switch**. **Battle** opens your active Pokémon's moves (name, type, category, power, PP) to pick your attack; **Items** opens your bag of Poké Balls to throw one and try to catch the wild Pokémon; **Switch** swaps in another team member; **Run** flees the fight. Each choice resolves one round (the enemy takes its turn too).
- **Move-replacement popup.** When a Pokémon levels up and learns a move but already knows 4, a popup now asks whether to **forget one move to make room** (or skip learning it) — instead of silently dropping the new move. It shows the new move next to your current four so you can compare, works through several queued learns one by one, and even handles moves learned **offline** (the queue is saved). Save migrates to **v14**.
### Changed
- **Manual mode resolves a full round per action.** Attacking, switching, or throwing a ball all count as your turn — the enemy responds. Running ends the battle.

## [0.34.0] – 2026-09-01 · Quick heal on the Defeat screen
### Added
- **Heal team right from the Defeat screen.** When your whole team faints, the defeat overlay now has a **🏥 Heal team** button — one click heals everyone (HP + PP) without going to the Poké Center. Once healed it turns into "✓ Team healed — ready to go" next to **New battle**.
### Changed
- **PP Regen upgrade retuned to +1 % per level, up to 100 %** (100 levels) so it takes a while to build up, instead of the previous +5 %/level.

## [0.33.0] – 2026-09-01 · Floating damage numbers · PP Regen upgrade
### Added
- **Floating damage numbers.** When a move connects, a red **"-N"** now pops up over the hit Pokémon in the battle scene and floats away — you can see each hit land, not just read it in the log.
- **PP Regen upgrade at the Poké Center.** A new **PP regen** upgrade line tops up a % of your active Pokémon's move PP after each **Auto battle** win (0 % until you buy it, up to 100 %). This keeps auto battles going instead of grinding down to Struggle once PP runs out. Manual mode still only refills PP via **Heal team**.

## [0.32.0] – 2026-09-01 · Move-based battle engine (damage · STAB · types · PP)
### Added
- **Battles now use real moves.** Each turn both sides pick a move and attack with it instead of a single fixed hit. Damage is computed from the move's **power and category** — physical moves use Attack vs. Defense, special moves use Sp. Atk vs. Sp. Def.
- **STAB and type effectiveness per move.** A move gets the **1.5× same-type bonus** when it matches the user's type, and its damage is scaled by how effective its type is against the target (super effective / not very effective shown in the log).
- **Accuracy and misses.** Moves can now **miss** based on their accuracy.
- **PP is consumed.** Each move use spends 1 PP; when a Pokémon has no usable move left it falls back to **Struggle** (a weak typeless attack; recoil will come later).
- **Priority-based turn order.** Turn order now respects **move priority first** (e.g. Quick Attack goes first), then Speed, with a random tiebreak.
### Changed
- **Auto/enemy move choice = highest expected damage** (a placeholder policy until the real auto-battle AI). Idle kill-speed estimates use this same best-move damage.

## [0.31.0] – 2026-09-01 · Pokémon know moves (moves + PP on individuals)
### Added
- **Pokémon now have moves.** Each individual carries up to **4 moves with PP** (`owned.moves` = `{ id, pp, maxPp }`), assigned from its species' level-up learnset when created. Save migrates to **v13**, giving existing Pokémon the moves they'd know at their current level (full PP).
- **Learn new moves on level-up.** When a Pokémon levels up and its species learns a new move, it's **auto-learned into a free slot** (up to 4). If all four slots are full, the new move is skipped for now — choosing which move to replace will come with the manual battle UI.
- **Moves on the Pokémon card.** The individual's card now shows a **Moves** section (name, type, category, PP x/max), so you can see what each Pokémon knows.
### Changed
- **Healing at the Poké Center also restores PP** (not just HP) — a full heal means full PP too. (PP isn't consumed yet; that lands with the turn engine.)

## [0.30.0] – 2026-09-01 · Persistent HP · battle rework foundations
### Added
- **Persistent per-Pokémon HP.** Each individual now carries its own current HP (`owned.hp`) that survives fainting, switching, and the end of a battle — the foundation for the manual battle mode (swapping, real stakes). Save migrates to v12, giving existing Pokémon full HP.
- **Heal team at the Poké Center.** The Poké Center building now has a **Heal team** button that restores your whole team to full HP — your manual way to recover, and the way back after a wipe.
- **Move data (`data/moves.js`).** First step of the battle rework: a data model for moves (physical / special / status category, accuracy with miss chance, PP) plus a starter set of 8 moves covering all current types.
- **Learnsets (`data/learnsets.js`).** Level-up learnsets per species (which moves a species learns and at what level); `movesAtLevel()` returns the (up to 4) most recent moves known at a given level. Not wired into gameplay yet.
### Changed
- **HP now matters and is mode-aware.** In **Auto battle** mode the Poké Center still auto-heals your active Pokémon after each win (up to its level-based cap) — leave it running and a wipe is on you. In **manual** mode you genuinely lose HP and must heal at the Poké Center. Full/background idle ignores HP entirely (it stays an abstraction). Level-up still heals to full.
### Fixed
- **Team HP no longer resets to full when a Pokémon faints.** Previously a fainted Pokémon showed full HP again in the Team tab (HP was only tracked for the active battler); now the whole team keeps its real, persistent HP, and fainted members are shown as such and skipped when the next one steps in.

## [0.29.0] – 2026-09-01 · Battle window controls, part 2
### Added
- **Pause/Resume moved up next to the toggles.** The Pause/Resume button now sits in the **top-right control cluster** of the battle window, next to Auto battle / Auto catch, instead of in a row under the scene.
- **Battle info textbox in the window (like a normal Pokémon game).** The battle narration is now shown in a dedicated, framed **message box** right under the scene — it auto-scrolls to the newest line and highlights it — so you can follow what's happening in the fight inside the battle window.
- **Auto catch mode selector.** Next to the Auto catch toggle there's now a small selector for **which Pokémon to auto-catch: All or Shiny only**.
### Changed
- **Pause and Auto battle are now separate things.** *Pause/Resume* only pauses/resumes the fight; *Auto battle* switches the mode where your Pokémon fight on their own (automatic turns). Manual mode (the opposite) will come later — for now, with Auto battle off, the fight simply doesn't take automatic turns.
### Removed
- **Auto-catch "Better IVs" and "New species" filters** (the old three-checkbox row). Auto catch is now a simple **All / Shiny only** choice; Better IVs is dropped for now.

## [0.28.0] – 2026-09-01 · Battle window controls reshuffle
### Added
- **Global game settings in the top bar (⚙).** A new settings button opens a dropdown for options that affect the whole game. First option: **Game speed (1× / 2× / 4×)**, moved here out of the Battle Area. Placeholder note lists more options coming later (Lock max level, Nuzlocke, …).
- **Auto battle / Auto catch toggles in the battle window.** Two checkboxes sit at the **top-right of the Battle Area**. *Auto battle* controls whether the fight runs on its own — turning it on starts/resumes the battle (and a saved battle auto-resumes on load); turning it off pauses it. *Auto catch* is the former autocatch switch (its New species / Better IVs / Shiny filters stay below the Catch button).
- **Defeat screen inside the battle window.** When your whole team faints, the scene now shows a **"Defeated"** overlay with a **New battle** button right in the battle window, instead of a plain control-row button.
### Changed
- **Game speed is now a global, persisted setting** (`settings.speed`) rather than per-battle state, controlled from the top-bar settings menu.
### Fixed
- **The Battle Area window is now fixed-size and never scrolls.** The panel is a flex column with hidden overflow; the scene has a bounded height (its width is derived from the height so the whole background image still shows, no cropping), and only the battle log scrolls internally when needed.
### Removed
- Speed buttons and the standalone "Autocatch" checkbox from the Battle Area controls (moved to the settings menu / top-right toggles).

## [0.27.0] – 2026-09-01 · Pokémon sprites in-game · Team & battle bars
### Added
- **Real Pokémon sprites in the game.** The Pokédex (caught cards) and the Pokémon card now render the actual sprite from `assets/pokemon/<id>/<view>.png` instead of the `?` placeholder. Shiny individuals automatically use the `shiny-<view>` variant. Sprites are prepared to a uniform standard (256×256 transparent canvas, character scaled so its longer side is 232 px, centered) via `tools/prep_sprite.py`. First species with art: Bulbasaur, Charmander, Squirtle, Pidgey, Rattata, Ditto.
- **Gender-specific sprites.** Females (`gender === "f"`) first try a `-f` variant (e.g. `back-f.png`, `shiny-back-f.png`) and automatically fall back to the default sprite when a species has no separate female art — so `-f` files are only needed where the sprite actually differs (Rattata's back, for now).
- **HP and EXP bars in the Team tab.** Each team slot now shows a live **HP bar** (real remaining HP for the Pokémon currently battling, full HP otherwise) and an **EXP bar** toward the next level.
- **EXP bar in the Battle Area.** Your active Pokémon now shows an EXP bar under its HP bar, so you can watch it fill toward the next level during battle.
- **The Battle Area is now a real scene (first step toward the battle rework).** Instead of text-only combatant cards, the battle draws a **background scene** that fills the whole battle window (3:2, so the full image shows without ugly cropping), with the fighters as an **overlay on top**: the wild enemy up top from the **front**, your Pokémon at the bottom from the **back**, each with a small translucent name + HP/XP panel. Shiny and female (`-f`) sprite variants are respected. Purely visual — the battle logic is unchanged.
- **Battle backgrounds that change each fight, shared by environment.** Backgrounds are **shared across areas by biome**, not tied to a single route: images live flat in `assets/backgrounds/` with descriptive names, grouped into biomes in `data/backgrounds.js`, and an area just points at a biome (`data/areas.js` → `biome`). The game **randomly picks one and re-rolls it on every new encounter** (after a win or a catch), so the scenery changes battle to battle while staying stable within one fight (survives refresh). Biome `grassland` ships with 3 test backgrounds (forest / path / grass); Route 1 uses it. If a biome has no images, a fallback gradient shows and nothing breaks (see `assets/backgrounds/README.md`).

## [0.26.0] – 2026-09-01 · Poké Ball art everywhere
### Added
- **Real Poké Ball sprites everywhere.** All 13 in-game balls now have art in `assets/pokeballs/<id>-ball.png`, so the ball icon shows the actual image in the top bar, the Battle Area ball chips, the Poké Mart, and the "Caught in" line on the Pokémon card. The image is now the **primary** icon — the emoji is only a fallback if a sprite is genuinely missing (no more emoji flash before the image loads).
- **Reserved future balls.** 13 more balls (Premier, Friend, Love, Heavy, Lure, Moon, Dusk, Dive, Dream, Safari, Sport, Park, Cherish) are pre-registered in `data/pokeballs.js` with `comingSoon: true` and their sprites in place. They **don't appear** in the shop or in battle yet (no mechanic), but their art is wired and ready — enabling one later just means giving it a tier/price/bonus.
### Notes
- **Beast Ball** (the only ball missing from the full roster) is intentionally deferred until Ultra Beasts exist — no sprite or data yet (tracked in BACKLOG).

## [0.25.0] – 2026-09-01 · Per-individual gender (♂/♀)
### Added
- **Per-individual gender.** Each Pokémon now has its own **sex** (♂/♀, or genderless for species like Ditto), rolled from the species' gender ratio when the individual is created (caught, gifted, or hatched). New helper `rollGender` in `pokemonSystem.js`.
- **Gender symbol in the UI.** The ♂/♀ symbol now shows next to a Pokémon's name on the **Pokémon card** (with a dedicated "Gender" row in the details, alongside the species ratio), on **caught Pokédex cards**, and on **Team slots**. Blue ♂ / pink ♀; genderless shows nothing. New helper `src/ui/gender.js` (`genderSymbolHtml`).
### Changed
- Save model bumped to **v11** (`gender` on each Pokémon; existing Pokémon get a gender rolled once from their species ratio during migration).

## [0.24.0] – 2026-09-01 · Starters always seen · Poké Ball icons · caught-in ball
### Added
- **Starters are always in the Pokédex as "seen"** — you really see all of them on the starter selection screen, so Bulbasaur, Charmander, Squirtle and Ditto now show up as discovered from the start (the one you pick is "caught"). Also backfilled for existing saves. Starter IDs are now a single source of truth (`STARTER_IDS` in `data/pokemon.js`).
- **Poké Ball icons from art assets.** The Poké Ball counter in the top bar, the ball chips in the Battle Area, and the Poké Mart shop rows now render the actual ball image from `assets/pokeballs/<id>-ball.png` (e.g. `poke-ball.png`), with the emoji as a **fallback** until the image loads. New helper `src/ui/ballIcon.js`.
- **"Caught in" ball on the Pokémon card.** Each caught individual now records the **ball it was caught in** (`caughtBall`) and the card shows that ball's icon + name. Wild catches record the ball actually used; starters are marked as caught in a Poké Ball; hatched/gifted Pokémon show "— (gift / hatched)".
### Changed
- Save model bumped to **v10** (`caughtBall` on each Pokémon; existing Pokémon are backfilled to Poké Ball as a best-effort default, since the original ball wasn't recorded before).

## [0.23.0] – 2026-09-01 · Pokémon card (full detail view)
### Added
- **Pokémon card (R-025)** — a modal with the full detail of a Pokémon, opened by **clicking a Team slot** or a **Pokédex card**. Two modes:
  - **Caught individual:** sprite (shiny variant if shiny), name + dex number + types + rarity, **level and EXP bar**, a **stats table** with each of the 6 stats showing species base, the individual's computed value, its **IV (0–31, with a bar)** and **EV (0–252, with a bar)**, plus IV total / % and EV total / 510. Gender ratio, egg groups, generation, and a shiny marker.
  - **Seen-but-not-caught species:** silhouette + name + dex + types, a "Seen — not caught yet" tag, the species' **base stats**, gender ratio, egg groups, generation.
- **"Where to catch"** section on the card — lists the real areas the species appears in (from `area.species`: name · region · recommended level), or "Not currently found in the wild." Unseen species can't be opened.
### Changed
- Team slots and caught/seen Pokédex cards now show a hover highlight to signal they're clickable.
### Notes
- **Gender** is shown as the species' **ratio** (♂/♀ % or Genderless), not a per-individual sex — per-individual gender isn't stored yet (see BACKLOG). Likewise the **ball a Pokémon was caught in** isn't on the card yet: the `caughtBall` field doesn't exist in the data model (a separate BACKLOG item). Both will appear on the card once those seams land.

## [0.22.0] – 2026-09-01 · Pokédex (replaces the Collection tab)
### Added
- **Pokédex tab** (in place of Collection). Lists **every species** ordered by dex number with one of three states: **caught** (you own it — shows its sprite, dex number, name, shiny ✨ mark, and a team action), **seen** (met in battle but not yet owned — silhouette + name + "Seen" tag), or **unseen** (silhouette + "???"). A **"caught X / of Y"** counter sits in the header.
- **"Seen" tracking.** Encountering a wild Pokémon in battle now records it in the Pokédex (`state.pokedex.seen`); caught status is still derived from your collection (R-018: one individual per species). New system `src/systems/pokedex.js` (`markSeen`, `dexStatus`, `dexCounts`, `isCaught`, `areasForSpecies`).
- **Search & filters** in the Pokédex (reusing the shared filter bar): search by name (only for species you've discovered — unseen ones stay hidden) or by dex number, filter by **status** (All / Caught / Seen / Missing) and by **type**.
- **Sprite rendering helper** `src/ui/sprites.js` (`spriteImg`, `silhouetteHtml`) with a graceful **"?" placeholder fallback**, so the game works before any sprite art is dropped in. Sprites load from the flat `assets/pokemon/<id>/` folders.
- **Collapsible changelog.** The "What's new" window now shows each version as a **click-to-expand** row (native `<details>`), so you see the version list at a glance instead of scrolling through everything — the newest version opens by default.
### Changed
- **The Collection tab is gone**, replaced by the Pokédex. The **starter picker** (empty-collection state) and the **add-to-team** action moved into the Pokédex; the Team tab's empty hint now points there.
- Save model bumped to **v9** (adds `pokedex.seen`, filled in lazily; old saves keep working — everything you already own shows up as caught immediately).

## [0.21.0] – 2026-09-01 · Species schema: gender ratio + generation
### Added
- **`gen` on every species** (generation number, 1 = Kanto). Groundwork for the per-generation maps (each map will only let you catch that generation's Pokémon). Does **not** affect the sprite path — sprites stay in one flat folder keyed by `id`.
- **`genderRatio` on every species** — either `{ m, f }` shares (summing to 1) or `"genderless"` (Ditto). Canonical values: starters 87.5 % ♂ / 12.5 % ♀, Pidgey/Rattata 50/50, Ditto genderless. Groundwork for the Pokémon card / Pokédex and future per-individual gender.
- Typedefs extended in `data/pokemon.js` (`GenderRatio`, plus `gen`/`genderRatio` on `Species`), with a note that `id` doubles as the sprite folder name.
### Changed
- Pure data addition — **no save bump**, no behavioural change yet (fields aren't rendered anywhere until the card/Pokédex/maps land).

## [0.20.1] – 2026-09-01 · Fix: one Pokémon, one place
### Fixed
- **A Pokémon set up for breeding (or training in the Day Care) can no longer be added to the team.** The Collection tab now shows **"in Day Care" / "in breeding"** instead of an "Add to team" button for those Pokémon, and `addToTeam` refuses them as a safety net. This enforces the "a Pokémon can only be in one place at a time" rule in the remaining direction — the Day Care/breeding pickers already excluded team members. New shared helper `pokemonEngagement(uid)` in `buildingSystem.js`.

## [0.20.0] – 2026-08-31 · Breeding by egg groups (R-022)
### Added
- **Breeding at the Day Care (R-022).** Two Pokémon placed in the new **breeding slots** (Parent A + Parent B) produce an egg over time if they're compatible: they must **share an egg group**, or one of them must be a **Ditto** (the wildcard "žolík" — egg group `ditto`, pairs with anything that can breed; two Dittos can't, and `no-eggs` species never breed). A compatible pair lays an egg roughly every `BREED_MINUTES` (30 min), ticking **live and offline** (capped at `OFFLINE_CAP_HOURS`, like training/incubation).
- **Bred eggs inherit genetics.** A bred egg carries the parents' IVs and rolls at hatch: **3 IVs are inherited** from the parents (`INHERIT_IV_COUNT`, configurable — future Destiny Knot item will raise it), the rest are random, and the shiny odds are boosted to **1/4096** (`BREED_SHINY_CHANCE`, Masuda-style, double the normal 1/8192). As with all eggs (R-021) the species and exact stats stay hidden until it hatches.
- **Breeding window** in the Day Care: a **"💞 Breeding"** button opens a window with the two parent slots (Choose parent / Remove), a compatibility indicator, and a live progress bar toward the next egg. Parent picker reuses the shared Pokémon picker (search / rarity / type / shiny / sort), offering only breedable Pokémon outside your team, training slot and the other parent slot.
- **Ditto** added to `data/pokemon.js` (dexNo 132, egg group `ditto`). **Temporarily available as a starter** so breeding can be tested; it will become a normal catch later (see BACKLOG).
### Fixed
- **Live progress in real time.** Breeding and egg-incubation progress bars (and countdowns) now advance **every second** in an open window, instead of only updating when an egg was produced/hatched or when another system (a running battle) forced a redraw. Breeding and incubation loops tick at 1 s and commit each tick while active.
### Changed
- The Day Care window now shows a **Breeding** status line (parents / compatibility / progress) alongside training and Egg Breeders.
- The Day Care training picker now also **excludes Pokémon set up for breeding** (a Pokémon can only be in one Day Care role at a time).
- Save model bumped to **v8** (breeding slot `city.daycare.breeding = { a, b, buffer }`, filled in lazily; old saves keep working).

## [0.19.0] – 2026-08-31 · Poké Mart Market window
### Added
- **Market window in the Poké Mart:** a **"🛒 Market"** button opens a shop hub whose goods are split into clickable **departments** (shown as cards). First department is **Poké Balls**, which opens its own window listing the balls as tidy rows (icon, name, description, owned count, buy button). Built to grow — future departments (items, evolution stones…) drop in as more cards.
### Changed
- The ball shop is no longer inline in the Poké Mart window; it lives two clicks deep (Market → Poké Balls), keeping the building window focused on actions (Market / Upgrades).
- **Locked / not-yet-unlocked goods are hidden** from the shop entirely — the Poké Balls list shows only what you can actually buy right now (unlocked and priced), instead of previewing locked/special balls.

## [0.18.0] – 2026-08-31 · Picker filters (Day Care + eggs)
### Added
- **Day Care picker filters:** search by name, rarity toggles, type toggles, "✨ Shiny only", and sorting (Level ↓ / Name A–Z / Dex #). Tiles now also show rarity and type. Filter options are built from the Pokémon you actually own. The whole filter panel is tucked behind a **"🔎 Filters"** toggle button.
- **Egg picker filters:** rarity toggles and hatch-time sorting (↑/↓), also behind the "🔎 Filters" toggle. In line with R-021 the egg species stays hidden — you filter/sort only by rarity and hatch time (never by name/species).
### Added
- **Egg Breeders window** in the Day Care: a single **"🥚 Hatch an egg"** button opens a window with a grid of all breeder slots (max = Egg slots cap). Each unlocked empty slot has its own **"Hatch an egg"** button that opens the egg picker; occupied slots show the incubating egg (🥚 + progress + time + "Take out"); still-locked slots show 🔒.
### Changed
- **Upgrades moved behind a menu.** Every building now has an **"⬆️ Upgrades"** button that opens a dedicated window listing the building upgrade and any upgrade lines (tracks) together, keeping the main building window focused on actions (shop / Day Care / breeders).
- **Egg species is now hidden until it hatches** (R-021). The breeders and the egg picker show only "Egg" and the incubation time/progress — no species name — so hatching stays a surprise.

## [0.16.0] – 2026-08-31 · Day Care hatch upgrades + multi-slot incubation
### Added
- **Day Care upgrade lines (tracks):** two independent upgrade tracks with their own level and cost curve — **Hatch speed** (Lv 1→50, +1 %/level, up to +50 % faster incubation) and **Egg slots** (Lv 1→10, incubate 1→10 eggs at once). Generic, data-driven mechanism (`BuildingDef.tracks` in `data/buildings.js`, logic in `src/systems/buildingSystem.js`), reusable for other buildings.
- **Incubate multiple eggs at once** – the Day Care now shows one progress row per incubating egg with its own "Take out" button; pick eggs into any free slot.
### Changed
- Incubation model reworked from a single egg slot to an **array of slots** (`city.daycare.eggs`); the old single `city.daycare.egg` is migrated in lazily (no save-version bump). Offline hatching and the "Welcome back" summary now report **all** eggs that hatched while away.

## [0.15.0] – 2026-08-31 · Eggs + hatching
### Added
- **Eggs drop from battles** – after a victory there is a small chance (`EGG_DROP_CHANCE`) to find an egg. The egg's species is drawn from the area's species pool (`data/areas.js` → `species`); its genetics (IV/EV/shiny) are rolled only when it hatches.
- **Hatching at the Day Care** – the Day Care now has a **second slot** for an egg. Incubation ticks while the game runs and offline (same as passive training, no efficiency nerf, capped at `OFFLINE_CAP_HOURS`). Hatch time scales with the species' **rarity** (`data/eggs.js`). When it hatches, the Pokémon (Lv 1–5) goes through `acquirePokemon()` (R-018): a new species is added, otherwise only better values are merged.
- **Egg inventory** (`state.eggs`) with a 🥚 counter in the top bar; an egg picker in the Day Care; a live incubation progress bar; and an egg-hatched line in the offline "Welcome back" summary plus a status message when one hatches live.
- Battle enemies now spawn from the **area's species pool** (`area.species`) instead of a hardcoded list.
### Changed
- Save model **v6 → v7**: adds `eggs: []`; the Day Care incubation slot (`city.daycare.egg`) is filled in lazily.
### Decisions
- R-021: eggs are a rare battle drop carrying a species from the area; genetics roll at hatch; hatch time scales with rarity; hatching reuses `acquirePokemon`. Breeding (egg groups) builds on this system next. Masuda/shiny-boosted eggs and per-area egg chances are deferred (see docs/BACKLOG.md).

## [0.14.0] – 2026-08-31 · Poké Ball types + Poké Mart shop
### Added
- **13 Poké Ball types** with classic-style properties (`data/pokeballs.js`): Poké, Great, Ultra, Master, Net, Nest, Quick, Timer, Repeat, Level, Fast, Heal, Luxury. Each ball multiplies the catch chance; conditional bonuses are evaluated from the battle context (`src/systems/pokeballSystem.js`) — e.g. Quick (×5 first turn), Net (×3.5 vs Water/Bug), Repeat (×3.5 on owned species), Timer (grows with rounds), Nest (better vs low-level), Level (out-leveling), Fast (fast species). Master Ball is a guaranteed catch.
- **Ball type picker in battle:** the Battle Area shows the balls you own; the selected type is used for both manual and auto catch, and the 🔴 Catch button shows the real chance for that ball.
- **Poké Ball inventory by type** (`resources.balls`): balls are counted per type; the top bar shows the total.
- **Poké Mart shop:** buy any unlocked ball type; upgrading the Mart lowers all ball prices (percentage discount).
- **Progression-gated unlocks:** balls have a `tier` and unlock as you advance through the world (`progress.tier`). Locked types are shown as a preview in the shop. The starter set is available from the start.
### Changed
- **Poké Balls are no longer loot** – they are bought in the Poké Mart only (Route 1 drop table cleared).
- Save model **v5 → v6**: `resources.pokeballs` (single count) → `resources.balls` (per-type map, migrated to the `poke` type); adds `settings.selectedBall` and `progress.tier`.
### Decisions
- R-020: balls are shop-only (no loot); ball types unlock by world progression (tier). Master Ball is not for sale — a future milestone reward. Effects needing data we don't have yet (Love/Heavy/Dusk/Dive/Dream…) are deferred (see docs/BACKLOG.md).

## [0.13.0] – 2026-08-31 · Catching in battle + autocatch
### Added
- **Catching happens in battle** – you can only catch the enemy you are currently fighting. New **🔴 Catch** button in the Battle Area attempts to catch the current enemy for 1 Poké Ball; the catch chance depends on the enemy's HP (the lower the HP, the higher the chance).
- **Autocatch** toggle with filters (New species / Better IVs / Shiny): during battle the game automatically tries to catch enemies that match the enabled filters, as long as you have Poké Balls. Settings are saved.
- `acquirePokemon()` – the "one per species, merge the better values" rule (R-018): catching a species you already own transfers only the **better** values (higher per-stat IV/EV, shiny) onto your existing individual; level and XP stay, the newly caught one is released.
### Changed
- The old "Catch wild" button in the Collection was removed – catching is now tied to battle.
- Save model **v4 → v5**: adds `settings.autocatch` (default: off; filters on). Old saves keep working with catching disabled until you turn it on.
### Decisions
- R-019: catch chance scales with enemy HP; catching a Pokémon is an alternative to defeating it (no XP/gold on catch). Poké Ball types and species rarity affecting the catch rate are deferred (see docs/BACKLOG.md).

## [0.12.0] – 2026-08-31 · In-game changelog + backlog
### Added
- **"What's new" window inside the game** – clicking the version in the footer opens the changelog. It loads from `CHANGELOG.md` (single source of truth) with a lightweight Markdown conversion (`src/ui/changelogView.js`).
- **`docs/BACKLOG.md`** – a list of things that are prepared or agreed upon but not yet finished (EV/Training Grounds, `acquirePokemon`, eggs, hatching, breeding, Poké Ball types…), so we don't forget them.

## [0.11.0] – 2026-08-31 · IV, EV and shiny
### Added
- **IV (Individual Values):** every individual has IVs 0–31 per stat, random and fixed at creation (`randomIvs` in `pokemonSystem.js`). They affect battle stats.
- **EV (Effort Values):** field 0–252 per stat (max 510 total) + contribution to stats. **Not gained from battles** – they will come from the future **Training Grounds** building; the seam `addEv(pokemon, stat, amount)` is ready, respecting the caps.
- **Shiny:** rare color variant (cosmetic), rolled at creation (`SHINY_CHANCE = 1/8192`, the classic value – tunable). Shown as ✨ in the Collection, Team, battle, and in the catch message.
- `data/pokemon.js`: species now have `eggGroups` and `rarity` (preparation for eggs/breeding).
- Collection and Team show an **IV % · EV** line per individual (quality at a glance).
### Changed
- `computeStats()` now computes stats from base + level + IV + EV (Gen 3+ formula without natures). Backward compatible: if IV/EV are missing, they count as 0 and the numbers come out as before.
- Save model **v3 → v4**: migration fills existing individuals with random IVs, empty EVs and `shiny=false` (stats are only filled in, not overwritten).
### Decisions
- R-017: EVs are gained through training (Training Grounds), not from battles. R-018: rule "duplicate = merge the better values (IV/EV/shiny) into the existing one, the new one is released; one individual per species in the collection" – built in the next step (`acquirePokemon`).

## [0.10.0] – 2026-08-31 · Unique species + Day Care picker as boxes
### Changed
- **Each Pokémon can be owned only once (per species).** Catching only allows a species you don't have yet; when all available species are caught, the Poké Ball is not consumed (`catchWild` + new `ownsSpecies` in `team.js`).
- **Choosing a Pokémon for the Day Care** is no longer a dropdown: the detail has a button that **opens a separate window** with a **scrollable grid of tiles ("boxes") and search by name** – usable even with hundreds of Pokémon (`buildingView.js` `openDaycarePicker` + `.daycare-*` styles).
### Note
- The uniqueness rule applies to new catches; any older duplicates in a save are not deleted automatically (irreversible) – can be cleaned up on request.

## [0.9.0] – 2026-08-31 · Third building: Day Care + Center rebalance
### Added
- New building **Day Care** (`data/buildings.js`, `src/systems/daycare.js`): place a Pokémon (outside the team) and it passively gains XP – both while playing and **offline** (full rate, 8 h cap; not nerfed like battle idle, because passive training is the whole point of the building).
- `daycareXpPerMinute()`, occupant slot `city.daycare` (uid + fractional XP buffer), `setDaycareOccupant`/`clearDaycareOccupant` in `buildingSystem.js`.
- Active training loop (`startDaycareLoop`, tick every 15 s) + offline catch-up (`applyDaycareOffline`).
- Day Care detail in `buildingView.js`: choose a Pokémon (outside the team), pick up, show the rate and the occupant's XP.
- The return summary (`offlineView.js`) is now **sectioned** – it shows battle idle and the Day Care together.
- CSS facade of the Day Care as a fallback.
### Changed
- **Pokémon Center rebalanced:** healing is now **1 % per level, capped at 50 %** (previously 10 % + 5 %/level). To make the cap reachable, the Center has max level 50 and a gentler upgrade cost curve (tunable in data).
- `healPercent()` respects the `maxPercent` cap.
### Decisions
- R-015: third building = Day Care (passive idle XP, offline at full rate). R-016: Center healing 1 %/level, cap 50 %.

## [0.8.1] – 2026-08-31 · Pokémon Center image sprite
### Added
- Pixel-art sprite of the Pokémon Center (provided by the user) → `sprite` in `data/buildings.js`. The CSS facade remains as a fallback.
### Changed
- The grassy background of the sprite was removed via green color-keying (Pillow) and cropped → transparent building. Source `pokecenter.png` kept.

## [0.8.0] – 2026-08-31 · Second building: Pokémon Center
### Added
- New building **Pokémon Center** (`data/buildings.js`): after each victory it heals part of the active Pokémon's max HP (Lv 1 = 10 %, +5 % per level). It exists from the start, upgrades increase healing.
- `healPercent()` in `buildingSystem.js`; `battleSystem` heals the player after a win (except on level-up, where HP is filled to max) and logs it.
- The building detail (`buildingView.js`) is now **data-generic**: sections and actions are assembled based on the building's capabilities (`ball` = buying Poké Balls, `heal` = healing). The upgrade is shared.
- CSS facade of the Pokémon Center (white clinic) as a fallback when the building has no image.
### Decisions
- R-014: second building = Pokémon Center; "heal after victory" effect (integer HP, scales with upgrades and max HP). No save version change – just a new record in `city.buildings`.

## [0.7.0] – 2026-08-31 · Building image sprite (Poké Mart)
### Added
- Graphic assets: `assets/buildings/` folder + pixel-art sprite of the Poké Mart (provided by the user).
- The building is shown in the city as an **image** (`sprite` field in `data/buildings.js`); the CSS house remains as a fallback when the sprite is missing.
- `image-rendering: pixelated` for crisp pixel-art.
### Changed
- The sprite background was removed (flood fill from the corners via Pillow) and cropped → transparent building on the grass.
### Decisions
- R-013: buildings can be image sprites (local assets, no dependency); appearance driven by data.

## [0.6.3] – 2026-08-31 · Poké Mart as a storefront (not a cube)
### Changed
- The building is no longer a solid-color cube: **roof (color from data) + cream walls** + a front **storefront** (red awning, windows, entrance) – pure CSS `clip-path`.
- Building emoji `🛒` → `🏪` (shop).
### Added
- The facade is styled per building (`.iso-b-<id>`), so each building can have its own look.

## [0.6.2] – 2026-08-31 · Isometric 2.5D city
### Changed
- The city was redrawn as **isometric 2.5D** (pure CSS, no dependencies): buildings are 3D houses (roof + 2 walls via `clip-path`) on a grassy area, empty lots as flat diamonds.
- The building's roof color is data-driven (`color` in `data/buildings.js`).
### Decisions
- R-012: city visualization = isometric CSS (true WebGL 3D deferred as a later optional upgrade – it would add a dependency and is the lowest priority per the spec).

## [0.6.1] – 2026-08-31 · City as a clickable map
### Changed
- The **City** tab is no longer a list of cards but a **visual city**: buildings are tiles on a map + empty lots for future buildings.
- **Clicking a building opens its detail** (modal) with options (Buy Poké Ball / Upgrade); the numbers update live, close with a button / Esc / clicking outside.
### Added
- `src/ui/buildingView.js` (building detail) + city map and detail styles.

## [0.6.0] – 2026-08-31 · Step 5 (city + building) → MVP done
### Added
- **City → Building** concept: data definition `data/buildings.js` + logic `src/systems/buildingSystem.js`.
- First building **Poké Mart**: buy Poké Balls for gold; **upgrading the building lowers the price** (levels 1–10, upgrade cost grows ×1.6).
- Functional **City** tab `src/ui/cityView.js` (building card, Buy / Upgrade buttons with disabled state) + building styles.
- State extended with `city.buildings`; save migration **v2 → v3**.
### Changed
- `CURRENT_SAVE_VERSION` = 3; `leftPanel` passes `onStatus` to the city.
### Decisions
- R-010: first building = Poké Mart (buy Poké Balls, upgrade lowers price). With this step the **MVP (Steps 0–5) is done**.

## [0.5.1] – 2026-08-31 · Fix offline progress sensitivity
### Fixed
- A short absence (~1 min) showed no offline gain. Causes: the 60 s minimum threshold and rounding the number of defeats down (over a short time → 0).
### Changed
- `MIN_OFFLINE_SECONDS` lowered 60 → 15 s.
- Offline is computed from a **fractional** number of defeats (no lost progress); rewards are rounded only at the end. The summary is shown as soon as at least some XP/gold/loot comes out.

## [0.5.0] – 2026-08-31 · Step 4 (idle/offline progress + loot)
### Added
- **Offline (idle) progress** `src/systems/idle.js`: after returning, it computes the reward for the time away (estimated from strength), with an 8 h cap. Counted only from a running battle.
- Constant `OFFLINE_EFFICIENCY = 0.1` – offline is intentionally 10× weaker than active play (tunable with a single number).
- **Loot** `src/systems/loot.js` (`rollLoot`, `expectedLoot`) + a data drop table in `data/areas.js` (Route 1: chance for a Poké Ball).
- Return summary panel `src/ui/offlineView.js` (time away, defeats, XP, gold, loot) + modal styles.
- Shared formulas in `battleSystem.js`: `battleRewards`, `avgDamage`, `makeCombatant`, `lootLabel` (single source of truth for battle and idle).
### Changed
- `handleFaint` rolls loot from the area and adds it to resources (+ log entry).
- `src/main.js`: after loading, it applies offline progress (before restoring the battle) and shows the summary; saves immediately (resets `lastSaved`).
### Decisions
- R-008 (v0.4.1), R-009: idle model = estimate from strength, offline efficiency 1/10, minimal loot (Poké Ball drop).

## [0.4.1] – 2026-08-31 · Direct battle save
### Fixed
- **F5 no longer "revives" Pokémon.** An in-progress battle (player and enemy HP, log, area, speed, team order) is saved and restored on load – paused, the player restarts it with a button.
### Added
- `serialize()` / `restore()` in `src/systems/battleSystem.js`; `persist()` called in `emit()` projects the battle into the game state.
- `battle` field in the game state (`createNewGame`); save migration **v1 → v2** fills in `battle: null`.
### Changed
- `CURRENT_SAVE_VERSION` = 2.
- `src/main.js` calls `restore(getState().battle)` after loading/creating a game.

## [0.4.0] – 2026-08-31 · Step 3 (Battle Area)
### Added
- Type effectiveness `data/types.js` (`typeMultiplier`).
- Progression `src/systems/progression.js` (`xpForNextLevel`, `grantXp`).
- `computeStats` in `src/systems/pokemonSystem.js`.
- Battle system `src/systems/battleSystem.js`: auto battle, damage with types, XP/level, gold, start/pause, speed 1/2/4×, `stopBattle`.
- Visual `src/ui/battleView.js`: HP bars, controls, log.
- `BATTLE_UPDATE` event; Battle Area styles.
### Changed
- `saveControls.js` calls `stopBattle` on New Game / Import.
### Decisions
- R-007: battle MVP = type effectiveness + auto mode with start/pause and speed.

## [0.3.0] – 2026-08-31 · Step 2 (team and obtaining Pokémon)
### Added
- Pokémon system `src/systems/pokemonSystem.js` (`createPokemon`).
- Team system `src/systems/team.js`: `chooseStarter`, `catchWild`, `addToTeam`, `removeFromTeam`, `moveInTeam`, `getTeamPokemon`, `isInTeam`.
- Left-panel UI tabs Team / Collection / City: `src/ui/leftPanel.js`, `src/ui/teamView.js`.
- Styles for tabs, type badges and team elements.
### Changed
- `src/main.js` uses `renderLeftPanel` and redraws it on state change.
### Decisions
- R-006: left panel with tabs (keeps the three panels per the spec).

## [0.2.0] – 2026-08-31 · Step 1 (persistent foundation)
### Added
- Event bus `src/core/events.js` (separating logic from UI).
- Game state core `src/core/state.js` (`GameState`, `createNewGame`, `saveVersion` versioning, `MAX_TEAM_SIZE`).
- Save system `src/systems/save.js`: localStorage, autosave, versioned save with migration, **export/import to .txt**.
- Data layer `data/pokemon.js` (5 species: Bulbasaur, Charmander, Squirtle, Pidgey, Rattata + `getSpecies`).
- UI `src/ui/saveControls.js`: Save / Export / Import / New Game buttons.
- Resource bar wired to the real state (Gold, Poké Balls, number of Pokémon).
### Changed
- `src/main.js`: bootstrap loads/creates a game, wires UI to `STATE_CHANGED`, autosave every 30 s + on tab close.

## [0.1.0] – 2026-08-31 · Step 0 (project skeleton)
### Added
- Project documentation: `docs/NOTES.md` (journal) and `CHANGELOG.md` (this file).
- Approved decisions R-001 to R-005 (technology, architecture, roadmap, documentation, testing).
- Project skeleton: `index.html`, `css/main.css`.
- Modular JS: `src/main.js` (bootstrap), `src/core/version.js`, UI modules
  `src/ui/{cityView,battleView,mapView}.js`.
- Data layer – example: `data/areas.js` (first area Route 1).
- Main screen layout: city on the left, Battle Area top right, map bottom right.
- `.nojekyll`, `.gitignore`, updated `README.md`.

---

## [0.0.0] – 2026-08-31
### Added
- Repository creation, empty `README.md` (Initial commit).
- Verified the git workflow from the work computer (clone + push over HTTPS works).

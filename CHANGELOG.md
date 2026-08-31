# CHANGELOG

An overview of what we have actually done. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [semantic versioning](https://semver.org/).

Change types: **Added**, **Changed**, **Fixed**, **Removed**.
For details on discussions and decisions see [docs/NOTES.md](docs/NOTES.md).

## [Unreleased]

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

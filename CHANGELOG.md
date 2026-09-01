# CHANGELOG

An overview of what we have actually done. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [semantic versioning](https://semver.org/).

Change types: **Added**, **Changed**, **Fixed**, **Removed**.
For details on discussions and decisions see [docs/NOTES.md](docs/NOTES.md).

## [Unreleased]

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

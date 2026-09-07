# Sprity – TODO (Kanto 151)

Do každé složky `assets/pokemon/<id>/` patří: `front.png`, `back.png`, `shiny-front.png`, `shiny-back.png`
(+ `-f` samičí varianty u druhů s viditelným pohlavním dimorfismem). Vše prohnat přes `tools/prep_sprite.py`
(256×256, průhledné pozadí, obsah 232 px). Zatím fallback „?".

---

# Sprity – trenéři, gymy, odznaky, pozadí (pro systém Trainers/Gyms)

Struktura složek **připravena 2026-09-07** (prázdné, s `.gitkeep`). Konvence = stejná
jako u Pokémonů: **jedna složka na entitu**, cesta se odvozuje z ID (kód nic
neregistruje – jakmile soubor nahraješ, objeví se sám). Chybějící sprite → fallback.
Detail designu viz [BACKLOG.md](BACKLOG.md) sekce „Trenéři, Gymy a vícevrstvý gating".

## ⬜ Gym leadeři (8) — `assets/gym-leaders/<id>/front.png`
Čelní pohled (leader stojí na straně soupeře, vyhodí Poké Ball a zůstane v pozadí).
- [ ] `brock` — Pewter City (Rock) → odznak **Boulder**
- [ ] `misty` — Cerulean City (Water) → odznak **Cascade**
- [ ] `lt-surge` — Vermilion City (Electric) → odznak **Thunder**
- [ ] `erika` — Celadon City (Grass) → odznak **Rainbow**
- [ ] `koga` — Fuchsia City (Poison) → odznak **Soul**
- [ ] `sabrina` — Saffron City (Psychic) → odznak **Marsh**
- [ ] `blaine` — Cinnabar Island (Fire) → odznak **Volcano**
- [ ] `giovanni` — Viridian City (Ground) → odznak **Earth**

## ⬜ Odznaky (8) — `assets/badges/<id>.png` (plochý soubor, cca 64–128 px)
- [ ] `boulder-badge` · `cascade-badge` · `thunder-badge` · `rainbow-badge`
- [ ] `soul-badge` · `marsh-badge` · `volcano-badge` · `earth-badge`

## ⬜ Trenérské třídy (33) — `assets/trainers/<class>/front.png`
Čelní pohled (trenér na straně soupeře). Zatím stačí `front.png` na třídu.
`rival` = speciální gate-mini-boss (blokuje postup). Seznam je **rozšiřitelný** –
až se v `data/trainers.js` (fáze 1) přiřadí konkrétní trenéři na routy, doplní se
chybějící třídy.
- [ ] `bug-catcher` · `youngster` · `lass` · `camper` · `picnicker` · `hiker`
- [ ] `fisherman` · `sailor` · `swimmer-m` · `swimmer-f` · `super-nerd` · `scientist`
- [ ] `engineer` · `gambler` · `rocker` · `biker` · `cue-ball` · `juggler` · `tamer`
- [ ] `bird-keeper` · `black-belt` · `psychic` · `beauty` · `gentleman` · `burglar`
- [ ] `pokemaniac` · `channeler` · `jr-trainer-m` · `jr-trainer-f` · `cooltrainer-m`
- [ ] `cooltrainer-f` · `rocket-grunt` · `rival`

## ⬜ Pozadí soubojů – nová biome — `assets/backgrounds/<biome>-<name>.png`
Existuje jen `grassland` (grass-forest/grass-path/grass-field). Chybí biome pro nové
oblasti Kanta. Stačí 1–3 soubory na biome (náhodně se střídají). **Po dodání zapíšu
biome + soubory do `data/backgrounds.js` a `biome:` k oblastem v `data/areas.js`.**
- [ ] `cave` (Mt. Moon, Rock Tunnel, Victory Road, Cerulean Cave, Diglett's Cave) — např. `cave-stone.png`, `cave-dark.png`
- [ ] `water` (mořské routy, Seafoam) — např. `water-ocean.png`, `water-beach.png`
- [ ] `forest` (Viridian Forest) — např. `forest-deep.png`
- [ ] `mountain` (skalnaté routy 9/10/23) — např. `mountain-ridge.png`
- [ ] `building` (interiéry: Power Plant, Pokémon Tower, Silph, gymy) — např. `building-interior.png`
- [ ] `city` (souboje ve/u měst, volitelné) — např. `city-street.png`

---

# Sprity Pokémonů (Kanto 151)

## ✅ Hotové (15)
#001 Bulbasaur · #002 Ivysaur · #003 Venusaur · #004 Charmander · #005 Charmeleon · #006 Charizard ·
#007 Squirtle · #008 Wartortle · #009 Blastoise · #016 Pidgey · #017 Pidgeotto · #018 Pidgeot ·
#019 Rattata · #020 Raticate · 

## ⬜ Chybí (136)

- [ ] #010 Caterpie — `caterpie`
- [ ] #011 Metapod — `metapod`
- [ ] #012 Butterfree — `butterfree`
- [ ] #013 Weedle — `weedle`
- [ ] #014 Kakuna — `kakuna`
- [ ] #015 Beedrill — `beedrill`
- [ ] #021 Spearow — `spearow`
- [ ] #022 Fearow — `fearow`
- [ ] #023 Ekans — `ekans`
- [ ] #024 Arbok — `arbok`
- [ ] #025 Pikachu — `pikachu`
- [ ] #026 Raichu — `raichu`
- [ ] #027 Sandshrew — `sandshrew`
- [ ] #028 Sandslash — `sandslash`
- [ ] #029 Nidoran♀ — `nidoran-f`
- [ ] #030 Nidorina — `nidorina`
- [ ] #031 Nidoqueen — `nidoqueen`
- [ ] #032 Nidoran♂ — `nidoran-m`
- [ ] #033 Nidorino — `nidorino`
- [ ] #034 Nidoking — `nidoking`
- [ ] #035 Clefairy — `clefairy`
- [ ] #036 Clefable — `clefable`
- [ ] #037 Vulpix — `vulpix`
- [ ] #038 Ninetales — `ninetales`
- [ ] #039 Jigglypuff — `jigglypuff`
- [ ] #040 Wigglytuff — `wigglytuff`
- [ ] #041 Zubat — `zubat`
- [ ] #042 Golbat — `golbat`
- [ ] #043 Oddish — `oddish`
- [ ] #044 Gloom — `gloom`
- [ ] #045 Vileplume — `vileplume`
- [ ] #046 Paras — `paras`
- [ ] #047 Parasect — `parasect`
- [ ] #048 Venonat — `venonat`
- [ ] #049 Venomoth — `venomoth`
- [ ] #050 Diglett — `diglett`
- [ ] #051 Dugtrio — `dugtrio`
- [ ] #052 Meowth — `meowth`
- [ ] #053 Persian — `persian`
- [ ] #054 Psyduck — `psyduck`
- [ ] #055 Golduck — `golduck`
- [ ] #056 Mankey — `mankey`
- [ ] #057 Primeape — `primeape`
- [ ] #058 Growlithe — `growlithe`
- [ ] #059 Arcanine — `arcanine`
- [ ] #060 Poliwag — `poliwag`
- [ ] #061 Poliwhirl — `poliwhirl`
- [ ] #062 Poliwrath — `poliwrath`
- [ ] #063 Abra — `abra`
- [ ] #064 Kadabra — `kadabra`
- [ ] #065 Alakazam — `alakazam`
- [ ] #066 Machop — `machop`
- [ ] #067 Machoke — `machoke`
- [ ] #068 Machamp — `machamp`
- [ ] #069 Bellsprout — `bellsprout`
- [ ] #070 Weepinbell — `weepinbell`
- [ ] #071 Victreebel — `victreebel`
- [ ] #072 Tentacool — `tentacool`
- [ ] #073 Tentacruel — `tentacruel`
- [ ] #074 Geodude — `geodude`
- [ ] #075 Graveler — `graveler`
- [ ] #076 Golem — `golem`
- [ ] #077 Ponyta — `ponyta`
- [ ] #078 Rapidash — `rapidash`
- [ ] #079 Slowpoke — `slowpoke`
- [ ] #080 Slowbro — `slowbro`
- [ ] #081 Magnemite — `magnemite`
- [ ] #082 Magneton — `magneton`
- [ ] #083 Farfetch'd — `farfetchd`
- [ ] #084 Doduo — `doduo`
- [ ] #085 Dodrio — `dodrio`
- [ ] #086 Seel — `seel`
- [ ] #087 Dewgong — `dewgong`
- [ ] #088 Grimer — `grimer`
- [ ] #089 Muk — `muk`
- [ ] #090 Shellder — `shellder`
- [ ] #091 Cloyster — `cloyster`
- [ ] #092 Gastly — `gastly`
- [ ] #093 Haunter — `haunter`
- [ ] #094 Gengar — `gengar`
- [ ] #095 Onix — `onix`
- [ ] #096 Drowzee — `drowzee`
- [ ] #097 Hypno — `hypno`
- [ ] #098 Krabby — `krabby`
- [ ] #099 Kingler — `kingler`
- [ ] #100 Voltorb — `voltorb`
- [ ] #101 Electrode — `electrode`
- [ ] #102 Exeggcute — `exeggcute`
- [ ] #103 Exeggutor — `exeggutor`
- [ ] #104 Cubone — `cubone`
- [ ] #105 Marowak — `marowak`
- [ ] #106 Hitmonlee — `hitmonlee`
- [ ] #107 Hitmonchan — `hitmonchan`
- [ ] #108 Lickitung — `lickitung`
- [ ] #109 Koffing — `koffing`
- [ ] #110 Weezing — `weezing`
- [ ] #111 Rhyhorn — `rhyhorn`
- [ ] #112 Rhydon — `rhydon`
- [ ] #113 Chansey — `chansey`
- [ ] #114 Tangela — `tangela`
- [ ] #115 Kangaskhan — `kangaskhan`
- [ ] #116 Horsea — `horsea`
- [ ] #117 Seadra — `seadra`
- [ ] #118 Goldeen — `goldeen`
- [ ] #119 Seaking — `seaking`
- [ ] #120 Staryu — `staryu`
- [ ] #121 Starmie — `starmie`
- [ ] #122 Mr. Mime — `mr-mime`
- [ ] #123 Scyther — `scyther`
- [ ] #124 Jynx — `jynx`
- [ ] #125 Electabuzz — `electabuzz`
- [ ] #126 Magmar — `magmar`
- [ ] #127 Pinsir — `pinsir`
- [ ] #128 Tauros — `tauros`
- [ ] #129 Magikarp — `magikarp`
- [ ] #130 Gyarados — `gyarados`
- [ ] #131 Lapras — `lapras`
- [ ] #132 Ditto — `ditto`
- [ ] #133 Eevee — `eevee`
- [ ] #134 Vaporeon — `vaporeon`
- [ ] #135 Jolteon — `jolteon`
- [ ] #136 Flareon — `flareon`
- [ ] #137 Porygon — `porygon`
- [ ] #138 Omanyte — `omanyte`
- [ ] #139 Omastar — `omastar`
- [ ] #140 Kabuto — `kabuto`
- [ ] #141 Kabutops — `kabutops`
- [ ] #142 Aerodactyl — `aerodactyl`
- [ ] #143 Snorlax — `snorlax`
- [ ] #144 Articuno — `articuno`
- [ ] #145 Zapdos — `zapdos`
- [ ] #146 Moltres — `moltres`
- [ ] #147 Dratini — `dratini`
- [ ] #148 Dragonair — `dragonair`
- [ ] #149 Dragonite — `dragonite`
- [ ] #150 Mewtwo — `mewtwo`
- [ ] #151 Mew — `mew`

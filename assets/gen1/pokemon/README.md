# assets/gen&lt;N&gt;/pokemon (gen-specifické)

Sprity Pokémonů. **Rozdělené po generacích** – každý druh žije ve složce své
generace: `assets/gen1/pokemon/<id>/` (Kanto #1–151), `assets/gen2/pokemon/<id>/`
(Johto #152–251) atd. Cesta se odvozuje z `species.id` **a** `species.gen`
(helper `pokemonAssetDir` v `src/core/assets.js`). Uvnitř gen složky jsou druhy
vedle sebe, řazené abecedně. Backlog: R-024.

## Konvence pojmenování

- Jedna **složka na druh**, pojmenovaná podle `species.id` (= slug jména,
  `kebab-case`): `bulbasaur/`, `pikachu/`, `mr-mime/`, `farfetchd/` …
  - `id` (slug) používáme místo zobrazovaného jména, protože jméno může mít
    mezery/diakritiku/apostrof (`Mr. Mime`, `Farfetch'd`), a to se v cestách
    chová špatně.
- V každé složce **4 sprity** (přípona `.png`), přesně tyto názvy (kód je
  odvozuje sám):
  - `front.png` – **čelní** pohled (Pokédex, karta Pokémona; později soupeř v souboji)
  - `back.png` – **zadní** pohled (náš Pokémon v souboji – až přijde R-029)
  - `shiny-front.png` – čelní shiny varianta (shiny jedinec v Pokédexu / na kartě)
  - `shiny-back.png` – zadní shiny varianta (shiny jedinec v souboji)
  - Kód shiny varianty automaticky zkusí u shiny jedinců; když chybí, spadne
    zpět na fallback (glyf „?").
- **Volitelná samičí varianta** (přípona `-f`): druhy s odlišným spritem samic
  (např. `rattata` má jinou pózu/ocas zezadu) mohou mít navíc `front-f.png`,
  `back-f.png`, `shiny-front-f.png`, `shiny-back-f.png`. Kód u samice (`gender === "f"`)
  zkusí **nejdřív `-f`** a při chybějícím souboru automaticky spadne na výchozí
  (samčí/bezpohlavní) sprite. Proto stačí přidat `-f` **jen tam, kde se sprit liší** –
  u rattaty se liší jen záda, takže existují jen `back-f.png` a `shiny-back-f.png`.
  Naprostá většina druhů gender rozdíl NEMÁ a `-f` soubory nemá vůbec.
- **Jednotný formát (standard):** čtvercové plátno **256×256**, průhledné pozadí,
  postava zmenšená tak, aby její **delší strana měla 232 px** a byla vycentrovaná.
  Díky tomu jsou všechny postavičky „stejně velké" a renderují se jednotně.
- Pokud má zdroj plné / bílé / šachovnicové pozadí, připraví ho nástroj
  `tools/prep_sprite.py` (viz níže) – odstraní pozadí flood fillem od okrajů,
  ořízne na postavu, zmenší na standard a vycentruje. Ostrost drží
  `image-rendering: pixelated`.

## Jak se odvozuje cesta

Cesta ke spritu se **odvozuje z `species.id` a `species.gen`**
(`assets/gen<gen>/pokemon/<id>/front.png`), takže se nikde nepíše ani neregistruje
per druh – jen se dodrží názvy souborů a druh se založí ve složce správné generace.
Odvození dělá helper `pokemonAssetDir(speciesId)` v `src/core/assets.js`
(gen bere z `species.gen`). Uvnitř generace jsou složky druhů řazené abecedně.

## Jak to napojíme — KÓD JE UŽ HOTOVÝ ✅

Napojení už existuje, chybí jen samotné obrázky. Stačí nahrát PNG do složky
druhu a **objeví se samy, bez zásahu do kódu**:

1. Nahraješ `front.png` (a `back.png`) do složky daného druhu.
2. Helper `src/ui/sprites.js` (`spriteUrl(id, view)` / `spriteImg(id, opts)`) už
   cestu odvozuje a vykresluje `<img>` s fallbackem: dokud sprite chybí, ukáže se
   zástupný glyf „?" (u neviděných druhů silueta přes `silhouetteHtml`); jakmile
   PNG existuje, načte se automaticky a glyf zmizí.
3. UI to už používá: **Pokédex** (`pokedexView.js`) a **karta Pokémona**
   (`pokemonCard.js`). Souboj se sprity je samostatný krok (R-029) – helper na
   `back`/shiny je připravený, jen se ještě nekreslí v bojovém okně.

Shrnutí: **jediný zbývající krok je nahrát obrázky.** Nic víc.

## Nástroj na přípravu spritů (`tools/prep_sprite.py`)

Sjednotí jakýkoli zdrojový obrázek do standardu (odstraní pozadí, ořízne na
postavu, zmenší na 232 px delší stranu, vycentruje na plátno 256×256).

```bash
# jeden soubor (přepíše na místě)
python tools/prep_sprite.py assets/gen1/pokemon/charmander/front.png

# jeden soubor do jiného výstupu
python tools/prep_sprite.py vstup.png vystup.png

# DÁVKA: celá složka rekurzivně, přepis na místě
#   – už hotové sprity (256×256 s průhledností) přeskočí
python tools/prep_sprite.py assets/gen1/pokemon

# přepracovat i už hotové
python tools/prep_sprite.py assets/gen1/pokemon --force
```

Postup po nahrání všech snímků: nahraj obrázky do složek druhů → spusť dávku nad
`assets/gen1/pokemon` (a `assets/gen2/pokemon`) → hotovo (všechny stejně velké, průhledné pozadí).

## Aktuální druhy (viz `data/pokemon.js`)

`bulbasaur`, `charmander`, `squirtle`, `pidgey`, `rattata`, `ditto` – složky už
jsou připravené, stačí do každé nahrát 4 obrázky (`front.png`, `back.png`,
`shiny-front.png`, `shiny-back.png`).

Souvisí s postupem u budov (`assets/gen1/buildings/` a `assets/gen2/buildings/`) a míčků (`assets/pokeballs/` – globální asset).

# Pokémon Cries (Pokřiky)

Složka obsahuje zvukové soubory pokřiků Pokémonů (.mp3) stažené ze serveru Pokémon Showdown.

## Struktura souborů

Každý soubor je pojmenován dle species id z `data/pokemon.js`:
- `bulbasaur.mp3` — pokřik Bulbazaura
- `nidoran-f.mp3` — pokřik Nidorана (samice)
- `mr-mime.mp3` — pokřik Mr. Mime
- atd.

## Stažení

Zvuky jsou staženy skriptem `tools/fetch_cries.ps1`, který je automaticky načítá z veřejného repozitáře Pokémon Showdown.

Spuštění (v kořeni repa):
```
pwsh tools/fetch_cries.ps1
```

## Přehrávání

Cries přehrává systém `src/systems/audioSystem.js` voláním funkce `playCry(speciesId)` během zápasu a animací evoluce.

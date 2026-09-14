# Audio Assets

Tato složka obsahuje zvuky hry (hudba a efekty).

## Struktura

### `bgm/` – Hudba

Soubor:
- `main.mp3` – hlavní BGM (hraje se ve hře, loop)

### `sfx/` – Zvukové efekty

Soubory:
- `hit.mp3` – zvuk zásahu v souboji
- `faint.mp3` – zvuk omdlení Pokémona
- `catch.mp3` – zvuk úspěšného chycení
- `catch-fail.mp3` – zvuk neúspěšného chycení
- `levelup.mp3` – zvuk zvýšení levelu
- `evolve.mp3` – zvuk evoluce
- `hatch.mp3` – zvuk vylíhnutí vejce
- `achievement.mp3` – zvuk odemčení achievement
- `click.mp3` – zvuk kliknutí na tlačítko

## Přidání zvuků

Stažení zvuků lze získat z CC0 zdrojů, např.:
- [Freesound.org](https://freesound.org/) – vždy si ověřte licenci
- [Zapsplat](https://www.zapsplat.com/) – CC0 zvuky
- [OpenGameArt.org](https://opengameart.org/) – herní zvuky

Zvuky by měly být v MP3 formátu, malé velikosti (cca 50–200 KB) a krátké délky (0,1–2 s pro SFX, BGM může být delší).

Umístěte zvukový soubor do příslušné podsložky (`bgm/` nebo `sfx/`) a pojmenujte jej PŘESNĚ podle seznamu výše.

## Tichý fallback

Pokud zvukový soubor chybí nebo se přehrání nezdaří (např. browser blokuje autoplay), hra tiše pokračuje **bez jakýchkoli chyb**. Zvuky si tedy můžete dodělat postupně bez obavy z pádu hry.

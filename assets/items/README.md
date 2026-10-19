# Item icons

Ikonky itemů zobrazené v horní liště (a případně jinde v UI).

**Sem nahraj tyto soubory (PNG, ideálně čtvercové ~32×32 nebo 64×64, průhledné pozadí):**

- `exp-share.png` — ikonka EXP Share (přepínač v horní liště)
- `pokedex.png` — ikonka Pokédexu (položka v horní liště)

Dokud soubor chybí, UI spadne zpět na emoji (🔗 pro EXP Share, 📕 pro Pokédex),
takže hra funguje i bez nahraných spritů. Jakmile soubor přidáš se správným
názvem, ikonka se použije automaticky (stačí refresh).

Názvy souborů se musí přesně shodovat (malá písmena, pomlčky). Cesta v kódu je
`assets/items/<název>.png`.

# assets/gym-leaders/

Sprity 8 gym leaderů. Konvence (stejná jako u Pokémonů): **složka na leadera**,
cesta se odvozuje z ID → `assets/gym-leaders/<id>/front.png`.

- `front.png` = čelní pohled (leader stojí na straně soupeře, vyhodí Poké Ball a
  zůstane v pozadí za svým Pokémonem). **Povinné.**
- Volitelně později: `vs.png` (portrét do „VS" intra).

ID složek (kanonické pořadí):
`brock` · `misty` · `lt-surge` · `erika` · `koga` · `sabrina` · `blaine` · `giovanni`

Chybějící sprite → fallback (silueta/„?"). Kód nic neregistruje, stačí nahrát soubor.

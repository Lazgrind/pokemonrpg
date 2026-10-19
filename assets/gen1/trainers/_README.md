# assets/trainers/

Sprity trenérských **tříd** (route trenéři). Konvence: **složka na třídu**,
cesta se odvozuje z ID → `assets/trainers/<class>/front.png`.

- `front.png` = čelní pohled (trenér na straně soupeře). **Povinné** (zatím stačí jen ono).
- `rival` = speciální gate-mini-boss (blokuje postup dál po routě).

Seznam tříd je **rozšiřitelný** – až se v `data/trainers.js` přiřadí konkrétní
trenéři na routy, doplní se chybějící třídy jako další složky sem.

Chybějící sprite → fallback (silueta/„?"). Kód nic neregistruje, stačí nahrát soubor.

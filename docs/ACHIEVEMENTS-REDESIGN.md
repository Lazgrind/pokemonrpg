# Achievements Redesign — návrh k diskuzi (v2)

> Stav: **NÁVRH v2** (Opus, 2026-09-15). Nic z toho ještě není v kódu. Slouží ke
> společnému projití – projdi, škrtej, přepisuj, dopisuj. Až se shodneme, teprve
> implementuju (každý dokončený bod = jeden release).
>
> **Co je nového ve v2 (po tvém feedbacku + feedbacku druhé AI):**
> - Sada rozšířena na **60 achievementů, každý má reálný důvod existovat** (žádných
>   „udělej něco 10×" variací navíc).
> - Přidané **herně specifické** věci téhle hry: gym puzzly (Vermilion koše, Fuchsia
>   neviditelné zdi, Saffron teleporty), Mew truck, Silph Co., Game Corner (výhra/prohra),
>   trade, fishing, autocatch, idle.
> - Přepsané druhové texty (ostřejší, kratší) + ekonomika + gameplay-blbůstky.
> - **`completionist` zůstává `???` secret** – reveal ve chvíli 59/60 → 60/60 je ten vtip.
> - Sloupec **Track** je teď ověřený proti kódu (viz sekce 4) – vím, co existuje a co
>   musím dodat.

---

## 1. Filozofie

Achievement **není checklist**, ale malý **inside joke** hry. Vodítka místo zadání.

- **Všechno je „secret":** dokud není odemčeno, hráč vidí `???` a jen **kryptickou vtipnou
  nápovědu**, ze které si musí podmínku **domyslet** (ne „Catch 10 Magikarpů", ale
  „You looked at it. You still bought it.").
- **Ladíme na idle, ne na clicker.** Tahle hra není klikačka – žádné „Click 1000×".
  Místo toho roastujeme to, co idle hráč reálně dělá: **AFK, plný auto-boj, hromadné
  zabíjení divokých Pokémonů, hoarding v PC, autocatch.**
- **Využíváme UNIKÁTNÍ featury téhle hry** – gym puzzly, Mew truck, Silph Co., Game
  Corner, trade domy, fishing, autocatch, box. To ostatní klony nemají → achievement za
  ně má „skutečný důvod existovat".
- **Humor:** self-aware, občas lehce „toxický" roast hráče, absurdní popisy, narážky
  na to, že hraješ idle hru místo života. 😄

### Tiery (obtížnost / vzácnost)
| Tier | Význam | Počet |
|------|--------|:---:|
| 🟢 **Common** | Odhalí se přirozeně při hraní | 15 |
| 🟡 **Secret** | Musíš zkusit/znát mechaniku (hodně idle roastů) | 15 |
| 🔴 **Rare** | Konkrétní druh / RNG / grind / herní event | 23 |
| 🟣 **Insane** | „Tohle mělo vůbec existovat?" | 7 |
| | **Celkem** | **60** |

---

## 2. Změny CHOVÁNÍ (nezávislé na obsahu)

Tři věci, co jsi chtěl – všechny jsou malé a technicky čisté:

### 2.1 Vlastní tab v horní liště
- Přidat `{ id: "achievements", label: "🏅 Achievements" }` do `ALL_TABS`
  (`src/ui/mainPanel.js`), novou `renderAchievementsTab()` a dispatch.
- **Odebrat** sekci achievementů z Profilu (`renderAchievementsSection`
  v `src/ui/profileView.js:50–78` + volání na ř. 166).
- V tabu: mřížka karet, nahoře počítadlo `X / Y` (kolik odemčeno). Locked karta =
  `❓` ikona + název `???` + kryptická nápověda. Unlocked = pravá ikona + pravý název +
  nápověda (teď dává smysl) + odměna + datum. **Filtr/řazení** (All / Unlocked / Locked).

### 2.2 Popup se nezavírá sám
- V `src/ui/achievementToast.js` **odstranit 4 s auto-dismiss** (ř. ~79–82).
  Křížek už tam je (ř. 70–76) – zůstane jediná cesta zavření.
- Když se odemkne víc naráz, **stohovat** (už se stohují) – každý zvlášť zavřít křížkem.
- Toast je **velký reveal moment**: ukáže pravý název (do té doby `???`).
  Zvážit malý „✨ Achievement unlocked!" jingle (SFX už systém má).

### 2.3 Tutoriál je od achievementů ODDĚLENÝ
Nic z tutoriálu se nesmí počítat ani odemknout.
- Guard v `evaluateAchievements()` **i v handlerech, co zvyšují countery**
  (catches/hatches/evolves/…): na začátku `if (isTutorialActive()) return;`.
- `isTutorialActive()` = `state.tutorialDemoActive === true || !state.story?.tutorialDone`.
  > ⚠️ Rozhodnutí pro tebe: blokovat **jen během demo-souboje** (`tutorialDemoActive`),
  > nebo **do úplného dokončení tutoriálu** (`!tutorialDone`)? Druhé je bezpečnější
  > (nic z onboardingu se nepočítá). **Doporučuju blokovat do `tutorialDone`.**

---

## 3. Sada 60 achievementů

Legenda sloupce **Track:**
✅ = jde hned z dnešních dat / existujícího flagu · 🔧 = potřebuje nový counter/flag (viz sekce 4).

### 🟢 Common — přirozený postup (15)
| id | Název (po odemčení) | Kryptická nápověda | Ikona | Track |
|----|--------------------|--------------------|:-----:|:-----:|
| `first-catch` | And So It Begins | You threw a ball at it. It worked. This is your life now. | 🎯 | ✅ |
| `first-faint` | Have You Tried Winning? | Just a thought. | 🏳️ | ✅ |
| `dex-10` | I Recognize Some Of These | You're starting to put faces to the names. Concerning. | 📖 | ✅ |
| `dex-50` | This Is Getting Out Of Hand | There were supposed to be 151 of them. Who approved this? | 📚 | ✅ |
| `dex-100` | HR Has Questions | You've been collecting employees without ever hiring them. | 🗂️ | ✅ |
| `dex-151` | Professor Oak Is Blocking Your Number | Please stop sending him updates. | 🏆 | ✅ |
| `first-evolve` | Oh God It's Bigger | Nobody warned you. | 🔄 | ✅ |
| `first-shiny` | Someone Left The Settings On | That's not supposed to sparkle like that. | ✨ | ✅ |
| `level-50` | Numbers Go Brrr | We stopped asking what they mean. | 📈 | ✅ |
| `level-100` | You Have Been Here Too Long | The grass outside is still rendered. | 🌱 | ✅ |
| `first-badge` | Participation Trophy | You fought one adult with a job. Congratulations. | 🥉 | ✅ |
| `four-badges` | Local Hero | Three more and the paperwork gets complicated. | 🏅 | ✅ |
| `all-badges` | Unemployed Gym Leader | You have officially run out of people to bother. | 🎖️ | ✅ |
| `champion` | Who Let You In? | Nobody checked your credentials. | 👑 | ✅ |
| `first-hatch` | It's Coming From The Egg | We probably should have seen this coming. | 🥚 | ✅ |

### 🟡 Secret — mechaniky + idle roasty (15)
| id | Název | Kryptická nápověda | Ikona | Track |
|----|-------|--------------------|:-----:|:-----:|
| `gold-100k` | Nobody Ask Where This Came From | You are ten. You have six figures. We move on. | 💰 | ✅ |
| `rich-1m` | Money™ | At this point, you're just making the number bigger for fun. | 🤑 | ✅ |
| `evolve-20` | The Circle Of Life | Small creature goes in. Larger creature comes out. Nobody asks questions. | 🧬 | ✅ |
| `hatch-10` | Please Stop Producing Eggs | The daycare would like to discuss your lifestyle choices. | 🐣 | ✅ |
| `full-team` | We Have Six At Home | And somehow none of them know what they're doing. | 6️⃣ | ✅ |
| `box-full` | Pokémon Storage & Rescue Services | Mostly storage. | 📦 | ✅ |
| `autocatch` | I'm Not Touching That | That's what employees are for. | 🤖 | 🔧 |
| `full-auto-idle` | Management Material | Arrived. Did nothing. Got promoted. | 😴 | 🔧 |
| `trade` | Definitely A Legit Trader | His username contained the word "legit." Twice. | 🤝 | ✅ |
| `fishing` | Fishing Was A Mistake | But you already bought the rod. | 🎣 | 🔧 |
| `game-corner-first` | This Is A Terrible Idea | Anyway, here's some coins. | 🎰 | 🔧 |
| `afk-1h` | He Went To Get Milk | It's been an hour. | 🪑 | 🔧 |
| `play-24h` | I Can Explain | No, actually, I can't. | ⏰ | 🔧 |
| `release-50` | We're Downsizing | Don't worry about the severance package. | 📋 | 🔧 |
| `faints-100` | Call PETA | At this point, somebody should probably intervene. | 💀 | 🔧 |

### 🔴 Rare — druh / RNG / grind / herní event (23)
> Druhové achievementy jedou z nového **`caughtSpecies` setu** (viz 4) – ať platí i po
> vyvinutí (living dex). Jeden hook na `POKEMON_CAUGHT`.

**Herně specifické (unikátní featury této hry):**
| id | Název | Kryptická nápověda | Ikona | Track |
|----|-------|--------------------|:-----:|:-----:|
| `trash-can-coin` | The First Rule Of Trash Club | We do not talk about the second switch. | 🗑️ | ✅ |
| `fuchsia-maze` | Trust Issues | The walls aren't even visible. And you still don't trust them. | 🧱 | ✅ |
| `saffron-teleporter` | I Meant To Do That | The first time. | 🌀 | ✅ |
| `silph-co` | This Meeting Could Have Been An Email | Unfortunately, there were Rockets involved. | 🏢 | ✅ |
| `mew` | What Truck? | There is no truck. Stop asking about the truck. | 🚚 | ✅ |
| `game-corner-777` | I Knew It Wasn't Rigged | The casino has officially decided that you're cool. | 7️⃣ | 🔧 |
| `game-corner-loss` | The House Always Wins | Except when it doesn't. Please don't focus on that. | 📉 | 🔧 |

**Druhové (roast konkrétních Pokémonů):**
| id | Název | Kryptická nápověda | Ikona | Track |
|----|-------|--------------------|:-----:|:-----:|
| `magikarp` | I Paid Money For This | You saw it. You knew what it was. You bought it anyway. | 🐟 | 🔧 |
| `gyarados` | Refund Denied | The fish has evolved. Your financial mistake has not. | 🐉 | 🔧 |
| `metapod` | Peak Pokémon | Nothing happened. And somehow you enjoyed it. | 🐛 | 🔧 |
| `zubat` | Oh, Come On | You knew exactly who was going to be here. | 🦇 | 🔧 |
| `psyduck` | Thoughts And Prayers | Mostly prayers. | 🦆 | 🔧 |
| `slowpoke` | Please Stand By | The Pokémon is currently loading. | 🦥 | 🔧 |
| `ditto` | That's Not My Pokémon | It is now. | 🫠 | 🔧 |
| `pikachu` | Now Legally Merchandise | You didn't catch a Pokémon. You caught an intellectual property. | ⚡ | 🔧 |
| `eevee` | This Is A Personality Test | Choose carefully. We will judge you. | 🦊 | 🔧 |
| `all-eeveelutions` | Commitment Is Optional | Why have one identity when you can have all of them? | 🔮 | ✅ |
| `three-starters` | Mom Said It's My Turn | You took all three. | 🌿 | ✅ |
| `hitmons` | Violence Solves Everything | Apparently, punching and kicking were both acceptable solutions. | 🥊 | ✅ |
| `legendary` | That Was Legendary | Mostly because you threw a ball at it and somehow won. | ⭐ | ✅ |
| `all-legendaries` | I Know A Guy | You keep meeting increasingly unreasonable wildlife. | 🌟 | ✅ |
| `shiny-5` | Statistics Has Left The Chat | This is becoming difficult to explain. | ✨ | ✅ |
| `shiny-10` | Okay, Seriously | How many times can lightning strike the same person? | 👁️ | ✅ |

### 🟣 Insane — „tohle mělo existovat?" (7)
| id | Název | Kryptická nápověda | Ikona | Track |
|----|-------|--------------------|:-----:|:-----:|
| `six-level-100` | This Is Why You Have No Friends | Six Pokémon. All level 100. We know what you did instead of going outside. | 💪 | ✅ |
| `same-species-100` | There Are Other Pokémon | Just so you know. | ♻️ | 🔧 |
| `miss-100` | It's Right There | The Pokémon is literally standing still. | 🕳️ | 🔧 |
| `miss-1000` | Stormtrooper Training Complete | Your aim has achieved something previously thought impossible. | 🎯 | 🔧 |
| `afk-24h` | Employee Of The Century | You haven't done anything since yesterday. Management is impressed. | 🛌 | 🔧 |
| `play-100h` | We Sent Someone To Check On You | They can see the glow of the monitor from the street. | 🚪 | 🔧 |
| `completionist` | You Could Have Played Anything | There are thousands of games on Steam. | 🫡 | ✅ |

> **`completionist`** = odemkne se za **všech 59 ostatních**. **Zůstává `???` secret**
> jako všechno ostatní – celý vtip je v tom reveal momentu, když ti na 59/60 → 60/60
> najednou vyskočí „You Could Have Played Anything". Meta-check (unlocked count = all−1).

---

## 4. Co je potřeba dodat do kódu (ověřeno proti kódu)

### 4a. Už EXISTUJE — stačí navěsit posluchač/čtení (✅)
| Achievement(y) | Zdroj pravdy | Kde |
|----------------|--------------|-----|
| `trash-can-coin` | `state.story.vermilionGymSwitches` | `gymChallengeView.js` `succeed()` |
| `fuchsia-maze` | `state.story.fuchsiaGymWalls` | dtto |
| `saffron-teleporter` | `state.story.saffronGymIntro` | dtto |
| `silph-co` | `state.story.silphCleared` | `battleSystem.js:~2807` (gauntlet `silph-co`) |
| `mew` | `ownsSpecies("mew")` | `POKEMON_CAUGHT` listener |
| `trade` | story flagy `mrMimeGift` / `jynxGift` / `farfetchdGift` | `tradePokemon()` |
| `first-faint` | `BATTLE_FAINT` event, payload `{ side:"player" }` | `battleSystem.js:1953/2018` |
| `six-level-100`, `box-full`, `full-team` | filtr nad `collection` | – |
| `all-eeveelutions`/`three-starters`/`hitmons`/`legendary`/`all-legendaries` | druhy v `collection`/`caughtSpecies` | – |
| `shiny-5`/`shiny-10` | shiny filtr | – |
| `completionist` | unlocked count = all−1 | – |

> Pozn.: gym puzzly a Silph nastavují **perzistentní** flagy v `state.story` + `commit()`
> → dají se číst kdykoli i navěsit na moment, kdy `succeed()`/gauntlet flag padne.

### 4b. NUTNO DODAT nový counter/flag (🔧)
Vše ideálně jako pole ve `state.achievements.stats` (už tam žije `catches/hatches/evolves`),
plněné na existujících bus eventech / hook pointech. **Save migrace** = doplnit chybějící
countery na 0 / prázdné (bump save verze).

| Nový counter/flag | Achievement | Hook point (ověřeno) |
|-------------------|-------------|----------------------|
| `caughtSpecies` (Set „ever caught") + `speciesCatchCounts {id:n}` | všechny druhové + `same-species-100` | `POKEMON_CAUGHT` |
| `faints` (omdlelí nepřátelé) | `faints-100`, `Local Menace` | `BATTLE_FAINT` s `side==="enemy"` |
| `releases` | `release-50` | `releasePokemon()` (`team.js:222`) |
| `catchFails` | `miss-100`, `miss-1000` | `doCatch` (`battleSystem.js`) |
| `trades` (nebo počet `*Gift` flagů) | `trade` už jde z flagů; counter jen pokud chceme „X trades" | `tradePokemon()` |
| `gameCornerStats { spins, jackpots, losses }` | `game-corner-first/777/loss` | slot spin handler `storyBuildingView.js:~1216` |
| `fishingCatches` | `fishing` | catch handler + `battle.fishing` (`battleSystem.js`) |
| `usedAutocatch` (flag) | `autocatch` | autocatch blok v `battleSystem.js` |
| `fullAutoIdle` (flag) | `full-auto-idle` | full-auto + AFK/offline návrat |
| `idleSeconds` (AFK součet) | `afk-1h`, `afk-24h` | `src/systems/idle.js` |
| `playSeconds` (aktivní čas) | `play-24h`, `play-100h` | herní tick (+1/s když aktivní) |

> Druhové achievementy čtu radši z **`caughtSpecies`** než z aktuální `collection`,
> protože kolekce drží 1 ks/druh a po vyvinutí pre-evo zmizí – jinak by „own Metapod"
> spadlo hned po evoluci na Butterfree.

---

## 5. Odměny (návrh pravidla, ne přesná čísla)

Držet dnešní styl (`{gold?, coins?, items?}`), škálovat podle tieru:
- 🟢 Common: 200–5 000 gold (velké milníky víc), sem tam 1× rare-candy.
- 🟡 Secret: 20–40 coins nebo rare-candy ×1–2.
- 🔴 Rare: coins 30–60 / rare-candy 2–3 / drobný item.
- 🟣 Insane: nejlepší – coins 100+, případně kosmetika/„flex" (viz níže).
- `completionist`: symbolická špička (coins + třeba Master Ball).

> Otázka: chceš u „insane" i **nefunkční flex odměnu** (titul/odznak v profilu)?
> Nemusí dávat gold – hodnota je v tom to mít.

---

## 6. Co se ve v2 ZMĚNILO oproti v1 a původním 60 nápadům

- **Přidané herně specifické** (dřív jsem je vynechal, protože jsem neměl ověřené flagy –
  teď ověřeno, že existují nebo se snadno dodělají): `trash-can-coin`, `fuchsia-maze`,
  `saffron-teleporter`, `silph-co`, `mew` (OSHA), `game-corner-777`, `game-corner-loss`,
  `game-corner-first`, `fishing`, `trade`, `autocatch`, `first-faint`.
- **Přepsané druhové texty** dle tvého feedbacku (kratší, ostřejší): magikarp/gyarados/
  metapod/zubat/psyduck/slowpoke/ditto/pikachu.
- **Ekonomika** přepsaná: `gold-100k` = „Financially Stable / For approximately three
  minutes.", `rich-1m` = „Money Can't Buy Happiness / …an alarming amount of Poké Balls."
- **Gameplay-blbůstky**: `first-faint`, `faints-100` (Local Menace), `miss-100`
  (Professional Butterfingers), `miss-1000` (Ballistic Expert).
- **Idle set**: `afk-1h`, `afk-24h`, `play-24h`, `play-100h`.
- **`completionist`** už NENÍ jediný ne-secret – zůstává `???` až do odemčení; finální text
  je absurdnější: „You Could Have Played Anything / There are thousands of games on Steam."
- **Všechny `click-*`** (Finger Training, Carpal Tunnel…) → pryč, není to klikačka.
- Užší „nejsilnější" druhová sada (žádný druhý Pokédex).

---

## 7. Otevřené otázky (než začnu kódit)

1. **Tutoriál guard:** blokovat jen demo-souboj, nebo do `tutorialDone`? (dop. `tutorialDone`)
2. **Locked ikona:** skrýt na `❓`, nebo nechat pravou ikonu i u zamčených? (dop. skrýt = větší „aha")
3. **Rozsah / rozsekání na release:** doporučuju rozseknout na víc releasů, každý ověřitelný:
   - **v1.5.0** – jen chování: přesun do vlastního tabu + toast bez auto-dismiss + tutoriál
     guard + přejmenování stávajících 16 na `???` secret režim.
   - **v1.6.0** – nové countery (4b) + save migrace.
   - **v1.7.0** – celá nová sada 60 (data/achievements.js) + herně specifické hooky.
   - (Nebo jinak rozdělit – řekni, jak chceš.)
4. **`same-species-100`** – 100 kusů jednoho druhu je hodně grind; nechat na 100, nebo míň?
5. **Flex odměny** u insane (titul/odznak bez goldu) – chceš?

---

*Až tohle projdeš a doplníš/škrtneš, přepíšu finální verzi do `data/achievements.js`
+ dodělám countery, tab a toast dle dohodnutého rozsahu.*

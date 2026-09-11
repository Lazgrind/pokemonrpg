/**
 * UI: záložka Gym (samostatný tab v hlavním panelu). Ukáže se JEN když je hráč
 * ve městě s gymem (data/gyms.js → getGymForCity). Gym = sekvence trenérů;
 * odemčený je vždy jen další neporažený (striktní pořadí). Poražením posledního
 * (leadera) padne odznak.
 *
 * Souboj se spouští přes battleSystem.startTrainerBattle(trainerId, {gymId}) a
 * hráč se přepne na záložku Battle (openMainTab). Chytání je vypnuté a gym
 * souboje jsou POVINNĚ manuální (auto zakázáno – řeší engine přes forceManual).
 */

import { getGymForCity, gymTrainers, isGymOpen } from "../../data/gyms.js";
import { trainerSpriteUrl } from "../../data/trainers.js";
import { getBadge } from "../../data/badges.js";
import { getState, commit } from "../core/state.js";
import { startTrainerBattle, getActiveArea } from "../systems/battleSystem.js";
import { openMainTab } from "./mainPanel.js";
import { showPopup } from "./popup.js";
import { hasGymChallenge, isGymChallengeDone, startGymChallenge } from "./gymChallengeView.js";
import { saveScroll, restoreScroll } from "./scrollPreserve.js";

/**
 * Text „zamčené brány" gymu, dokud není splněný gym.requiresStory flag. Per-gym,
 * ať každé město má věrný důvod (Vermilion = strom + Cut, Cinnabar = zamčené
 * dveře + Secret Key z Mansionu). Neuvedené gymy dostanou obecný fallback.
 */
const GYM_GATES = {
  "vermilion-gym": {
    icon: "🌳",
    body: `<p class="story-text">A thick, leafy tree blocks the Gym's entrance.</p>
      <p class="placeholder">You'll need <strong>HM Cut</strong> to clear it. Board the <strong>S.S. Anne</strong> in the City tab and help out to earn it.</p>`,
  },
  "cinnabar-gym": {
    icon: "🔒",
    body: `<p class="story-text">The Gym's door is firmly locked — there's a keyhole where the handle should be.</p>
      <p class="placeholder">You'll need the <strong>Secret Key</strong>. Search the burnt-out <strong>Pokémon Mansion</strong> in the City tab to find it.</p>`,
  },
  "saffron-gym": {
    icon: "🚧",
    body: `<p class="story-text">Team Rocket grunts loiter outside the Gym. "Beat it, kid — this whole city belongs to Team Rocket now. The Leader ain't seeing anyone."</p>
      <p class="placeholder">Drive Team Rocket out of <strong>Silph Co.</strong> first (City tab → Silph Co.). Once the company is free, Sabrina's Gym will reopen.</p>`,
  },
};

/** Vykreslí obsah záložky Gym do zadaného elementu. */
export function renderGymTab(root, onStatus = () => {}) {
  const cityId = getActiveArea()?.id ?? null;
  const gym = getGymForCity(cityId);
  if (!gym) {
    const _savedScroll = saveScroll(root);
    root.innerHTML = `<h2 class="panel-title">Gym</h2><p class="placeholder">There's no Gym here.</p>`;
    restoreScroll(root, _savedScroll);
    return;
  }
  // Zavřený gym (např. Viridian bez 7 odznaků) – tab se zobrazí, ale místo
  // souboje jen cedule + průběh sběru odznaků (gatekeeping).
  const ownedBadges = getState().progress?.badges ?? [];
  if (!isGymOpen(gym, ownedBadges)) {
    const need = gym.requiresBadges ?? 0;
    const have = ownedBadges.filter((b) => b !== gym.badge).length;
    const _savedScroll = saveScroll(root);
    root.innerHTML = `<h2 class="panel-title">🔒 ${gym.name}</h2>
      <p class="story-text">The Gym's doors are firmly shut.</p>
      <p class="placeholder">A notice reads: "The Leader is away. Return once you've proven yourself across Kanto — earn the other ${need} Gym Badges first."</p>
      <p class="placeholder">Badges earned: ${have} / ${need}</p>`;
    restoreScroll(root, _savedScroll);
    return;
  }

  const defeated = getState().progress?.defeatedTrainers ?? [];
  const trainers = gymTrainers(gym);
  // Index dalšího neporaženého trenéra (odemčený). -1 = celý gym hotový.
  const nextIdx = trainers.findIndex((t) => !defeated.includes(t.id));
  const cleared = nextIdx === -1;
  // Gym challenge (interaktivní minihra PŘED souboji, viz gymChallengeView.js).
  // Blokuje trenéry, dokud ji hráč nevyřeší. Starým savům (rozehraný/hotový gym)
  // ji nevnucujeme (guard `started`/`cleared`).
  const started = trainers.some((t) => defeated.includes(t.id));
  const challengePending =
    hasGymChallenge(gym.id) && !cleared && !started && !isGymChallengeDone(gym.id);

  // Story-gate (např. Vermilion: vchod blokuje strom, potřebuješ HM Cut). Blokuje
  // JEN dokud gym není vyčištěný – staré savy s poraženým gymem se nezamknou.
  // Text brány je per-gym (podle requiresStory flagu / města), s obecným fallbackem.
  if (gym.requiresStory && !cleared && !getState().story?.[gym.requiresStory]) {
    const gate = GYM_GATES[gym.id] ?? {
      icon: "🔒",
      body: `<p class="story-text">The Gym's entrance is blocked.</p>
        <p class="placeholder">You'll need to advance the story before you can challenge this Leader.</p>`,
    };
    const _savedScroll = saveScroll(root);
    root.innerHTML = `<h2 class="panel-title">${gate.icon} ${gym.name}</h2>${gate.body}`;
    restoreScroll(root, _savedScroll);
    return;
  }
  const badge = getBadge(gym.badge);

  // Věrný Kanto: Vermilion (koše), Fuchsia (bludiště neviditelných zdí) i Saffron
  // (teleportační dlaždice) řeší kanonickou hádanku jako interaktivní minihru
  // (gymChallengeView.js), viz `challengePending` výše – NE už jako flavour popup.
  // Věrný Kanto (Krok 9): Blaine tě před soubojem prožene svým kvízem. Jednorázově
  // (guard flag cinnabarGymQuiz), pak řetěz otázek → finále → souboj.
  if (gym.id === "cinnabar-gym" && !cleared) {
    const st = getState();
    if (!st.story) st.story = {};
    if (!st.story.cinnabarGymQuiz) {
      st.story.cinnabarGymQuiz = true;
      startBlaineQuiz();
    }
  }
  // Věrný Kanto (Krok 10): Viridian Gym byl celou hru zavřený. Když se konečně
  // otevře (8. odznak), jednorázový flavour popup naznačí tajemného Leadera –
  // teprve po jeho poražení se odhalí jako Giovanni (viz finishTrainerBattle).
  if (gym.id === "viridian-gym" && !cleared) {
    const st = getState();
    if (!st.story) st.story = {};
    if (!st.story.viridianGymIntro) {
      st.story.viridianGymIntro = true;
      showPopup({
        title: "🌍 The Viridian Gym",
        body: `<p class="story-text">The Gym that was locked when your journey began finally stands open. The air inside is cold and still.</p>
          <p class="story-text">A powerful figure waits in the shadows at the far end — the mysterious Leader who has eluded challengers all this time. Something about him feels dangerously familiar...</p>
          <p class="placeholder">This is the eighth and final Kanto badge. Bring your very best — his Ground-types hit brutally hard.</p>`,
        okLabel: "Face him",
        onOk: () => commit(),
      });
    }
  }

  const _savedScroll = saveScroll(root);
  const rows = trainers
    .map((t, i) => {
      const isDefeated = defeated.includes(t.id);
      const isNext = i === nextIdx;
      const isLeader = t.kind === "gym-leader";
      const maxLv = Math.max(...t.team.map((m) => m.level ?? 1));
      const teamInfo = `${t.team.length} Pokémon · up to Lv ${maxLv}`;

      let statusHtml;
      if (isDefeated) {
        statusHtml = `<span class="gym-status done">✓ Defeated</span>`;
      } else if (isNext && challengePending) {
        statusHtml = `<span class="gym-status locked">🔒 Solve the Gym Challenge first</span>`;
      } else if (isNext) {
        statusHtml = `<button class="btn btn-sm gym-fight" data-trainer="${t.id}" data-gym="${gym.id}">${isLeader ? "Challenge ⚔" : "Fight ⚔"}</button>`;
      } else {
        statusHtml = `<span class="gym-status locked">🔒 Beat the previous challenger</span>`;
      }

      return `
        <li class="gym-trainer ${isLeader ? "is-leader" : ""} ${isDefeated ? "is-done" : isNext ? "is-next" : "is-locked"}">
          <img class="gym-trainer-sprite" src="${trainerSpriteUrl({ id: t.id, class: t.class, kind: t.kind })}" alt="${t.name}" onerror="this.style.visibility='hidden'">
          <span class="gym-trainer-info">
            <span class="gym-trainer-name">${isLeader ? "👑 " : ""}${t.name}</span>
            <span class="placeholder gym-trainer-team">${teamInfo}</span>
          </span>
          ${statusHtml}
        </li>`;
    })
    .join("");

  const badgeName = badge?.name ?? gym.badge;
  const badgeState = cleared
    ? `<span class="gym-badge-won"><img class="badge-icon" src="assets/badges/${gym.badge}.png" alt="${badgeName}" onerror="this.style.display='none'"> ${badgeName} earned!</span>`
    : `<span class="placeholder">Beat the Leader to earn the ${badgeName}.</span>`;

  // Karta gym challenge (jen dokud není hádanka splněná) – tlačítko spustí minihru.
  const challengeHtml = challengePending
    ? `<div class="gym-challenge-card">
        <span class="gym-challenge-label">🧩 Gym Challenge — required</span>
        <p class="placeholder">You must solve this Gym's puzzle before you can battle any trainer or the Leader.</p>
        <button class="btn btn-sm gym-challenge-start" data-gym="${gym.id}">Start Challenge</button>
      </div>`
    : "";

  root.innerHTML = `
    <section class="gym-section type-${gym.type}">
      <h2 class="panel-title">🏟️ ${gym.name} <span class="placeholder">· ${gym.type}</span></h2>
      <p class="placeholder">Gym battles are manual only — Auto battle is disabled here.</p>
      <div class="gym-badge-row">${badgeState}</div>
      ${challengeHtml}
      <ul class="gym-trainer-list">${rows}</ul>
    </section>`;
  restoreScroll(root, _savedScroll);

  root.querySelector(".gym-challenge-start")?.addEventListener("click", () =>
    startGymChallenge(gym.id, { onComplete: () => renderGymTab(root, onStatus) })
  );

  root.querySelectorAll(".gym-fight").forEach((btn) =>
    btn.addEventListener("click", () => {
      const res = startTrainerBattle(btn.dataset.trainer, { gymId: btn.dataset.gym });
      if (!res.ok) {
        onStatus(res.reason ?? "Can't start the battle.");
        return;
      }
      openMainTab("battle");
    })
  );
}

/**
 * Blaineův kvíz (Krok 9) – řetěz otázek přes popup.choices. Kánonické pravda/nepravda
 * otázky; skóre je jen pro chuť (souboj se odemkne tak jako tak). Flag proti re-fire
 * nastavuje volající; commit (uložení) proběhne až v onOk finálního okna.
 */
function startBlaineQuiz() {
  const questions = [
    { text: "Caterpie evolves into Butterfree?", answer: true },
    { text: "There are 9 certified Pokémon League Badges?", answer: false },
    { text: "Poliwag evolves three times?", answer: true },
  ];
  let score = 0;

  const ask = (i) => {
    if (i >= questions.length) {
      showPopup({
        title: "🔥 Blaine's Gym",
        body: `<p class="story-text">Blaine roars with laughter. "Hah! You got <strong>${score}/${questions.length}</strong> right!"</p>
          <p class="story-text">"But the real question burns hotter than any quiz — can you stand the heat of my fire Pokémon? Come on!"</p>
          <p class="placeholder">Fire-types are weak to Water, Ground and Rock. His Arcanine hits hard.</p>`,
        okLabel: "Light it up!",
        onOk: () => commit(),
      });
      return;
    }
    const q = questions[i];
    showPopup({
      title: `🔥 Blaine's Quiz — ${i + 1}/${questions.length}`,
      body: `<p class="story-text">Blaine stands by a locked quiz door. "I'm Blaine, the red-hot quizmaster! Answer me this, hotshot!"</p>
        <p class="story-text"><strong>${q.text}</strong></p>`,
      dismissible: false,
      choices: [
        { label: "YES", onPick: () => { if (q.answer === true) score++; ask(i + 1); } },
        { label: "NO", onPick: () => { if (q.answer === false) score++; ask(i + 1); } },
      ],
    });
  };

  ask(0);
}

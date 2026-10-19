/**
 * achievementToast.js – NEblokující toast oznámení odemčených achievementů.
 *
 * Toast se zobrazí v rohu se jménem, kryptickou hláškou, reálnou podmínkou a odměnou.
 * Nezavírá se sám – jen křížkem (reveal moment, hráč si čte v klidu).
 */

/**
 * Formátuje odměnu na čitelný text ("+200 Gold", "+30 Coins" apod.).
 * @param {any} reward
 * @returns {string}
 */
function formatReward(reward) {
  if (!reward) return "";
  const parts = [];
  if (reward.gold) parts.push(`+${reward.gold} Gold`);
  if (reward.coins) parts.push(`+${reward.coins} Coins`);
  if (reward.items) {
    for (const [itemId, qty] of Object.entries(reward.items)) {
      const itemName = itemId
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      parts.push(`+${qty}× ${itemName}`);
    }
  }
  return parts.join(", ");
}

/**
 * Zobrazí toast s odemčeným achievementem.
 * @param {{ id, name, hint, condition, reward }} achievement
 */
export function showAchievementToast(achievement) {
  // Vytvoř container pro toasty, pokud neexistuje
  let container = document.getElementById("achv-toasts");
  if (!container) {
    container = document.createElement("div");
    container.id = "achv-toasts";
    document.body.appendChild(container);
  }

  // Vytvoř toast element
  const toast = document.createElement("div");
  toast.className = "achv-toast";

  const rewardText = formatReward(achievement.reward);

  toast.innerHTML = `
    <div class="achv-toast-content">
      <div class="achv-toast-text">
        <div class="achv-toast-label">Achievement unlocked!</div>
        <div class="achv-toast-name">${achievement.name}</div>
        <div class="achv-toast-desc">${achievement.hint ?? ""}</div>
        ${achievement.condition ? `<div class="achv-toast-condition">Unlocked for: ${achievement.condition}</div>` : ""}
        ${rewardText ? `<div class="achv-toast-reward">${rewardText}</div>` : ""}
      </div>
      <div class="achv-toast-close">&times;</div>
    </div>
  `;

  container.appendChild(toast);

  // Trigger animace (fade-in)
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // Close button
  const closeBtn = toast.querySelector(".achv-toast-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    });
  }

  // Žádné automatické zmizení – toast je „reveal moment", zavírá se jen křížkem,
  // aby si hráč mohl v klidu přečíst název i reálnou podmínku.
}

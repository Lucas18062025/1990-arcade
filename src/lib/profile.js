// ═══════════════════════════════════════════════
// 1990 ARCADE — Perfil, Logros & Desafíos Diarios
// ═══════════════════════════════════════════════

export const ACHIEVEMENTS = [
  {
    id: "FIRST_RUN",
    title: "Primer Contacto",
    desc: "Completá tu primera partida en cualquier juego del arcade.",
    icon: "🎮",
    xp: 50,
  },
  {
    id: "DEDICATED_10",
    title: "Habitual del Salón",
    desc: "Jugá 10 partidas en el salón arcade.",
    icon: "🕹️",
    xp: 150,
  },
  {
    id: "HIGH_ROLLER_1K",
    title: "Millar Sagrado",
    desc: "Alcanzá 1.000 puntos en cualquier juego.",
    icon: "💎",
    xp: 200,
  },
  {
    id: "SNAKE_MASTER",
    title: "Encantador de Serpientes",
    desc: "Alcanzá 100 puntos en Snake.",
    icon: "🐍",
    xp: 150,
  },
  {
    id: "PAC_HERO",
    title: "Fantasmas a la Carrera",
    desc: "Alcanzá 1.000 puntos en Pac-Man.",
    icon: "🟡",
    xp: 150,
  },
  {
    id: "SPACE_DEFENDER",
    title: "Guardián Galáctico",
    desc: "Alcanzá 500 puntos en Invaders.",
    icon: "👾",
    xp: 150,
  },
  {
    id: "LINE_CLEARER",
    title: "Línea Perfecta",
    desc: "Alcanzá 1.000 puntos en Tetris.",
    icon: "🧱",
    xp: 150,
  },
  {
    id: "BRICK_BREAKER",
    title: "Demoledor Neón",
    desc: "Alcanzá 250 puntos en Breakout.",
    icon: "🔨",
    xp: 150,
  },
  {
    id: "ALL_ROUNDER",
    title: "Maestro Multijuego",
    desc: "Jugá al menos una partida de cada uno de los 5 juegos.",
    icon: "🌟",
    xp: 250,
  },
  {
    id: "STREAK_3",
    title: "En Racha",
    desc: "Completá 3 partidas consecutivas en la misma sesión.",
    icon: "🔥",
    xp: 100,
  },
  {
    id: "MATRIX_VISION",
    title: "La Píldora Roja",
    desc: "Descubrí el modo secreto tecleando 1990.",
    icon: "🕶️",
    xp: 100,
  },
];

export const DAILY_CHALLENGES = [
  { id: "snake_100", gameId: "snake", gameName: "Snake", goal: 100, desc: "Alcanzá 100 puntos en Snake", xp: 150 },
  { id: "pacman_800", gameId: "pacman", gameName: "Pac-Man", goal: 800, desc: "Alcanzá 800 puntos en Pac-Man", xp: 150 },
  { id: "invaders_400", gameId: "invaders", gameName: "Invaders", goal: 400, desc: "Alcanzá 400 puntos en Invaders", xp: 150 },
  { id: "tetris_800", gameId: "tetris", gameName: "Tetris", goal: 800, desc: "Alcanzá 800 puntos en Tetris", xp: 150 },
  { id: "breakout_200", gameId: "breakout", gameName: "Breakout", goal: 200, desc: "Alcanzá 200 puntos en Breakout", xp: 150 },
  { id: "snake_150", gameId: "snake", gameName: "Snake", goal: 150, desc: "Alcanzá 150 puntos en Snake", xp: 200 },
  { id: "tetris_1500", gameId: "tetris", gameName: "Tetris", goal: 1500, desc: "Alcanzá 1.500 puntos en Tetris", xp: 200 },
];

const XP_KEY = "arcade-player-xp";
const ACH_KEY = "arcade-achievements";
let sessionRuns = 0;

export function getPlayerXP() {
  try {
    return Number(localStorage.getItem(XP_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

export function addXP(amount) {
  try {
    const cur = getPlayerXP();
    const next = cur + Math.max(0, amount);
    localStorage.setItem(XP_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function calculateLevel(xp) {
  const levels = [
    { level: 1, title: "ROOKIE", min: 0, next: 150 },
    { level: 2, title: "NOVICE", min: 150, next: 350 },
    { level: 3, title: "AMATEUR", min: 350, next: 700 },
    { level: 4, title: "REGULAR", min: 700, next: 1200 },
    { level: 5, title: "SKILLED", min: 1200, next: 1900 },
    { level: 6, title: "ARCADE PRO", min: 1900, next: 2800 },
    { level: 7, title: "MASTER", min: 2800, next: 4000 },
    { level: 8, title: "LEGEND", min: 4000, next: 10000 },
  ];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].min) {
      const cur = levels[i];
      const range = cur.next - cur.min;
      const progress = Math.min(100, Math.max(0, Math.floor(((xp - cur.min) / range) * 100)));
      return {
        level: cur.level,
        title: cur.title,
        xp,
        min: cur.min,
        next: cur.next,
        progress,
      };
    }
  }
  return { level: 1, title: "ROOKIE", xp: 0, min: 0, next: 150, progress: 0 };
}

export function getUnlockedAchievements() {
  try {
    const raw = localStorage.getItem(ACH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function playAchievementFanfare() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const actx = new AC();
    if (actx.state === "suspended") actx.resume().catch(() => {});
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t = actx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  } catch {
    /* noop */
  }
}

export function showAchievementToast(ach) {
  document.querySelector(".achievement-toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  toast.innerHTML = `
    <div class="toast-icon">${ach.icon || "🏆"}</div>
    <div class="toast-content">
      <span class="toast-badge">¡LOGRO DESBLOQUEADO!</span>
      <h4 class="toast-title">${ach.title}</h4>
      <span class="toast-xp">+${ach.xp} XP</span>
    </div>
  `;
  document.body.appendChild(toast);
  playAchievementFanfare();
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

export function unlockAchievement(id) {
  const unlocked = getUnlockedAchievements();
  if (unlocked.includes(id)) return false;
  const ach = ACHIEVEMENTS.find((a) => a.id === id);
  if (!ach) return false;

  unlocked.push(id);
  try {
    localStorage.setItem(ACH_KEY, JSON.stringify(unlocked));
    addXP(ach.xp);
  } catch {
    /* noop */
  }

  showAchievementToast(ach);
  return true;
}

export function getTodayChallenge() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const dayIndex = Math.abs(Math.floor(today.getTime() / (1000 * 60 * 60 * 24))) % DAILY_CHALLENGES.length;
  const challenge = DAILY_CHALLENGES[dayIndex];
  let isCompleted = false;
  try {
    isCompleted = localStorage.getItem(`arcade-daily-${dateStr}`) === "1";
  } catch {
    isCompleted = false;
  }
  return {
    ...challenge,
    dateStr,
    isCompleted,
  };
}

export function checkDailyChallenge(gameId, score) {
  const challenge = getTodayChallenge();
  if (challenge.isCompleted) return false;
  if (challenge.gameId === gameId && score >= challenge.goal) {
    try {
      localStorage.setItem(`arcade-daily-${challenge.dateStr}`, "1");
      addXP(challenge.xp);
      showAchievementToast({
        title: "¡Desafío Diario Completado!",
        icon: "🎯",
        xp: challenge.xp,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function recordGameStart(gameId, allGameIds = []) {
  sessionRuns++;
  if (sessionRuns >= 3) {
    unlockAchievement("STREAK_3");
  }

  // Verificar si se completó la primera partida
  let totalRuns = 0;
  let playedCount = 0;
  allGameIds.forEach((id) => {
    try {
      const runs = Number(localStorage.getItem("arcade-plays-" + id) || 0) || 0;
      totalRuns += runs;
      if (runs > 0) playedCount++;
    } catch {
      /* noop */
    }
  });

  if (totalRuns >= 1) {
    unlockAchievement("FIRST_RUN");
  }
  if (totalRuns >= 10) {
    unlockAchievement("DEDICATED_10");
  }
  if (playedCount >= allGameIds.length && allGameIds.length > 0) {
    unlockAchievement("ALL_ROUNDER");
  }
}

export function checkScoreAchievements(gameId, score) {
  if (score >= 1000) {
    unlockAchievement("HIGH_ROLLER_1K");
  }
  if (gameId === "snake" && score >= 100) {
    unlockAchievement("SNAKE_MASTER");
  }
  if (gameId === "pacman" && score >= 1000) {
    unlockAchievement("PAC_HERO");
  }
  if (gameId === "invaders" && score >= 500) {
    unlockAchievement("SPACE_DEFENDER");
  }
  if (gameId === "tetris" && score >= 1000) {
    unlockAchievement("LINE_CLEARER");
  }
  if (gameId === "breakout" && score >= 250) {
    unlockAchievement("BRICK_BREAKER");
  }

  // Evaluar también el reto diario
  checkDailyChallenge(gameId, score);
}

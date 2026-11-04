import "./style.css";
import { mountSnake } from "./games/snake.js";
import { mountBreakout } from "./games/breakout.js";
import { mountInvaders } from "./games/invaders.js";
import { mountTetris } from "./games/tetris.js";
import { mountPacman } from "./games/pacman.js";
import { topScores, playerName, setPlayerName } from "./lib/scores.js";
import {
  getPlayerXP,
  calculateLevel,
  getUnlockedAchievements,
  unlockAchievement,
  getTodayChallenge,
  recordGameStart,
  ACHIEVEMENTS,
} from "./lib/profile.js";

const games = [
  {
    id: "snake",
    name: "Snake",
    genre: "SURVIVAL",
    difficulty: "PROGRESIVA",
    diffTag: "NORMAL",
    diffClass: "normal",
    desc: "Comé y crecé sin chocar contra los límites.",
    controls: "Flechas / WASD",
    locked: false,
    accent: "#33ff33",
    icon: "snake",
  },
  {
    id: "pacman",
    name: "Pac-Man",
    genre: "CLÁSICO",
    difficulty: "ARCADE IA",
    diffTag: "MEDIA",
    diffClass: "normal",
    desc: "Comé todos los puntos esquivando a los 4 fantasmas.",
    controls: "Flechas / WASD",
    locked: false,
    accent: "#faff00",
    icon: "pacman",
  },
  {
    id: "invaders",
    name: "Invaders",
    genre: "SHMUP",
    difficulty: "RETRO HARD",
    diffTag: "DIFÍCIL",
    diffClass: "hard",
    desc: "Eliminá las oleadas alienígenas antes de que desciendan.",
    controls: "← → mover · Espacio fuego",
    locked: false,
    accent: "#b366ff",
    icon: "invader",
  },
  {
    id: "tetris",
    name: "Tetris",
    genre: "PUZZLE",
    difficulty: "ESCALONADA",
    diffTag: "MEDIA",
    diffClass: "normal",
    desc: "Encastrá piezas geométricas, limpiá líneas y sumá puntos.",
    controls: "← → ↓ · ↑ rotar · Espacio caer",
    locked: false,
    accent: "#00f0ff",
    icon: "block",
  },
  {
    id: "breakout",
    name: "Breakout",
    genre: "REFLEJOS",
    difficulty: "VELOZ",
    diffTag: "NORMAL",
    diffClass: "normal",
    desc: "Destruí todos los bloques sin dejar caer la bola.",
    controls: "← → / Mouse / Touch",
    locked: false,
    accent: "#ff00e5",
    icon: "hammer",
  },
];

function pixelIcon(kind) {
  const s = 'shape-rendering="crispEdges"';
  if (kind === "snake") {
    const P = { G: "#33ff33", D: "#1fa81f", E: "#0a0a0a", W: "#ffffff", R: "#ff2244", N: "#8a5a2a" };
    const MAP = [
      "................",
      "..GGG...........",
      ".GGGGG.R........",
      ".GEGGRRR........",
      ".GGWWG.R........",
      ".GGWW...........",
      ".GG...GGGGGG....",
      ".GG...G....G....",
      ".GG...D....D....",
      ".GGGGGGGGGGG....",
      ".............N..",
      "............RRR.",
      "............WRR.",
      "............RRD.",
      "................",
      "................",
    ];
    let r = "";
    MAP.forEach((row, y) => {
      [...row].forEach((c, x) => {
        if (P[c]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${P[c]}"/>`;
      });
    });
    return `<svg class="pixel-icon" viewBox="0 0 16 16" aria-hidden="true"><g ${s}>${r}</g></svg>`;
  }
  if (kind === "hammer")
    return `<svg class="pixel-icon" viewBox="0 0 8 8" aria-hidden="true"><g ${s}><rect x="0" y="0" width="4" height="2" fill="#c8c8d0"/><rect x="0" y="2" width="4" height="1" fill="#8a8aa3"/><rect x="3" y="2" width="1" height="4" fill="#a06a2a"/><rect x="4" y="3" width="1" height="4" fill="#a06a2a"/><rect x="2" y="6" width="4" height="1" fill="#5a3a12"/></g></svg>`;
  if (kind === "invader")
    return `<svg class="pixel-icon" viewBox="0 0 8 8" aria-hidden="true"><g ${s} fill="#b366ff"><rect x="2" y="0" width="1" height="1"/><rect x="5" y="0" width="1" height="1"/><rect x="3" y="1" width="2" height="1"/><rect x="1" y="2" width="6" height="1"/><rect x="0" y="3" width="8" height="1"/><rect x="0" y="4" width="2" height="1"/><rect x="3" y="4" width="2" height="1"/><rect x="6" y="4" width="2" height="1"/><rect x="1" y="5" width="1" height="1"/><rect x="6" y="5" width="1" height="1"/><rect x="2" y="6" width="1" height="1"/><rect x="5" y="6" width="1" height="1"/></g></svg>`;
  if (kind === "pacman")
    return `<svg class="pixel-icon" viewBox="0 0 8 8" aria-hidden="true"><g ${s}><rect x="2" y="0" width="4" height="1" fill="#faff00"/><rect x="1" y="1" width="6" height="1" fill="#faff00"/><rect x="0" y="2" width="5" height="1" fill="#faff00"/><rect x="0" y="3" width="4" height="1" fill="#faff00"/><rect x="0" y="4" width="4" height="1" fill="#faff00"/><rect x="0" y="5" width="5" height="1" fill="#faff00"/><rect x="1" y="6" width="6" height="1" fill="#faff00"/><rect x="2" y="7" width="4" height="1" fill="#faff00"/><rect x="2" y="2" width="1" height="1" fill="#0a0a0a"/></g></svg>`;
  return `<svg class="pixel-icon" viewBox="0 0 8 8" aria-hidden="true"><g ${s}><rect x="2" y="1" width="4" height="1" fill="#faff00"/><rect x="3" y="2" width="2" height="1" fill="#faff00"/><rect x="3" y="3" width="2" height="1" fill="#c8a800"/><rect x="0" y="5" width="2" height="2" fill="#00f0ff"/><rect x="6" y="5" width="2" height="2" fill="#ff00e5"/></g></svg>`;
}

let unmount = null;
const grid = document.getElementById("games-grid");

const LAST_KEY = "arcade-last";
function setLast(id) {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* noop */
  }
}
function getLast() {
  try {
    return localStorage.getItem(LAST_KEY) || null;
  } catch {
    return null;
  }
}

const PLAYS_KEY = "arcade-plays-";
function getPlays(id) {
  try {
    return Number(localStorage.getItem(PLAYS_KEY + id) || 0) || 0;
  } catch {
    return 0;
  }
}
function incPlays(id) {
  try {
    const cur = getPlays(id);
    localStorage.setItem(PLAYS_KEY + id, String(cur + 1));
  } catch {
    /* noop */
  }
}

function bestOf(id) {
  try {
    return Number(localStorage.getItem("arcade-best-" + id) || 0) || 0;
  } catch {
    return 0;
  }
}

function getTotalPlays() {
  return games.reduce((acc, g) => acc + getPlays(g.id), 0);
}

function getTotalPB() {
  return games.reduce((acc, g) => acc + bestOf(g.id), 0);
}

function getTopBest() {
  return games.reduce((max, g) => Math.max(max, bestOf(g.id)), 0);
}

// Blips arcade con Web Audio, sin assets. Default encendido bajo, apaga con toggle.
const SND_KEY = "arcade-sound";
let sndOn = true;
try {
  sndOn = localStorage.getItem(SND_KEY) !== "off";
} catch {
  sndOn = true;
}
let actx = null;
function beep(freq = 660, dur = 0.05) {
  if (!sndOn) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = actx || new AC();
    if (actx.state === "suspended") actx.resume().catch(() => {});
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.value = 0.03;
    o.connect(g);
    g.connect(actx.destination);
    o.start();
    o.stop(actx.currentTime + dur);
  } catch {
    /* noop */
  }
}

// Caché en memoria para evitar consultas redundantes a Firestore
const scoreCache = new Map();
async function getCachedTopScores(n = 5, game = null) {
  const key = game || "all";
  const now = Date.now();
  if (scoreCache.has(key)) {
    const entry = scoreCache.get(key);
    if (now - entry.timestamp < 120000) {
      return entry.data;
    }
  }
  const data = await topScores(n, game);
  scoreCache.set(key, { data, timestamp: now });
  return data;
}

// Modal de logros
function setupAchievementsModal() {
  const modal = document.getElementById("achievements-modal");
  const closeBtn = document.getElementById("modal-close-btn");
  const openBtn = document.getElementById("btn-open-achievements");
  const ctaAch = document.getElementById("cta-achievements");
  const list = document.getElementById("modal-achievements-list");

  if (!modal || !list) return;

  const openModal = () => {
    beep(880, 0.06);
    const unlocked = getUnlockedAchievements();
    const xp = getPlayerXP();
    const lvl = calculateLevel(xp);

    const elCount = document.getElementById("modal-ach-unlocked-count");
    if (elCount) elCount.textContent = String(unlocked.length);
    const elXP = document.getElementById("modal-ach-total-xp");
    if (elXP) elXP.textContent = xp.toLocaleString();
    const elLvl = document.getElementById("modal-ach-level");
    if (elLvl) elLvl.textContent = `${lvl.level} (${lvl.title})`;

    list.innerHTML = ACHIEVEMENTS.map((a) => {
      const isUnlocked = unlocked.includes(a.id);
      return `
        <div class="achievement-item ${isUnlocked ? "unlocked" : "locked"}">
          <div class="ach-icon-box">${isUnlocked ? a.icon : "🔒"}</div>
          <div class="ach-info">
            <div class="ach-title-row">
              <h3 class="ach-name">${a.title}</h3>
              <span class="ach-status-tag ${isUnlocked ? "unlocked-tag" : "locked-tag"}">
                ${isUnlocked ? "✔ OBTENIDO" : "BLOQUEADO"}
              </span>
            </div>
            <p class="ach-desc">${a.desc}</p>
            <span class="ach-xp-tag">+${a.xp} XP</span>
          </div>
        </div>
      `;
    }).join("");

    modal.style.display = "flex";
  };

  const closeModal = () => {
    modal.style.display = "none";
  };

  if (openBtn && !openBtn.dataset.bound) {
    openBtn.dataset.bound = "1";
    openBtn.addEventListener("click", openModal);
  }
  if (ctaAch && !ctaAch.dataset.bound) {
    ctaAch.dataset.bound = "1";
    ctaAch.addEventListener("click", openModal);
  }
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "1";
    closeBtn.addEventListener("click", closeModal);
  }
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display === "flex") {
      closeModal();
    }
  });
}

function renderHub() {
  if (unmount) {
    unmount();
    unmount = null;
  }

  const last = getLast();
  const totalRuns = getTotalPlays();
  const totalPB = getTotalPB();
  const topBest = getTopBest();
  const xp = getPlayerXP();
  const lvlInfo = calculateLevel(xp);
  const unlocked = getUnlockedAchievements();
  const daily = getTodayChallenge();

  // Actualizar indicadores del Hero
  const elTickGames = document.getElementById("ticker-games");
  if (elTickGames) elTickGames.textContent = String(games.length);
  const elTickBest = document.getElementById("ticker-top-best");
  if (elTickBest) elTickBest.textContent = topBest.toLocaleString();
  const elTickPlays = document.getElementById("ticker-plays");
  if (elTickPlays) elTickPlays.textContent = String(totalRuns);

  // Actualizar Ficha de Jugador & Progreso XP
  const elRank = document.getElementById("player-rank");
  if (elRank) elRank.textContent = lvlInfo.title;
  const elProfileRuns = document.getElementById("profile-total-runs");
  if (elProfileRuns) elProfileRuns.textContent = String(totalRuns);
  const elProfilePts = document.getElementById("profile-total-pts");
  if (elProfilePts) elProfilePts.textContent = totalPB.toLocaleString();

  const elLvl = document.getElementById("profile-level");
  if (elLvl) elLvl.textContent = `NIVEL ${lvlInfo.level}`;
  const elXp = document.getElementById("profile-xp");
  if (elXp) elXp.textContent = `${lvlInfo.xp} / ${lvlInfo.next} XP`;
  const elXpBar = document.getElementById("profile-xp-bar");
  if (elXpBar) elXpBar.style.width = `${lvlInfo.progress}%`;
  const elAchCount = document.getElementById("profile-ach-count");
  if (elAchCount) elAchCount.textContent = String(unlocked.length);

  // Actualizar Desafío Diario
  const elDailyDesc = document.getElementById("daily-desc");
  if (elDailyDesc) elDailyDesc.textContent = daily.desc;
  const elDailyReward = document.getElementById("daily-reward");
  if (elDailyReward) elDailyReward.textContent = `+${daily.xp} XP`;
  const elDailyBadge = document.getElementById("daily-status-badge");
  if (elDailyBadge) {
    elDailyBadge.textContent = daily.isCompleted ? "✔ COMPLETADO" : "EN CURSO";
    elDailyBadge.classList.toggle("completed", daily.isCompleted);
  }
  const elDailyBtn = document.getElementById("daily-action-btn");
  if (elDailyBtn) {
    elDailyBtn.href = `#/${daily.gameId}`;
    elDailyBtn.textContent = daily.isCompleted ? "✔ COMPLETADO" : "▶ IR AL RETO";
  }

  // Renderizar Grilla de Fichas de Competición
  grid.innerHTML = games
    .map((g, index) => {
      const best = bestOf(g.id);
      const plays = getPlays(g.id);
      const isLast = !g.locked && g.id === last;
      const statusLabel = isLast ? "ACTIVO" : plays > 0 ? "LISTO" : "NUEVO";

      return `
      <article class="game-card ${g.locked ? "locked" : ""}${isLast ? " last-played" : ""}" data-id="${g.id}" style="--card:${g.accent || "var(--neon)"}"${g.locked ? "" : ` tabindex="0" role="link" aria-label="Jugar ${g.name}. ${g.desc} Controles: ${g.controls}"`}>
        <div class="card-meta-bar">
          <span class="genre-badge">${g.genre || "ARCADE"}</span>
          ${isLast ? `<span class="status-badge last-badge">★ ÚLTIMO JUGADO</span>` : `<span class="status-badge">${statusLabel}</span>`}
        </div>

        <div class="card-head">
          <div class="pixel-icon-box">
            ${pixelIcon(g.icon)}
          </div>
          <div class="card-head-info">
            <h2 class="card-title">${g.name}</h2>
            <span class="card-diff">DIFICULTAD: <b class="diff-tag ${g.diffClass === "hard" ? "diff-hard" : ""}">${g.diffTag}</b></span>
          </div>
        </div>

        <p class="card-desc">${g.desc}</p>

        <div class="card-controls">
          <span class="ctrl-chip">⌨ ${g.controls}</span>
        </div>

        <div class="card-stats-box">
          <div class="stat-col">
            <span class="stat-label">RÉCORD PB</span>
            <span class="stat-val ${best > 0 ? "highlight" : ""}">${best > 0 ? best.toLocaleString() : "---"}</span>
          </div>
          <div class="stat-col">
            <span class="stat-label">PARTIDAS</span>
            <span class="stat-val">${plays}</span>
          </div>
          <div class="stat-col">
            <span class="stat-label">ESTADO</span>
            <span class="stat-val status-text">${statusLabel}</span>
          </div>
        </div>

        <div class="card-footer">
          <button class="portal-btn" type="button" ${g.locked ? "disabled" : ""} aria-label="${g.locked ? `${g.name} bloqueado` : `Jugar ${g.name}`}">
            ${g.locked ? "🔒 Bloqueado" : isLast ? "▶ CONTINUAR" : "▶ JUGAR"}
          </button>
          <span class="shortcut-tip">[Tecla ${index + 1}]</span>
        </div>
      </article>`;
    })
    .join("");

  // CTA del hero: scroll a la grilla sin cambiar el hash
  const ctaPlay = document.getElementById("cta-play");
  if (ctaPlay && !ctaPlay.dataset.bound) {
    ctaPlay.dataset.bound = "1";
    ctaPlay.addEventListener("click", () => {
      beep(880, 0.06);
      document.getElementById("games-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Mostrar el panel lateral
  const side = document.getElementById("side-board");
  if (side) side.style.display = "";

  // Navegación con clic y teclado en las tarjetas
  grid.querySelectorAll(".game-card").forEach((card) => {
    const id = card.dataset.id;
    const g = games.find((x) => x.id === id);
    if (!g.locked) {
      card.style.cursor = "pointer";
      card.onclick = () => {
        location.hash = "#/" + id;
      };
      card.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          location.hash = "#/" + id;
        }
      };
    }
  });

  // Toggle de sonido persistido
  const sndBtn = document.getElementById("snd-toggle");
  if (sndBtn) {
    const paint = () => {
      sndBtn.textContent = sndOn ? "🔊" : "🔇";
      sndBtn.setAttribute("aria-pressed", String(sndOn));
    };
    paint();
    sndBtn.onclick = (e) => {
      e.stopPropagation();
      sndOn = !sndOn;
      try {
        localStorage.setItem(SND_KEY, sndOn ? "on" : "off");
      } catch {
        /* noop */
      }
      paint();
      if (sndOn) beep(880, 0.06);
    };
  }

  grid.querySelectorAll(".portal-btn").forEach((b) => {
    b.addEventListener("mouseenter", () => beep(660, 0.04));
    b.addEventListener("click", () => beep(880, 0.06));
  });

  // Input de nombre de jugador
  const nameInput = document.getElementById("player-name");
  if (nameInput) {
    nameInput.value = playerName();
    nameInput.oninput = () => {
      setPlayerName(nameInput.value);
    };
    nameInput.onchange = () => {
      nameInput.value = playerName();
    };
  }

  // Ranking online con pestañas y caché
  const board = document.getElementById("top-list");
  if (board) {
    const FILTERS = ["all", "snake", "pacman", "invaders", "tetris", "breakout"];
    let filter = "all";
    const esc = (s) =>
      String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    const bar = document.createElement("div");
    bar.className = "rank-filters";
    bar.innerHTML = FILTERS.map(
      (f) =>
        `<button data-f="${f}" class="btn-filter" aria-pressed="${f === "all"}">${f === "all" ? "TODOS" : f.toUpperCase()}</button>`
    ).join("");

    if (board.previousElementSibling?.classList?.contains("rank-filters")) {
      board.previousElementSibling.remove();
    }
    board.before(bar);

    const load = () => {
      board.innerHTML = `<div class="text-xs text-muted">Consultando clasificación…</div>`;
      let done = false;
      setTimeout(() => {
        if (!done && document.getElementById("top-list")) {
          board.innerHTML = `<div class="text-xs text-muted">Ranking no disponible temporalmente (modo local).</div>`;
        }
      }, 8000);

      getCachedTopScores(5, filter === "all" ? null : filter).then((rows) => {
        done = true;
        if (!document.getElementById("top-list")) return;
        board.innerHTML = rows.length
          ? rows
              .map(
                (r, i) => `
            <div class="rank-row medal-${i + 1}">
              <div class="rank-left">
                <span class="medal">#${i + 1}</span>
                <span class="rank-name">${esc(r.name || "ANON")}</span>
                <span class="text-muted text-[7px]">(${esc(r.game || "---")})</span>
              </div>
              <span class="rank-score">${Number(r.score) || 0}</span>
            </div>`
              )
              .join("")
          : `<div class="text-xs text-muted py-2">Sin registros todavía. ¡Jugá y sé el primero!</div>`;
      });
    };

    bar.querySelectorAll("button").forEach((b) => {
      b.onclick = () => {
        filter = b.dataset.f;
        bar.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        load();
      };
    });

    load();
  }

  // Configurar modal de logros
  setupAchievementsModal();
}

async function renderRoute() {
  const hash = location.hash || "#/";
  if (hash === "#/" || hash === "") {
    renderHub();
    return;
  }
  const id = hash.replace("#/", "");
  const side = document.getElementById("side-board");
  if (side) side.style.display = "none";

  const host = document.createElement("div");
  host.className = "w-full";

  const onLaunch = (gameId) => {
    setLast(gameId);
    incPlays(gameId);
    recordGameStart(gameId, games.map((g) => g.id));
  };

  if (id === "snake") {
    if (unmount) unmount();
    grid.innerHTML = "";
    grid.appendChild(host);
    unmount = mountSnake(host);
    onLaunch("snake");
    console.log("[arcade] snake mounted");
    return;
  }
  if (id === "breakout") {
    if (unmount) unmount();
    grid.innerHTML = "";
    grid.appendChild(host);
    unmount = mountBreakout(host);
    onLaunch("breakout");
    console.log("[arcade] breakout mounted");
    return;
  }
  if (id === "invaders") {
    if (unmount) unmount();
    grid.innerHTML = "";
    grid.appendChild(host);
    unmount = mountInvaders(host);
    onLaunch("invaders");
    console.log("[arcade] invaders mounted");
    return;
  }
  if (id === "tetris") {
    if (unmount) unmount();
    grid.innerHTML = "";
    grid.appendChild(host);
    unmount = mountTetris(host);
    onLaunch("tetris");
    console.log("[arcade] tetris mounted");
    return;
  }
  if (id === "pacman") {
    if (unmount) unmount();
    grid.innerHTML = "";
    grid.appendChild(host);
    unmount = mountPacman(host);
    onLaunch("pacman");
    console.log("[arcade] pacman mounted");
    return;
  }
  renderHub();
}

window.addEventListener("hashchange", renderRoute);
renderRoute();

// Atajos 1-5 para lanzar juegos desde el hub
window.addEventListener("keydown", (e) => {
  const hash = location.hash || "#/";
  if (hash !== "#/" && hash !== "") return;
  if (/^[1-5]$/.test(e.key)) {
    const g = games[Number(e.key) - 1];
    if (g && !g.locked) location.hash = "#/" + g.id;
  }
});

console.log("[arcade] hub Fase 2 OK", games.length, "slots");

// Versión desde build (vite define __APP_VERSION), sin hardcodear en HTML
try {
  const v = typeof __APP_VERSION !== "undefined" ? __APP_VERSION : null;
  if (v) {
    const el = document.getElementById("app-ver");
    if (el) el.textContent = v;
  }
} catch {
  /* noop */
}

// PWA: service worker solo en https o localhost (offline + instalable)
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

// Easter egg: teclear 1990 alterna paleta matrix/neón (persiste)
const PAL_KEY = "arcade-palette";
if (localStorage.getItem(PAL_KEY) === "matrix") document.body.classList.add("matrix");
let seq = "";
function toast(msg) {
  document.querySelector(".egg-toast")?.remove();
  const t = document.createElement("div");
  t.className = "egg-toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1500);
}
window.addEventListener("keydown", (e) => {
  if (e.key.length === 1) {
    seq = (seq + e.key.toLowerCase()).slice(-4);
    if (seq === "1990") {
      seq = "";
      const on = document.body.classList.toggle("matrix");
      localStorage.setItem(PAL_KEY, on ? "matrix" : "neon");
      toast(on ? "MATRIX MODE" : "NEON MODE");
      unlockAchievement("MATRIX_VISION");
    }
  }
});

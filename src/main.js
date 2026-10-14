import "./style.css";
import { mountSnake } from "./games/snake.js";
import { mountBreakout } from "./games/breakout.js";
import { mountInvaders } from "./games/invaders.js";
import { mountTetris } from "./games/tetris.js";
import { topScores, playerName, setPlayerName } from "./lib/scores.js";

const games = [
  { id: "snake", name: "Snake", desc: "Comé y crecé sin chocar.", controls: "Flechas / WASD", locked: false, accent: "#33ff33", icon: "snake" },
  { id: "breakout", name: "Breakout", desc: "Rompé todos los bloques.", controls: "← → / mouse / touch", locked: false, accent: "#ff00e5", icon: "hammer" },
  { id: "invaders", name: "Invaders", desc: "Sobreviví 3 vidas por oleadas.", controls: "← → mover · Espacio disparar", locked: false, accent: "#b366ff", icon: "invader" },
  { id: "tetris", name: "Tetris", desc: "Encastrá piezas y limpiá líneas.", controls: "← → ↓ mover · ↑ rotar · Espacio caer", locked: false, accent: "#faff00", icon: "block" },
];

function pixelIcon(kind) {
  const s = 'shape-rendering="crispEdges"';
  if (kind === "snake")
    return `<svg class="pixel-icon" viewBox="0 0 8 8" aria-hidden="true"><g ${s}><rect x="1" y="0" width="3" height="2" fill="#33ff33"/><rect x="2" y="1" width="1" height="1" fill="#0a0a0a"/><rect x="4" y="1" width="2" height="1" fill="#ff2244"/><rect x="1" y="2" width="1" height="3" fill="#33ff33"/><rect x="1" y="5" width="5" height="1" fill="#33ff33"/><rect x="5" y="3" width="1" height="3" fill="#1fa81f"/><rect x="2" y="5" width="3" height="1" fill="#9dff9d"/><rect x="5" y="6" width="2" height="1" fill="#1fa81f"/></g></svg>`;
  if (kind === "hammer")
    return `<svg class="pixel-icon" viewBox="0 0 8 8" aria-hidden="true"><g ${s}><rect x="0" y="0" width="4" height="2" fill="#c8c8d0"/><rect x="0" y="2" width="4" height="1" fill="#8a8aa3"/><rect x="3" y="2" width="1" height="4" fill="#a06a2a"/><rect x="4" y="3" width="1" height="4" fill="#a06a2a"/><rect x="2" y="6" width="4" height="1" fill="#5a3a12"/></g></svg>`;
  if (kind === "invader")
    return `<svg class="pixel-icon" viewBox="0 0 8 8" aria-hidden="true"><g ${s} fill="#b366ff"><rect x="2" y="0" width="1" height="1"/><rect x="5" y="0" width="1" height="1"/><rect x="3" y="1" width="2" height="1"/><rect x="1" y="2" width="6" height="1"/><rect x="0" y="3" width="8" height="1"/><rect x="0" y="4" width="2" height="1"/><rect x="3" y="4" width="2" height="1"/><rect x="6" y="4" width="2" height="1"/><rect x="1" y="5" width="1" height="1"/><rect x="6" y="5" width="1" height="1"/><rect x="2" y="6" width="1" height="1"/><rect x="5" y="6" width="1" height="1"/></g></svg>`;
  return `<svg class="pixel-icon" viewBox="0 0 8 8" aria-hidden="true"><g ${s}><rect x="2" y="1" width="4" height="1" fill="#faff00"/><rect x="3" y="2" width="2" height="1" fill="#faff00"/><rect x="3" y="3" width="2" height="1" fill="#c8a800"/><rect x="0" y="5" width="2" height="2" fill="#00f0ff"/><rect x="6" y="5" width="2" height="2" fill="#ff00e5"/></g></svg>`;
}

let unmount = null;
const grid = document.getElementById("games-grid");

function renderHub() {
  if (unmount) {
    unmount();
    unmount = null;
  }
  grid.innerHTML = games
    .map(
      (g) => `
    <div class="game-card ${g.locked ? "locked" : ""}" data-id="${g.id}" style="--card:${g.accent || "var(--neon)"}">
      <p class="text-xs text-muted">GAME PORTAL</p>
      <div class="card-head">${pixelIcon(g.icon)}<h2 class="text-xl font-bold mt-1">${g.name}</h2></div>
      <p class="text-muted mt-2 text-sm">Objetivo: ${g.desc}</p>
      ${g.controls ? `<p class="text-muted mt-1 text-xs">Controles: ${g.controls}</p>` : ""}
      <button class="mt-4 text-sm portal-btn" ${g.locked ? "disabled" : ""}>${g.locked ? "🔒 Bloqueado" : "▶ Run"}</button>
    </div>`
    )
    .join("");

  const side = document.getElementById("side-board");
  if (side) side.style.display = "";

  grid.querySelectorAll(".game-card").forEach((card) => {
    const id = card.dataset.id;
    const g = games.find((x) => x.id === id);
    if (!g.locked) {
      card.style.cursor = "pointer";
      card.onclick = () => {
        location.hash = "#/" + id;
      };
    }
  });

  // ranking online + nombre de jugador
  const board = document.getElementById("top-list");
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
  if (board) {
    const FILTERS = ["all", "snake", "breakout", "invaders", "tetris"];
    let filter = "all";
    const esc = (s) =>
      String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const bar = document.createElement("div");
    bar.className = "mt-2 flex gap-2 flex-wrap text-xs";
    bar.innerHTML = FILTERS.map(
      (f) => `<button data-f="${f}" class="btn-back" aria-pressed="${f === "all"}">${f === "all" ? "TODOS" : f.toUpperCase()}</button>`
    ).join("");
    board.before(bar);
    const load = () => {
      board.textContent = "Cargando ranking…";
      let done = false;
      setTimeout(() => {
        if (!done && document.getElementById("top-list")) {
          board.innerHTML = "<div>Ranking no disponible (offline o bloqueado).</div>";
        }
      }, 10000);
      topScores(5, filter === "all" ? null : filter).then((rows) => {
        done = true;
        if (!document.getElementById("top-list")) return;
        board.innerHTML = rows.length
          ? rows.map((r, i) => `<div class="rank-row medal-${i + 1}"><span class="medal">■</span><span>${i + 1}. ${esc(r.game)} — ${esc(r.name)} · ${Number(r.score) || 0}</span></div>`).join("")
          : "<div>Sin scores todavía. ¡Jugá y sé el primero!</div>";
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
  if (id === "snake") {
    if (unmount) unmount();
    const host = document.createElement("div");
    host.className = "w-full";
    grid.innerHTML = "";
    grid.appendChild(host);
    unmount = mountSnake(host);
    console.log("[arcade] snake mounted");
    return;
  }
  if (id === "breakout") {
    if (unmount) unmount();
    const host = document.createElement("div");
    host.className = "w-full";
    grid.innerHTML = "";
    grid.appendChild(host);
    unmount = mountBreakout(host);
    console.log("[arcade] breakout mounted");
    return;
  }
  if (id === "invaders") {
    if (unmount) unmount();
    const host = document.createElement("div");
    host.className = "w-full";
    grid.innerHTML = "";
    grid.appendChild(host);
    unmount = mountInvaders(host);
    console.log("[arcade] invaders mounted");
    return;
  }
  if (id === "tetris") {
    if (unmount) unmount();
    const host = document.createElement("div");
    host.className = "w-full";
    grid.innerHTML = "";
    grid.appendChild(host);
    unmount = mountTetris(host);
    console.log("[arcade] tetris mounted");
    return;
  }
  renderHub();
}

window.addEventListener("hashchange", renderRoute);
renderRoute();

// Atajos 1-4 para lanzar juegos desde el hub
window.addEventListener("keydown", (e) => {
  const hash = location.hash || "#/";
  if (hash !== "#/" && hash !== "") return;
  if (/^[1-4]$/.test(e.key)) {
    const g = games[Number(e.key) - 1];
    if (g && !g.locked) location.hash = "#/" + g.id;
  }
});

console.log("[arcade] hub Fase 1 OK", games.length, "slots");

// Versión desde build (vite define __APP_VERSION), sin hardcodear en HTML
try {
  const v = typeof __APP_VERSION !== "undefined" ? __APP_VERSION : null;
  if (v) {
    const el = document.getElementById("app-ver");
    if (el) el.textContent = v;
  }
} catch { /* noop */ }

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
    }
  }
});

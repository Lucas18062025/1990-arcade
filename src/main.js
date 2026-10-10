import "./style.css";
import { mountSnake } from "./games/snake.js";
import { mountBreakout } from "./games/breakout.js";
import { mountInvaders } from "./games/invaders.js";
import { mountTetris } from "./games/tetris.js";
import { topScores, playerName, setPlayerName } from "./lib/scores.js";

const games = [
  { id: "snake", name: "Snake", desc: "Comé y crecé sin chocar.", controls: "Flechas / WASD", locked: false },
  { id: "breakout", name: "Breakout", desc: "Rompé todos los bloques.", controls: "← → / mouse / touch", locked: false },
  { id: "invaders", name: "Invaders", desc: "Sobreviví 3 vidas por oleadas.", controls: "← → mover · Espacio disparar", locked: false },
  { id: "tetris", name: "Tetris", desc: "Encastrá piezas y limpiá líneas.", controls: "← → ↓ mover · ↑ rotar · Espacio caer", locked: false },
];

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
    <div class="game-card ${g.locked ? "locked" : ""}" data-id="${g.id}">
      <p class="text-xs text-muted">GAME PORTAL</p>
      <h2 class="text-xl font-bold mt-1">${g.name}</h2>
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
    nameInput.onchange = () => {
      setPlayerName(nameInput.value);
      nameInput.value = playerName();
    };
  }
  if (board) {
    board.textContent = "Cargando ranking…";
    let done = false;
    const esc = (s) =>
      String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    setTimeout(() => {
      if (!done && document.getElementById("top-list")) {
        board.innerHTML = "<div>Ranking no disponible (offline o bloqueado).</div>";
      }
    }, 10000);
    topScores(5).then((rows) => {
      done = true;
      if (!document.getElementById("top-list")) return;
      board.innerHTML = rows.length
        ? rows.map((r, i) => `<div>${i + 1}. ${esc(r.game)} — ${esc(r.name)} · ${Number(r.score) || 0}</div>`).join("")
        : "<div>Sin scores todavía. ¡Jugá y sé el primero!</div>";
    });
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

console.log("[arcade] hub Fase 1 OK", games.length, "slots");

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

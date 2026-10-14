const W = COLS * CELL; // 380
const H = ROWS * CELL; // 420
const BEST_KEY = "arcade-best-pacman";
import { saveBest } from "../lib/scores.js";
import {
  COLS,
  ROWS,
  CELL,
  DIRS,
  initialState,
  resetPositions,
  stepPac,
  stepGhost,
  checkCaught,
  isCleared,
} from "./pacman/utils.js";

export function mountPacman(root) {
  root.innerHTML = `
    <div class="game-wrap">
      <div class="game-top">
        <div class="top-left">
          <a href="#/" class="btn-back">← HUB (ESC)</a>
          <button id="pac-fs" class="btn-back" title="Pantalla completa" aria-label="Pantalla completa">⛶</button>
        </div>
        <div class="hud">
          <span>SCORE <b id="pac-score">0</b></span>
          <span>BEST <b id="pac-best">0</b></span>
          <span>LIVES <b id="pac-lives">3</b></span>
        </div>
      </div>
      <div class="canvas-box power-on" style="--ar:0.9">
        <div class="crt-glow"></div>
        <canvas id="pac-cv" width="${W}" height="${H}" role="img" aria-label="Juego Pac-Man: usá flechas o WASD para mover, R para reiniciar" tabindex="0"></canvas>
        <div class="crt-reflection"></div>
        <div id="pac-overlay" class="overlay"></div>
      </div>
      <div class="snake-touch">
        <button data-d="left" aria-label="Mover izquierda">◀</button>
        <button data-d="up" aria-label="Mover arriba">▲</button>
        <button data-d="down" aria-label="Mover abajo">▼</button>
        <button data-d="right" aria-label="Mover derecha">▶</button>
      </div>
      <p class="help">FLECHAS / WASD MOVER · R REINICIAR · ESC HUB</p>
    </div>`;

  const cv = root.querySelector("#pac-cv");
  const ctx = cv.getContext("2d");
  const elScore = root.querySelector("#pac-score");
  const elBest = root.querySelector("#pac-best");
  const elLives = root.querySelector("#pac-lives");
  const overlay = root.querySelector("#pac-overlay");
  const box = root.querySelector(".canvas-box");

  function toggleFS() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else box.requestFullscreen?.().catch(() => {});
  }

  let S = initialState();
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let timer = null;
  let alive = true;
  let started = false;
  let won = false;
  let paused = false;
  elBest.textContent = best;
  elLives.textContent = S.lives;

  function speed() {
    return 150;
  }

  function maybeBest() {
    elScore.textContent = S.score;
    if (S.score > best) {
      best = S.score;
      localStorage.setItem(BEST_KEY, String(best));
      elBest.textContent = best;
      saveBest("pacman", S.score);
    }
  }

  function reset() {
    S = initialState();
    elScore.textContent = 0;
    elLives.textContent = 3;
    draw();
    showStart();
  }

  function start() {
    if (timer) clearInterval(timer);
    started = true;
    paused = false;
    won = false;
    hideOverlay();
    timer = setInterval(tick, speed());
  }

  function pause() {
    if (!started || !alive || won || paused) return;
    paused = true;
    clearInterval(timer);
    timer = null;
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>PAUSA</h3><p>Pestaña oculta — juego pausado</p><button id="pac-res">SEGUIR</button></div>`;
    overlay.querySelector("#pac-res").onclick = (e) => {
      e.stopPropagation();
      resume();
    };
  }

  function resume() {
    if (!paused) return;
    paused = false;
    hideOverlay();
    timer = setInterval(tick, speed());
  }

  function tick() {
    S.tick += 1;
    stepPac(S);
    maybeBest();
    if (S.frightened > 0) S.frightened -= 1;
    for (let i = 0; i < S.ghosts.length; i += 1) {
      if (S.frightened > 0 && S.tick % 2 === 0) continue;
      stepGhost(S, i);
    }
    const caught = checkCaught(S);
    if (caught >= 0) {
      if (S.frightened > 0) {
        S.score += 200;
        maybeBest();
        const gs = S.ghostStarts[caught];
        S.ghosts[caught] = { x: gs.x, y: gs.y, dir: { ...DIRS.up } };
      } else {
        return hit();
      }
    }
    if (isCleared(S)) return win();
    draw();
  }

  function hit() {
    S.lives -= 1;
    elLives.textContent = S.lives;
    if (S.lives <= 0) return die();
    resetPositions(S);
    draw();
  }

  function die() {
    alive = false;
    clearInterval(timer);
    maybeBest();
    showOver();
    draw();
  }

  function win() {
    won = true;
    clearInterval(timer);
    maybeBest();
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>YOU WIN</h3><p>Score ${S.score} · Best ${best}</p><button id="pac-again">JUGAR OTRA (R)</button></div>`;
    overlay.querySelector("#pac-again").onclick = (e) => {
      e.stopPropagation();
      S = initialState();
      S.lives = 3;
      elLives.textContent = 3;
      elScore.textContent = 0;
      start();
    };
    draw();
  }

  function draw() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);
    // laberinto
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const c = S.grid[y][x];
        if (c === "#") {
          ctx.fillStyle = "#2e2ef2";
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          ctx.fillStyle = "#101060";
          ctx.fillRect(x * CELL + 3, y * CELL + 3, CELL - 6, CELL - 6);
        } else if (c === "-") {
          ctx.fillStyle = "#ff9ac8";
          ctx.fillRect(x * CELL + 2, y * CELL + CELL / 2 - 1, CELL - 4, 2);
        }
      }
    }
    // pellets
    ctx.fillStyle = "#ffcc99";
    for (const key of S.pellets) {
      const [x, y] = key.split(",").map(Number);
      ctx.fillRect(x * CELL + CELL / 2 - 2, y * CELL + CELL / 2 - 2, 4, 4);
    }
    // power pellets (parpadean)
    if (S.tick % 2 === 0) {
      ctx.fillStyle = "#ffffff";
      for (const key of S.powers) {
        const [x, y] = key.split(",").map(Number);
        ctx.fillRect(x * CELL + CELL / 2 - 4, y * CELL + CELL / 2 - 4, 8, 8);
      }
    }
    // pacman
    const px = (S.pac.x + 0.5) * CELL;
    const py = (S.pac.y + 0.5) * CELL;
    const r = CELL / 2 - 2;
    const d = S.pac.dir;
    const ang = d.x === 1 ? 0 : d.x === -1 ? Math.PI : d.y === 1 ? Math.PI / 2 : -Math.PI / 2;
    const open = S.tick % 2 === 0 ? 0.28 : 0.02;
    ctx.fillStyle = "#faff00";
    ctx.shadowColor = "#faff00";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, r, ang + open * Math.PI, ang + (2 - open) * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // fantasmas
    for (const g of S.ghosts) {
      const gx = (g.x + 0.5) * CELL;
      const gy = (g.y + 0.5) * CELL;
      const fright = S.frightened > 0;
      const flash = fright && S.frightened < 10 && S.tick % 2 === 0;
      ctx.fillStyle = fright ? (flash ? "#ffffff" : "#2244ff") : "#ff2222";
      ctx.beginPath();
      ctx.arc(gx, gy - 2, r - 1, Math.PI, 0);
      ctx.rect(gx - r + 1, gy - 2, (r - 1) * 2, r + 1);
      ctx.fill();
      // pies
      for (let f = -1; f <= 1; f += 1) {
        ctx.beginPath();
        ctx.moveTo(gx + f * 5 - 2, gy + r - 1);
        ctx.lineTo(gx + f * 5 + 2, gy + r - 1);
        ctx.lineTo(gx + f * 5, gy + r - 5);
        ctx.closePath();
        ctx.fill();
      }
      // ojos
      const ex = S.pac.x > g.x ? 1 : S.pac.x < g.x ? -1 : 0;
      const ey = S.pac.y > g.y ? 1 : S.pac.y < g.y ? -1 : 0;
      if (!fright) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(gx - 6, gy - 7, 5, 6);
        ctx.fillRect(gx + 1, gy - 7, 5, 6);
        ctx.fillStyle = "#2244ff";
        ctx.fillRect(gx - 6 + 2 + ex, gy - 5 + ey, 3, 3);
        ctx.fillRect(gx + 1 + 2 + ex, gy - 5 + ey, 3, 3);
      } else {
        ctx.fillStyle = flash ? "#ff2222" : "#ffffff";
        ctx.fillRect(gx - 6, gy - 4, 4, 2);
        ctx.fillRect(gx + 2, gy - 4, 4, 2);
        ctx.fillRect(gx - 4, gy + 1, 8, 1);
      }
    }
    ctx.fillStyle = "#e8e8f0";
    ctx.font = "10px monospace";
    ctx.fillText("Score " + S.score, 10, 14);
  }

  function showStart() {
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>PAC-MAN</h3><p>Pulsa ESPACIO o toca para empezar</p><button id="pac-go">JUGAR</button></div>`;
    overlay.querySelector("#pac-go").onclick = (e) => {
      e.stopPropagation();
      S = initialState();
      S.lives = 3;
      elLives.textContent = 3;
      elScore.textContent = 0;
      start();
    };
  }

  function showOver() {
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>GAME OVER</h3><p>Score ${S.score} · Best ${best}</p><button id="pac-re">REINTENTAR (R)</button></div>`;
    overlay.querySelector("#pac-re").onclick = (e) => {
      e.stopPropagation();
      S = initialState();
      S.lives = 3;
      elLives.textContent = 3;
      elScore.textContent = 0;
      start();
    };
  }

  function hideOverlay() {
    overlay.style.display = "none";
  }

  function onKey(e) {
    if (e.key === "Escape" || e.key === "z" || e.key === "Z" || e.key === "h" || e.key === "H") {
      location.hash = "#/";
      return;
    }
    if (e.key === "r" || e.key === "R") {
      S = initialState();
      S.lives = 3;
      elLives.textContent = 3;
      elScore.textContent = 0;
      start();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") {
      S.pac.nextDir = { ...DIRS.up };
      e.preventDefault();
    } else if (k === "arrowdown" || k === "s") {
      S.pac.nextDir = { ...DIRS.down };
      e.preventDefault();
    } else if (k === "arrowleft" || k === "a") {
      S.pac.nextDir = { ...DIRS.left };
      e.preventDefault();
    } else if (k === "arrowright" || k === "d") {
      S.pac.nextDir = { ...DIRS.right };
      e.preventDefault();
    } else if (k === " " || k === "x" || k === "v" || k === "c") {
      if (!started || !alive || won) {
        S = initialState();
        S.lives = 3;
        elLives.textContent = 3;
        elScore.textContent = 0;
        start();
      }
      e.preventDefault();
    }
  }

  function onTap() {
    if (paused) {
      resume();
      return;
    }
    if (overlay.style.display !== "none") return;
    if (!started || !alive || won) {
      S = initialState();
      S.lives = 3;
      start();
    }
  }

  window.addEventListener("keydown", onKey);
  function onVis() {
    if (document.hidden) pause();
  }
  document.addEventListener("visibilitychange", onVis);
  root.querySelector("#pac-fs").onclick = (e) => {
    e.stopPropagation();
    toggleFS();
  };
  function steer(d) {
    S.pac.nextDir = { ...DIRS[d] };
  }
  root.querySelectorAll(".snake-touch button").forEach((b) => {
    const go = (e) => {
      e.preventDefault();
      if (!started || !alive || won) {
        S = initialState();
        S.lives = 3;
        elLives.textContent = 3;
        elScore.textContent = 0;
        start();
        return;
      }
      steer(b.dataset.d);
    };
    b.addEventListener("touchstart", go, { passive: false });
    b.addEventListener("mousedown", go);
  });
  cv.addEventListener("click", onTap);
  overlay.addEventListener("click", () => {
    if (paused) {
      resume();
      return;
    }
    if (!started || !alive || won) {
      S = initialState();
      S.lives = 3;
      start();
    }
  });

  // Touch swipe
  let tx = 0;
  let ty = 0;
  cv.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    tx = t.clientX;
    ty = t.clientY;
  });
  cv.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    const dx = t.clientX - tx;
    const dy = t.clientY - ty;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      S.pac.nextDir = dx > 0 ? { ...DIRS.right } : { ...DIRS.left };
    } else {
      S.pac.nextDir = dy > 0 ? { ...DIRS.down } : { ...DIRS.up };
    }
    tx = t.clientX;
    ty = t.clientY;
    e.preventDefault();
  });

  reset();

  return () => {
    clearInterval(timer);
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onVis);
  };
}

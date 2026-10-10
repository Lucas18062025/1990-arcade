const SIZE = 400;
const CELLS = 20;
const CELL = SIZE / CELLS;
const BEST_KEY = "arcade-best-snake";
import { saveBest } from "../lib/scores.js";

export function mountSnake(root) {
  root.innerHTML = `
    <div class="game-wrap">
      <div class="game-top">
        <div class="top-left">
          <a href="#/" class="btn-back">← HUB (ESC)</a>
          <button id="snake-fs" class="btn-back" title="Pantalla completa">⛶</button>
        </div>
        <div class="hud">
          <span>SCORE <b id="snake-score">0</b></span>
          <span>BEST <b id="snake-best">0</b></span>
        </div>
      </div>
      <div class="canvas-box power-on">
        <div class="crt-glow"></div>
        <canvas id="snake-cv" width="${SIZE}" height="${SIZE}"></canvas>
        <div class="crt-reflection"></div>
        <div id="snake-overlay" class="overlay"></div>
      </div>
      <div class="snake-touch">
        <button data-d="left">◀</button>
        <button data-d="up">▲</button>
        <button data-d="down">▼</button>
        <button data-d="right">▶</button>
      </div>
      <p class="help">FLECHAS / WASD MOVER · R REINICIAR · ESC HUB</p>
    </div>`;

  const cv = root.querySelector("#snake-cv");
  const ctx = cv.getContext("2d");
  const elScore = root.querySelector("#snake-score");
  const elBest = root.querySelector("#snake-best");
  const overlay = root.querySelector("#snake-overlay");
  const box = root.querySelector(".canvas-box");

  function toggleFS() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else box.requestFullscreen?.().catch(() => {});
  }

  let snake, dir, nextDir, food, stars, score, best, timer, alive, started, parts, shake;

  best = Number(localStorage.getItem(BEST_KEY) || 0);
  elBest.textContent = best;

  function reset() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    alive = true;
    started = false;
    parts = [];
    shake = 0;
    stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * SIZE,
      y: Math.random() * SIZE,
      v: 0.3 + Math.random() * 0.9,
    }));
    elScore.textContent = "0";
    placeFood();
    draw();
    showStart();
  }

  function placeFood() {
    while (true) {
      const f = {
        x: Math.floor(Math.random() * CELLS),
        y: Math.floor(Math.random() * CELLS),
      };
      if (!snake.some((s) => s.x === f.x && s.y === f.y)) {
        food = f;
        return;
      }
    }
  }

  function speed() {
    return Math.max(70, 130 - Math.floor(score / 30) * 10);
  }

  function start() {
    if (timer) clearInterval(timer);
    started = true;
    hideOverlay();
    timer = setInterval(tick, speed());
  }

  function burst(cx, cy) {
    for (let i = 0; i < 12; i++) {
      parts.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 22 });
    }
  }

  function tick() {
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    }
    parts = parts.filter((p) => p.life > 0);
    if (shake > 0) shake--;
    for (const st of stars) {
      st.y += st.v;
      if (st.y > SIZE) {
        st.y = 0;
        st.x = Math.random() * SIZE;
      }
    }
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS) return die();
    if (snake.some((s) => s.x === head.x && s.y === head.y)) return die();

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      burst((head.x + 0.5) * CELL, (head.y + 0.5) * CELL);
      score += 10;
      elScore.textContent = score;
      if (score > best) {
        best = score;
        localStorage.setItem(BEST_KEY, String(best));
        elBest.textContent = best;
        saveBest("snake", score);
      }
      placeFood();
      clearInterval(timer);
      timer = setInterval(tick, speed());
    } else {
      snake.pop();
    }
    draw();
  }

  function die() {
    alive = false;
    shake = 10;
    clearInterval(timer);
    showOver();
    draw();
  }

  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.fillStyle = "#000000";
    ctx.fillRect(-12, -12, SIZE + 24, SIZE + 24);
    ctx.fillStyle = "#3a3a5a";
    for (const st of stars) ctx.fillRect(st.x, st.y, 1, 1);
    ctx.strokeStyle = "#111122";
    for (let i = 1; i < CELLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, SIZE);
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(SIZE, i * CELL);
      ctx.stroke();
    }
    ctx.fillStyle = "#ff00e5";
    ctx.shadowColor = "#ff00e5";
    ctx.shadowBlur = 10;
    ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);
    ctx.shadowBlur = 0;
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#00f0ff" : "#00b8c4";
      if (i === 0) {
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 12;
      }
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      ctx.shadowBlur = 0;
    });
    ctx.fillStyle = "#ff00e5";
    for (const p of parts) {
      ctx.globalAlpha = p.life / 22;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e8e8f0";
    ctx.font = "10px monospace";
    ctx.fillText("Score " + score, 10, 14);
    ctx.fillText("Best " + best, 10, 28);
    ctx.restore();
  }

  function showStart() {
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>SNAKE</h3><p>Pulsa ESPACIO o toca para empezar</p><button id="snake-go">JUGAR</button></div>`;
    overlay.querySelector("#snake-go").onclick = (e) => {
      e.stopPropagation();
      start();
    };
  }

  function showOver() {
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>GAME OVER</h3><p>Score ${score} · Best ${best}</p><button id="snake-re">REINTENTAR (R)</button></div>`;
    overlay.querySelector("#snake-re").onclick = (e) => {
      e.stopPropagation();
      reset();
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
      reset();
      start();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") {
      if (dir.y !== 1) nextDir = { x: 0, y: -1 };
      e.preventDefault();
    } else if (k === "arrowdown" || k === "s") {
      if (dir.y !== -1) nextDir = { x: 0, y: 1 };
      e.preventDefault();
    } else if (k === "arrowleft" || k === "a") {
      if (dir.x !== 1) nextDir = { x: -1, y: 0 };
      e.preventDefault();
    } else if (k === "arrowright" || k === "d") {
      if (dir.x !== -1) nextDir = { x: 1, y: 0 };
      e.preventDefault();
    } else if (k === " " || k === "x" || k === "v" || k === "c") {
      if (!started || !alive) {
        reset();
        start();
      }
      e.preventDefault();
    }
  }

  function onTap(e) {
    if (overlay.style.display !== "none") return;
    if (!started || !alive) {
      reset();
      start();
    }
  }

  window.addEventListener("keydown", onKey);
  root.querySelector("#snake-fs").onclick = (e) => {
    e.stopPropagation();
    toggleFS();
  };
  function steer(d) {
    if (d === "up" && dir.y !== 1) nextDir = { x: 0, y: -1 };
    else if (d === "down" && dir.y !== -1) nextDir = { x: 0, y: 1 };
    else if (d === "left" && dir.x !== 1) nextDir = { x: -1, y: 0 };
    else if (d === "right" && dir.x !== -1) nextDir = { x: 1, y: 0 };
  }
  root.querySelectorAll(".snake-touch button").forEach((b) => {
    const go = (e) => {
      e.preventDefault();
      if (!started || !alive) {
        reset();
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
    if (!started || !alive) {
      reset();
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
      if (dx > 0 && dir.x !== -1) nextDir = { x: 1, y: 0 };
      if (dx < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 };
    } else {
      if (dy > 0 && dir.y !== -1) nextDir = { x: 0, y: 1 };
      if (dy < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 };
    }
    tx = t.clientX;
    ty = t.clientY;
    e.preventDefault();
  });

  reset();

  return () => {
    clearInterval(timer);
    window.removeEventListener("keydown", onKey);
  };
}

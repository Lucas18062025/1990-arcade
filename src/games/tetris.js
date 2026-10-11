const COLS = 20;
const ROWS = 20;
const CELL = 20;
const W = COLS * CELL; // 400
const H = ROWS * CELL; // 400
const BEST_KEY = "arcade-best-tetris";
import { saveBest } from "../lib/scores.js";

const SHAPES = {
  I: { m: [[1, 1, 1, 1]], c: "#00f0ff" },
  J: { m: [[1, 0, 0], [1, 1, 1]], c: "#b967ff" },
  L: { m: [[0, 0, 1], [1, 1, 1]], c: "#faff00" },
  O: { m: [[1, 1], [1, 1]], c: "#00ff9d" },
  S: { m: [[0, 1, 1], [1, 1, 0]], c: "#ff00e5" },
  T: { m: [[0, 1, 0], [1, 1, 1]], c: "#ff9f1c" },
  Z: { m: [[1, 1, 0], [0, 1, 1]], c: "#ff3355" },
};
const KEYS = Object.keys(SHAPES);

export function mountTetris(root) {
  root.innerHTML = `
    <div class="game-wrap">
      <div class="game-top">
        <div class="top-left">
          <a href="#/" class="btn-back">← Hub (Esc)</a>
          <button id="tet-fs" class="btn-back" title="Pantalla completa" aria-label="Pantalla completa">⛶</button>
        </div>
        <div class="hud">
          <span>SCORE <b id="tet-score">0</b></span>
          <span>LINES <b id="tet-lines">0</b></span>
          <span>BEST <b id="tet-best">0</b></span>
        </div>
      </div>
      <div class="canvas-box">
        <canvas id="tet-cv" width="${W}" height="${H}" role="img" aria-label="Juego Tetris: mové con flechas, rotá con arriba, espacio para caída" tabindex="0"></canvas>
        <div id="tet-overlay" class="overlay"></div>
      </div>
      <div class="tet-touch">
        <button data-a="left" aria-label="Mover izquierda">◀</button>
        <button data-a="rot" aria-label="Rotar pieza">⟳</button>
        <button data-a="right" aria-label="Mover derecha">▶</button>
        <button data-a="down" aria-label="Bajar pieza">▼</button>
        <button data-a="drop" aria-label="Caída instantánea">⤓</button>
      </div>
      <p class="text-muted text-sm help">← → mover · ↓ bajar · ↑ rotar · Espacio caer · R reiniciar · Esc hub</p>
    </div>
    <style>
      .tet-touch{display:flex;gap:.5rem;justify-content:center}
      .tet-touch button{border:1px solid #00f0ff;border-radius:8px;padding:.5rem .8rem;background:#12122b;color:#e8e8f0;font-size:1rem}
    </style>`;

  const cv = root.querySelector("#tet-cv");
  const ctx = cv.getContext("2d");
  const elScore = root.querySelector("#tet-score");
  const elLines = root.querySelector("#tet-lines");
  const elBest = root.querySelector("#tet-best");
  const overlay = root.querySelector("#tet-overlay");
  const box = root.querySelector(".canvas-box");

  function toggleFS() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else box.requestFullscreen?.().catch(() => {});
  }

  let board, cur, score, lines, level, best, raf, alive, started, last, dropMs, parts, shake, flash;
  let paused = false;

  best = Number(localStorage.getItem(BEST_KEY) || 0);
  elBest.textContent = best;

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function reset() {
    board = emptyBoard();
    score = 0;
    lines = 0;
    level = 1;
    parts = [];
    shake = 0;
    flash = [];
    alive = true;
    started = false;
    paused = false;
    dropMs = 500;
    elScore.textContent = "0";
    elLines.textContent = "0";
    spawn();
    draw();
    showStart();
  }

  function spawn() {
    const k = KEYS[Math.floor(Math.random() * KEYS.length)];
    const { m, c } = SHAPES[k];
    cur = { m: m.map((r) => r.slice()), c, x: Math.ceil(COLS / 2) - 2, y: 0 };
    if (collide(0, 0, cur.m)) {
      cur = null;
      die();
    }
  }

  function collide(ox, oy, m) {
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const x = cur.x + c + ox;
        const y = cur.y + r + oy;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && board[y][x]) return true;
      }
    }
    return false;
  }

  function rotate() {
    const m = cur.m;
    const n = m[0].map((_, i) => m.map((row) => row[i]).reverse());
    for (const ox of [0, -1, 1, -2, 2]) {
      if (!collide(ox, 0, n)) {
        cur.m = n;
        cur.x += ox;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < cur.m.length; r++) {
      for (let c = 0; c < cur.m[r].length; c++) {
        if (!cur.m[r][c]) continue;
        const y = cur.y + r;
        if (y >= 0) board[y][cur.x + c] = cur.c;
      }
    }
  }

  function clearLines() {
    let n = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every(Boolean)) {
        flash.push(y);
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(null));
        burst();
        n++;
        y++;
      }
    }
    if (n > 0) {
      const pts = [0, 100, 300, 500, 800][n] * level;
      score += pts;
      lines += n;
      level = Math.floor(lines / 5) + 1;
      dropMs = Math.max(80, 500 - (level - 1) * 45);
      elScore.textContent = score;
      elLines.textContent = lines;
      if (score > best) {
        best = score;
        localStorage.setItem(BEST_KEY, String(best));
        elBest.textContent = best;
        saveBest("tetris", score);
      }
    }
  }

  function burst() {
    for (let i = 0; i < 16; i++) {
      parts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 24, c: "#faff00" });
    }
    shake = 5;
  }

  function stepDown() {
    if (!collide(0, 1, cur.m)) {
      cur.y++;
    } else {
      merge();
      clearLines();
      if (!alive) return;
      spawn();
    }
  }

  function hardDrop() {
    if (!cur || !alive) return;
    let d = 0;
    while (!collide(0, 1, cur.m)) {
      cur.y++;
      d++;
    }
    score += d * 2;
    elScore.textContent = score;
    merge();
    clearLines();
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      elBest.textContent = best;
      saveBest("tetris", score);
    }
    if (alive) spawn();
    draw();
  }

  function start() {
    started = true;
    paused = false;
    hideOverlay();
    runLoop();
  }

  function runLoop() {
    cancelAnimationFrame(raf);
    last = performance.now();
    const loop = (t) => {
      if (!alive) return;
      if (t - last > dropMs) {
        if (cur) stepDown();
        last = t;
      }
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
      }
      parts = parts.filter((p) => p.life > 0);
      if (shake > 0) shake--;
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop(last);
  }

  function pause() {
    if (!started || !alive || paused) return;
    paused = true;
    cancelAnimationFrame(raf);
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>PAUSA</h3><p>Pestaña oculta — juego pausado</p><button id="tet-res">SEGUIR</button></div>`;
    overlay.querySelector("#tet-res").onclick = (e) => {
      e.stopPropagation();
      resume();
    };
  }

  function resume() {
    if (!paused) return;
    paused = false;
    hideOverlay();
    runLoop();
  }

  function die() {
    alive = false;
    shake = 10;
    cancelAnimationFrame(raf);
    draw();
    showOver();
  }

  function cell(x, y, c, ghost) {
    ctx.fillStyle = c;
    ctx.globalAlpha = ghost ? 0.25 : 1;
    ctx.shadowColor = c;
    ctx.shadowBlur = ghost ? 0 : 8;
    ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(-12, -12, W + 24, H + 24);
    ctx.strokeStyle = "#1e1e3a";
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, H);
      ctx.stroke();
    }
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (board[y][x]) cell(x, y, board[y][x]);
      }
    }
    if (cur && alive) {
      // ghost
      let gy = 0;
      while (!collide(0, gy + 1, cur.m)) gy++;
      for (let r = 0; r < cur.m.length; r++) {
        for (let c = 0; c < cur.m[r].length; c++) {
          if (!cur.m[r][c]) continue;
          const y = cur.y + r + gy;
          if (y >= 0) cell(cur.x + c, y, cur.c, true);
        }
      }
      for (let r = 0; r < cur.m.length; r++) {
        for (let c = 0; c < cur.m[r].length; c++) {
          if (!cur.m[r][c]) continue;
          const y = cur.y + r;
          if (y >= 0) cell(cur.x + c, y, cur.c);
        }
      }
    }
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, p.life / 24);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#8a8aa3";
    ctx.font = "10px monospace";
    ctx.fillText("NV " + level, 6, H - 8);
    ctx.restore();
  }

  function showStart() {
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>TETRIS</h3><p>Pulsa ESPACIO o toca para empezar</p><button id="tet-go">JUGAR</button></div>`;
    overlay.querySelector("#tet-go").onclick = (e) => {
      e.stopPropagation();
      reset();
      start();
    };
  }

  function showOver() {
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>GAME OVER</h3><p>Score ${score} · Lines ${lines} · Best ${best}</p><button id="tet-re">REINTENTAR (R)</button></div>`;
    overlay.querySelector("#tet-re").onclick = (e) => {
      e.stopPropagation();
      reset();
      start();
    };
  }

  function hideOverlay() {
    overlay.style.display = "none";
  }

  function act(a) {
    if (!started || !alive || !cur) {
      reset();
      start();
      return;
    }
    if (a === "left" && !collide(-1, 0, cur.m)) cur.x--;
    else if (a === "right" && !collide(1, 0, cur.m)) cur.x++;
    else if (a === "down") stepDown();
    else if (a === "rot") rotate();
    else if (a === "drop") return hardDrop();
    draw();
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
    if (k === "arrowleft" || k === "a") {
      act("left");
      e.preventDefault();
    } else if (k === "arrowright" || k === "d") {
      act("right");
      e.preventDefault();
    } else if (k === "arrowdown" || k === "s") {
      act("down");
      e.preventDefault();
    } else if (k === "arrowup" || k === "w" || k === "x" || k === "v" || k === "c") {
      act("rot");
      e.preventDefault();
    } else if (k === " ") {
      if (!started || !alive) {
        reset();
        start();
      } else act("drop");
      e.preventDefault();
    }
  }

  window.addEventListener("keydown", onKey);
  function onVis() {
    if (document.hidden) pause();
  }
  document.addEventListener("visibilitychange", onVis);
  root.querySelector("#tet-fs").onclick = (e) => {
    e.stopPropagation();
    toggleFS();
  };
  root.querySelectorAll(".tet-touch button").forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      act(b.dataset.a);
    };
  });
  overlay.addEventListener("click", () => {
    if (paused) {
      resume();
      return;
    }
    if (!started || !alive) {
      reset();
      start();
    }
  });

  reset();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onVis);
  };
}

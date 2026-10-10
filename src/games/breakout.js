const W = 400;
const H = 400;
const BEST_KEY = "arcade-best-breakout";
import { saveBest } from "../lib/scores.js";

export function mountBreakout(root) {
  root.innerHTML = `
    <div class="game-wrap">
      <div class="game-top">
        <div class="top-left">
          <a href="#/" class="btn-back">← HUB (ESC)</a>
          <button id="brk-fs" class="btn-back" title="Pantalla completa">⛶</button>
        </div>
        <div class="hud">
          <span>SCORE <b id="brk-score">0</b></span>
          <span>BEST <b id="brk-best">0</b></span>
        </div>
      </div>
      <div class="canvas-box power-on">
        <div class="crt-glow"></div>
        <canvas id="brk-cv" width="${W}" height="${H}"></canvas>
        <div class="crt-reflection"></div>
        <div id="brk-overlay" class="overlay"></div>
      </div>
      <p class="help">← → / A D MOVER · R REINICIAR · ESC HUB</p>
    </div>`;

  const cv = root.querySelector("#brk-cv");
  const ctx = cv.getContext("2d");
  const elScore = root.querySelector("#brk-score");
  const elBest = root.querySelector("#brk-best");
  const overlay = root.querySelector("#brk-overlay");
  const box = root.querySelector(".canvas-box");

  function toggleFS() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else box.requestFullscreen?.().catch(() => {});
  }

  let paddle, ball, bricks, parts, shake, stars, score, best, raf, alive, started, moveL, moveR;

  best = Number(localStorage.getItem(BEST_KEY) || 0);
  elBest.textContent = best;

  const COLS = 8;
  const ROWS = 5;
  const GAP = 6;
  const TOP = 50;
  const BW = (W - GAP * (COLS + 1)) / COLS;
  const BH = 18;
  const COLORS = ["#ff00e5", "#faff00", "#00f0ff", "#00ff9d", "#b967ff"];

  function reset() {
    paddle = { w: 70, h: 10, x: W / 2 - 35, y: H - 30, speed: 6 };
    ball = { x: W / 2, y: H - 50, r: 6, dx: 3, dy: -3 };
    bricks = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        bricks.push({
          x: GAP + c * (BW + GAP),
          y: TOP + r * (BH + GAP),
          w: BW,
          h: BH,
          hp: 1,
          color: COLORS[r % COLORS.length],
        });
      }
    }
    score = 0;
    parts = [];
    shake = 0;
    stars = Array.from({ length: 50 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      v: 0.2 + Math.random() * 0.7,
    }));
    alive = true;
    started = false;
    moveL = moveR = false;
    elScore.textContent = "0";
    draw();
    showStart();
  }

  function start() {
    started = true;
    hideOverlay();
    cancelAnimationFrame(raf);
    let last = performance.now();
    const loop = (t) => {
      if (!alive) return;
      const dt = Math.min(50, t - last) / 16.667; // 1 = 60fps, igual en cualquier celu
      last = t;
      step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop(last);
  }

  function burst(x, y, color) {
    for (let i = 0; i < 12; i++) {
      parts.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 24, color });
    }
  }

  function step(dt) {
    for (const p of parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    parts = parts.filter((p) => p.life > 0);
    if (shake > 0) shake -= dt;
    for (const st of stars) {
      st.y += st.v * dt;
      if (st.y > H) {
        st.y = 0;
        st.x = Math.random() * W;
      }
    }
    if (moveL) paddle.x = Math.max(0, paddle.x - paddle.speed * dt);
    if (moveR) paddle.x = Math.min(W - paddle.w, paddle.x + paddle.speed * dt);

    ball.x += ball.dx * dt;
    ball.y += ball.dy * dt;

    if (ball.x - ball.r < 0 || ball.x + ball.r > W) ball.dx *= -1;
    if (ball.y - ball.r < 0) ball.dy *= -1;

    // paddle
    if (
      ball.dy > 0 &&
      ball.y + ball.r >= paddle.y &&
      ball.y + ball.r <= paddle.y + paddle.h + 10 &&
      ball.x >= paddle.x - ball.r &&
      ball.x <= paddle.x + paddle.w + ball.r
    ) {
      const rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.dx = rel * 4;
      ball.dy = -Math.abs(ball.dy);
      ball.y = paddle.y - ball.r;
    }

    // bricks
    for (const b of bricks) {
      if (b.hp <= 0) continue;
      if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
        b.hp = 0;
        ball.dy *= -1;
        burst(b.x + b.w / 2, b.y + b.h / 2, b.color);
        shake = 4;
        score += 10;
        elScore.textContent = score;
        if (score > best) {
          best = score;
          localStorage.setItem(BEST_KEY, String(best));
          elBest.textContent = best;
          saveBest("breakout", score);
        }
        break;
      }
    }

    if (bricks.every((b) => b.hp <= 0)) return die(true);
    if (ball.y - ball.r > H) return die(false);
  }

  function die(win) {
    alive = false;
    if (!win) shake = 10;
    cancelAnimationFrame(raf);
    showOver(win);
    draw();
  }

  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.fillStyle = "#000000";
    ctx.fillRect(-12, -12, W + 24, H + 24);
    ctx.fillStyle = "#3a3a5a";
    for (const st of stars) ctx.fillRect(st.x, st.y, 1, 1);
    for (const b of bricks) {
      if (b.hp <= 0) continue;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.shadowBlur = 0;
    }
    // paddle
    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 12;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.shadowBlur = 0;
    // ball
    ctx.fillStyle = "#faff00";
    ctx.shadowColor = "#faff00";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    for (const p of parts) {
      ctx.globalAlpha = p.life / 24;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e8e8f0";
    ctx.font = "10px monospace";
    ctx.fillText("Score " + score, 10, 14);
    ctx.restore();
  }

  function showStart() {
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>BREAKOUT</h3><p>Pulsa ESPACIO o toca para empezar</p><button id="brk-go">JUGAR</button></div>`;
    overlay.querySelector("#brk-go").onclick = (e) => {
      e.stopPropagation();
      reset();
      start();
    };
  }

  function showOver(win) {
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>${win ? "¡GANASTE!" : "GAME OVER"}</h3><p>Score ${score} · Best ${best}</p><button id="brk-re">REINTENTAR (R)</button></div>`;
    overlay.querySelector("#brk-re").onclick = (e) => {
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
    if (k === "arrowleft" || k === "a") {
      moveL = e.type !== "keyup";
      if (e.type === "keydown") e.preventDefault();
    } else if (k === "arrowright" || k === "d") {
      moveR = e.type !== "keyup";
      if (e.type === "keydown") e.preventDefault();
    } else if ((k === " " || k === "x" || k === "v" || k === "c") && e.type === "keydown") {
      if (!started || !alive) {
        reset();
        start();
      }
      e.preventDefault();
    }
  }

  function onKeyDown(e) {
    onKey(e);
  }
  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") moveL = false;
    if (k === "arrowright" || k === "d") moveR = false;
  }

  function paddleTo(clientX) {
    const r = cv.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * W;
    paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
  }

  function onMouse(e) {
    paddleTo(e.clientX);
  }
  function onTouch(e) {
    paddleTo(e.touches[0].clientX);
    if (!started || !alive) return;
    e.preventDefault();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  root.querySelector("#brk-fs").onclick = (e) => {
    e.stopPropagation();
    toggleFS();
  };
  cv.addEventListener("mousemove", onMouse);
  cv.addEventListener("touchmove", onTouch, { passive: false });
  cv.addEventListener("touchstart", onTouch, { passive: false });
  overlay.addEventListener("click", () => {
    if (!started || !alive) {
      reset();
      start();
    }
  });

  reset();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
}

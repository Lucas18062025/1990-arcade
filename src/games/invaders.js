const W = 400;
const H = 400;
const BEST_KEY = "arcade-best-invaders";
import { saveBest } from "../lib/scores.js";

export function mountInvaders(root) {
  root.innerHTML = `
    <div class="game-wrap">
      <div class="game-top">
        <div class="top-left">
          <a href="#/" class="btn-back">← HUB (ESC)</a>
          <button id="inv-fs" class="btn-back" title="Pantalla completa">⛶</button>
        </div>
        <div class="hud">
          <span>SCORE <b id="inv-score">0</b></span>
          <span>LIVES <b id="inv-lives">3</b></span>
          <span>BEST <b id="inv-best">0</b></span>
        </div>
      </div>
      <div class="canvas-box power-on">
        <div class="crt-glow"></div>
        <canvas id="inv-cv" width="${W}" height="${H}"></canvas>
        <div class="crt-reflection"></div>
        <div id="inv-overlay" class="overlay"></div>
      </div>
      <div class="inv-touch">
        <button data-a="left">◀</button>
        <button data-a="fire">● FUEGO</button>
        <button data-a="right">▶</button>
      </div>
      <p class="help">← → / A D MOVER · ESPACIO DISPARAR · R REINICIAR · ESC HUB</p>
    </div>`;

  const cv = root.querySelector("#inv-cv");
  const ctx = cv.getContext("2d");
  const elScore = root.querySelector("#inv-score");
  const elBest = root.querySelector("#inv-best");
  const elLives = root.querySelector("#inv-lives");
  const overlay = root.querySelector("#inv-overlay");
  const box = root.querySelector(".canvas-box");

  function toggleFS() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else box.requestFullscreen?.().catch(() => {});
  }

  let player, bullets, ebullets, enemies, stars, score, lives, best, raf, alive, started, moveL, moveR, edir, etick, wave, shake;

  best = Number(localStorage.getItem(BEST_KEY) || 0);
  elBest.textContent = best;

  function buildWave(w) {
    enemies = [];
    const cols = 7;
    const rows = 3 + Math.min(2, w);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        enemies.push({
          x: 30 + c * 46,
          y: 50 + r * 32,
          w: 28,
          h: 18,
          alive: true,
          color: r === 0 ? "#ff00e5" : r === 1 ? "#faff00" : "#00f0ff",
          pts: r === 0 ? 30 : r === 1 ? 20 : 10,
        });
      }
    }
    edir = 1;
    etick = Math.max(12, 30 - w * 3);
  }

  function reset() {
    player = { x: W / 2 - 18, y: H - 34, w: 36, h: 12, speed: 5, cd: 0, invuln: 0 };
    bullets = [];
    ebullets = [];
    stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: Math.random() < 0.8 ? 1 : 2,
      v: 0.4 + Math.random() * 1.2,
    }));
    score = 0;
    lives = 3;
    wave = 0;
    shake = 0;
    alive = true;
    started = false;
    moveL = moveR = false;
    elScore.textContent = "0";
    elLives.textContent = "3";
    buildWave(wave);
    draw();
    showStart();
  }

  function start() {
    started = true;
    hideOverlay();
    cancelAnimationFrame(raf);
    let last = performance.now();
    let eAcc = 0;
    const loop = (t) => {
      if (!alive) return;
      const dtMs = Math.min(50, t - last);
      const dtF = dtMs / 16.667;
      last = t;
      eAcc += dtMs;
      const doMove = eAcc >= etick * 16.667;
      if (doMove) eAcc = 0;
      step(dtF, doMove);
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop(last);
  }

  function addScore(n) {
    score += n;
    elScore.textContent = score;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      elBest.textContent = best;
      saveBest("invaders", score);
    }
  }

  function step(dtF, doMove) {
    // starfield scroll
    for (const st of stars) {
      st.y += st.v * dtF;
      if (st.y > H) {
        st.y = 0;
        st.x = Math.random() * W;
      }
    }
    if (shake > 0) shake -= dtF;
    if (player.invuln > 0) player.invuln -= dtF;
    if (moveL) player.x = Math.max(0, player.x - player.speed * dtF);
    if (moveR) player.x = Math.min(W - player.w, player.x + player.speed * dtF);
    if (player.cd > 0) player.cd -= dtF;

    // player bullets
    for (const b of bullets) b.y -= 7 * dtF;
    bullets = bullets.filter((b) => b.y > -10);

    // enemies move
    if (doMove) {
      let hitEdge = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if ((edir > 0 && e.x + e.w + 6 > W) || (edir < 0 && e.x - 6 < 0)) {
          hitEdge = true;
          break;
        }
      }
      if (hitEdge) {
        edir *= -1;
        for (const e of enemies) if (e.alive) e.y += 14;
      } else {
        for (const e of enemies) if (e.alive) e.x += edir * 6;
      }
      // enemy shoot random
      const live = enemies.filter((e) => e.alive);
      if (live.length > 0 && Math.random() < 0.6) {
        const s = live[Math.floor(Math.random() * live.length)];
        ebullets.push({ x: s.x + s.w / 2, y: s.y + s.h, vy: 2.5 + wave * 0.3 });
      }
    }

    for (const b of ebullets) b.y += b.vy * dtF;
    ebullets = ebullets.filter((b) => b.y < H + 10);

    // collisions player bullet vs enemy
    for (const b of bullets) {
      for (const e of enemies) {
        if (!e.alive) continue;
        if (b.x > e.x - 2 && b.x < e.x + e.w + 2 && b.y > e.y - 6 && b.y < e.y + e.h + 2) {
          e.alive = false;
          b.y = -99;
          addScore(e.pts);
          break;
        }
      }
    }
    bullets = bullets.filter((b) => b.y > -10);

    // enemy bullet vs player
    for (const b of ebullets) {
      if (player.invuln <= 0 && b.x > player.x && b.x < player.x + player.w && b.y > player.y && b.y < player.y + player.h + 6) {
        return hitPlayer();
      }
    }

    // enemy reaches player line
    for (const e of enemies) {
      if (e.alive && e.y + e.h >= player.y) return hitPlayer(true);
    }

    // wave cleared
    if (enemies.every((e) => !e.alive)) {
      wave++;
      buildWave(wave);
      ebullets = [];
    }
  }

  function hitPlayer(invaded) {
    lives--;
    elLives.textContent = Math.max(0, lives);
    shake = 10;
    ebullets = [];
    if (lives <= 0) return die(false);
    // segunda chance: reposicionar + empujar invasores arriba + invulnerabilidad
    player.x = W / 2 - player.w / 2;
    player.invuln = 90;
    if (invaded) {
      for (const e of enemies) if (e.alive) e.y -= 24;
    }
  }

  function shoot() {
    if (player.cd > 0) return;
    player.cd = 12;
    bullets.push({ x: player.x + player.w / 2, y: player.y - 4 });
  }

  function die(win) {
    alive = false;
    cancelAnimationFrame(raf);
    showOver(win);
    draw();
  }

  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.fillStyle = "#000000";
    ctx.fillRect(-12, -12, W + 24, H + 24);
    // starfield
    for (const st of stars) {
      ctx.fillStyle = st.s > 1 ? "#e8e8f0" : "#8a8aa3";
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }
    // player (parpadea si invulnerable)
    if (player.invuln <= 0 || Math.floor(player.invuln / 6) % 2 === 0) {
      ctx.fillStyle = "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 12;
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.fillRect(player.x + player.w / 2 - 3, player.y - 8, 6, 8);
      ctx.shadowBlur = 0;
    }
    // enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      ctx.fillStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.shadowBlur = 0;
    }
    // bullets
    ctx.fillStyle = "#faff00";
    ctx.shadowColor = "#faff00";
    ctx.shadowBlur = 8;
    for (const b of bullets) ctx.fillRect(b.x - 2, b.y - 6, 4, 10);
    ctx.fillStyle = "#ff00e5";
    ctx.shadowColor = "#ff00e5";
    for (const b of ebullets) ctx.fillRect(b.x - 2, b.y - 4, 4, 8);
    ctx.shadowBlur = 0;
    // wave + in-canvas UI con margen (game-quality skill)
    ctx.fillStyle = "#e8e8f0";
    ctx.font = "10px monospace";
    ctx.fillText("Score " + score, 10, 14);
    ctx.fillText("Lives " + lives, 10, 28);
    ctx.fillStyle = "#8a8aa3";
    ctx.fillText("OLEADA " + (wave + 1), 10, H - 10);
    ctx.restore();
  }

  function showStart() {
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>INVADERS</h3><p>Pulsa ESPACIO o toca para empezar</p><button id="inv-go">JUGAR</button></div>`;
    overlay.querySelector("#inv-go").onclick = (e) => {
      e.stopPropagation();
      reset();
      start();
    };
  }

  function showOver(win) {
    overlay.style.display = "flex";
    overlay.innerHTML = `<div><h3>${win ? "¡GANASTE!" : "GAME OVER"}</h3><p>Score ${score} · Best ${best}</p><button id="inv-re">REINTENTAR (R)</button></div>`;
    overlay.querySelector("#inv-re").onclick = (e) => {
      e.stopPropagation();
      reset();
      start();
    };
  }

  function hideOverlay() {
    overlay.style.display = "none";
  }

  function onKeyDown(e) {
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
      moveL = true;
      e.preventDefault();
    } else if (k === "arrowright" || k === "d") {
      moveR = true;
      e.preventDefault();
    } else if (k === " " || k === "x" || k === "v" || k === "c") {
      if (!started || !alive) {
        reset();
        start();
      } else shoot();
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") moveL = false;
    if (k === "arrowright" || k === "d") moveR = false;
  }

  function paddleTo(clientX) {
    const r = cv.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * W;
    player.x = Math.max(0, Math.min(W - player.w, x - player.w / 2));
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  root.querySelector("#inv-fs").onclick = (e) => {
    e.stopPropagation();
    toggleFS();
  };
  root.querySelectorAll(".inv-touch button").forEach((b) => {
    const a = b.dataset.a;
    const down = (e) => {
      e.preventDefault();
      if (!started || !alive) {
        reset();
        start();
        return;
      }
      if (a === "left") moveL = true;
      else if (a === "right") moveR = true;
      else if (a === "fire") shoot();
    };
    const up = (e) => {
      e.preventDefault();
      if (a === "left") moveL = false;
      else if (a === "right") moveR = false;
    };
    b.addEventListener("touchstart", down, { passive: false });
    b.addEventListener("touchend", up);
    b.addEventListener("touchcancel", up);
    b.addEventListener("mousedown", down);
    b.addEventListener("mouseup", up);
  });
  cv.addEventListener("mousemove", (e) => paddleTo(e.clientX));
  cv.addEventListener("touchmove", (e) => {
    paddleTo(e.touches[0].clientX);
    e.preventDefault();
  }, { passive: false });
  cv.addEventListener("click", () => {
    if (!started || !alive) {
      reset();
      start();
    } else shoot();
  });
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

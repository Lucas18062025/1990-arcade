export const COLS = 19;
export const ROWS = 21;
export const CELL = 20;
export const FRIGHT_TICKS = 40;
export const CHASE_TICKS = 45;
export const SCATTER_TICKS = 25;
export const SCATTER_CORNER = { x: 17, y: 1 };

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
// Orden de preferencia para desempates del fantasma.
export const DIR_ORDER = ["up", "left", "down", "right"];

// Leyenda: # pared · - puerta (solo fantasma) · . pellet · o power · P pacman · G fantasma
export const MAZE = [
  "###################",
  "#........#........#",
  "#.##.###.#.###.##.#",
  "#o##.###.#.###.##o#",
  "#.................#",
  "#.##.#.#####.#.##.#",
  "#....#...#...#....#",
  "####.###.#.###.####",
  "####.#.......#.####",
  "####.#.##-##.#.####",
  ".......# G #.......",
  "####.#.#####.#.####",
  "####.#.......#.####",
  "####.#.#####.#.####",
  "#........#........#",
  "#.##.###.#.###.##.#",
  "#o#.......P.......#",
  "##.#.#.#####.#.#.##",
  "#....#...#...#....#",
  "#.######.#.######.#",
  "###################",
];

export function parseMaze() {
  const pellets = new Set();
  const powers = new Set();
  let pacStart = { x: 1, y: 1 };
  const ghostStarts = [];
  const grid = MAZE.map((row, y) =>
    [...row].map((c, x) => {
      if (c === ".") pellets.add(x + "," + y);
      else if (c === "o") powers.add(x + "," + y);
      else if (c === "P") pacStart = { x, y };
      else if (c === "G") ghostStarts.push({ x, y });
      return c;
    })
  );
  return { grid, pellets, powers, pacStart, ghostStarts, pelletTotal: pellets.size + powers.size };
}

export function cellAt(grid, x, y) {
  if (y < 0 || y >= ROWS) return "#";
  if (x < 0 || x >= COLS) return "#";
  return grid[y][x];
}

export function passableForPac(grid, x, y) {
  const c = cellAt(grid, x, y);
  return c !== "#" && c !== "-";
}

export function passableForGhost(grid, x, y) {
  return cellAt(grid, x, y) !== "#";
}

// Túnel lateral: solo envuelve en filas con bordes abiertos (fila 10).
function wrapX(grid, y, x) {
  if (x < 0) return grid[y][0] !== "#" ? COLS - 1 : null;
  if (x >= COLS) return grid[y][COLS - 1] !== "#" ? 0 : null;
  return x;
}

function tryStep(grid, ent, dir, pass) {
  const ny = ent.y + dir.y;
  if (ny < 0 || ny >= ROWS) return null;
  const wx = wrapX(grid, ent.y, ent.x + dir.x);
  if (wx === null) return null;
  if (!pass(grid, wx, ny)) return null;
  return { x: wx, y: ny };
}

export function currentMode(tick) {
  const t = tick % (CHASE_TICKS + SCATTER_TICKS);
  return t < CHASE_TICKS ? "chase" : "scatter";
}

export function initialState() {
  const p = parseMaze();
  return {
    grid: p.grid,
    pellets: p.pellets,
    powers: p.powers,
    pacStart: p.pacStart,
    ghostStarts: p.ghostStarts,
    pelletTotal: p.pelletTotal,
    pac: { x: p.pacStart.x, y: p.pacStart.y, dir: { ...DIRS.left }, nextDir: { ...DIRS.left } },
    ghosts: p.ghostStarts.map((g) => ({ x: g.x, y: g.y, dir: { ...DIRS.up } })),
    score: 0,
    lives: 3,
    frightened: 0,
    tick: 0,
  };
}

export function resetPositions(s) {
  s.pac = { x: s.pacStart.x, y: s.pacStart.y, dir: { ...DIRS.left }, nextDir: { ...DIRS.left } };
  s.ghosts = s.ghostStarts.map((g) => ({ x: g.x, y: g.y, dir: { ...DIRS.up } }));
  s.frightened = 0;
}

// Mueve al pacman una celda. Devuelve "pellet" | "power" | null.
export function stepPac(s) {
  const p = s.pac;
  const goNext = tryStep(s.grid, p, p.nextDir, passableForPac);
  if (goNext) {
    p.dir = { ...p.nextDir };
    p.x = goNext.x;
    p.y = goNext.y;
  } else {
    const goDir = tryStep(s.grid, p, p.dir, passableForPac);
    if (goDir) {
      p.x = goDir.x;
      p.y = goDir.y;
    } else {
      return null;
    }
  }
  const key = p.x + "," + p.y;
  if (s.pellets.has(key)) {
    s.pellets.delete(key);
    s.score += 10;
    return "pellet";
  }
  if (s.powers.has(key)) {
    s.powers.delete(key);
    s.score += 50;
    s.frightened = FRIGHT_TICKS;
    return "power";
  }
  return null;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Mueve al fantasma i una celda. rand inyectable para tests.
export function stepGhost(s, i, rand = Math.random) {
  const g = s.ghosts[i];
  // Dentro de la casa: salir por la puerta (9,9) hacia (9,8).
  if (g.y === 10 && g.x >= 8 && g.x <= 10) {
    if (g.x < 9) {
      g.x += 1;
      g.dir = { ...DIRS.right };
    } else if (g.x > 9) {
      g.x -= 1;
      g.dir = { ...DIRS.left };
    } else {
      g.y -= 1;
      g.dir = { ...DIRS.up };
    }
    return;
  }
  const rev = { x: -g.dir.x, y: -g.dir.y };
  const opts = [];
  for (const name of DIR_ORDER) {
    const d = DIRS[name];
    if (d.x === rev.x && d.y === rev.y) continue;
    const pos = tryStep(s.grid, g, d, passableForGhost);
    if (pos) opts.push({ d: { ...d }, pos });
  }
  if (opts.length === 0) {
    const back = tryStep(s.grid, g, rev, passableForGhost);
    if (back) {
      g.x = back.x;
      g.y = back.y;
      g.dir = { ...rev };
    }
    return;
  }
  let pick;
  if (s.frightened > 0) {
    pick = opts[Math.floor(rand() * opts.length)];
  } else {
    const target = currentMode(s.tick) === "chase" ? s.pac : SCATTER_CORNER;
    pick = opts[0];
    let best = manhattan(opts[0].pos, target);
    for (const o of opts) {
      const dd = manhattan(o.pos, target);
      if (dd < best) {
        best = dd;
        pick = o;
      }
    }
  }
  g.x = pick.pos.x;
  g.y = pick.pos.y;
  g.dir = pick.d;
}

export function checkCaught(s) {
  return s.ghosts.findIndex((g) => g.x === s.pac.x && g.y === s.pac.y);
}

export function isCleared(s) {
  return s.pellets.size === 0 && s.powers.size === 0;
}

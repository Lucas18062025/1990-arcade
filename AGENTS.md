# AGENTS.md — antigravity-arcade

> Gana a global ante conflicto.

## Idioma
- Español (es-AR). Código en inglés.

## Proyecto
- Colección mixta de minijuegos web retro. Hub + 4 juegos.
- Stack: Vite 6 + JS vanilla + Tailwind CSS v4 + localStorage.
- Rutas: `index.html` (hub), `src/main.js`, `src/style.css`, `games/<juego>/`.

## Flujo
1. Entender: leer archivos antes de tocar.
2. Prototipar en sandbox si es riesgoso, verificar con usuario.
3. Ediciones mínimas y precisas.
4. Verificar con ejecución real y pegar evidencia.

## Comandos
- `npm install` — instalar (solo con aprobación)
- `npm run dev` — dev en http://localhost:5173
- `npm run build` — build prod a `dist/`
- `npm run preview` — preview build

## Git
- Chico: push directo a `main`.
- Grande: rama `feat/...` o `fix/...` + PR.
- Antes de commit: `git status`, `git diff`, `git log --oneline -10`. Sin secretos.

## Prohibido
- Commitear `node_modules/`, `dist/`, secretos.
- Instalar deps sin aprobación explícita.
- Salir de `antigravity-arcade/` sin permiso.

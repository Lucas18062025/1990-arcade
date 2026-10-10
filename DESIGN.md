# DESIGN.md — antigravity-arcade

Fuente de verdad visual. Todo juego nuevo la respeta.

## Estética
- Arcade retro-neón sobre fondo oscuro. Grilla sutil, glow en títulos.
- Sin imágenes pesadas. CSS + canvas.

## Paleta
- Fondo: `#0a0a1a` / `#12122b`
- Neón primario: `#00f0ff` (cyan)
- Neón secundario: `#ff00e5` (magenta)
- Acento: `#faff00` (amarillo arcade)
- Texto: `#e8e8f0` / muted `#8a8aa3`

## Tipografía
- Títulos: `Press Start 2P` (Google Fonts) con fallback monospace.
- Cuerpo: system-ui / Inter.
- Tamaños: hub title clamp(1.5rem, 5vw, 3rem), cards 1rem.

## Layout hub
- Header centrado: logo + subtítulo.
- Grilla responsive: `repeat(auto-fit, minmax(260px, 1fr))`, gap 1.5rem.
- Card: borde 2px neón, radius 12px, hover scale 1.03 + glow.
- Footer: controles genéricos + versión.

## Juegos
- Cada juego: canvas 400x400 mínimo, HUD score/best, overlay start/game-over, tecla `R` reinicia, `Esc` vuelve al hub.
- Persistencia: `localStorage` key `arcade-best-<juego>`.

## Motion
- Transiciones 150-200ms. Sin libs de animación en Fase 0.

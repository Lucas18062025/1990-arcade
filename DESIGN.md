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
- Texto: `#e8e8f0` / muted `#8a8aa3` (AA sobre fondo)

## Tipografía
- Títulos, botones y tags: `Press Start 2P` (Google Fonts) con fallback monospace.
- Cuerpo (descripciones, ayudas, ranking, hero-sub): system-ui. Press Start no se usa en cuerpo por legibilidad.
- Tamaños: hub title clamp(1.2rem, 4vw, 2.4rem), cards h2 14px, desc 0.9rem, controles 0.75rem, BEST 10px pixel, help/footer 8-9px pixel.

## Layout hub
- Hero centrado: badge + logo + INSERT COIN + hero-sub (1-2 líneas) + CTA Jugar/Ranking + toggle sonido y atajos.
- Grilla responsive: `repeat(auto-fit, minmax(260px, 1fr))`, gap 1.5rem.
- Card: borde 2px neón, radius 4px + chamfer clip-path, hover scale 1.03 + glow, `tabindex=0 role=link` con Enter/Espacio, `:focus-visible` amarillo y `:focus-within` con glow.
- Footer: controles genéricos + versión.

## Juegos
- Cada juego: canvas 400x400 mínimo, HUD score/best, overlay start/game-over, tecla `R` reinicia, `Esc` vuelve al hub.
- Persistencia: `localStorage` key `arcade-best-<juego>`.

## Motion
- Transiciones 150-200ms. Sin libs de animación en Fase 0.

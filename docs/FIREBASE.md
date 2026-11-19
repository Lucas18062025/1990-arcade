# Firebase — configuración reproducible

Este documento describe cómo el proyecto se conecta a Firebase y cómo
reproducir el entorno desde cero. **Ningún paso de este documento se ejecutó
automáticamente**: los que tocan producción requieren intervención manual y
autorización explícita.

## Archivos

| Archivo | Rol |
|---|---|
| `firestore.rules` | Reglas de seguridad: esquema, tipos, UID, juegos y techo por juego |
| `firestore.indexes.json` | Índice compuesto `(game ASC, score DESC)` que usa el ranking |
| `firebase.json` | Configuración de la CLI (reglas, índices, emuladores) |
| `.firebaserc` | Proyecto por defecto: `arcade-1990` |
| `.env.example` | Modo de red y App Check opcional (copiar a `.env.local`) |
| `.env.preview` | Fuerza `off` en el build de `npm run preview` (nunca toca producción) |
| `src/lib/score-contract.js` | Fuente única del contrato: juegos, nombre, techos |
| `src/lib/firebase.js` | Inicialización, auth anónima, selección de entorno |
| `src/lib/scores.js` | Cola de escritura, ranking, manejo de errores |

## Modos de red

`VITE_FIREBASE_MODE` decide a qué backend apunta el cliente:

| Valor | Comportamiento |
|---|---|
| `auto` (por defecto) | Build de producción → proyecto real · `npm run dev` y tests → sin red |
| `off` | Nunca inicializa Firebase; el ranking queda vacío y los récords son locales |
| `emulator` | Emuladores locales en `127.0.0.1` (auth 9099, firestore 8080) |
| `remote` | Fuerza el proyecto real incluso en desarrollo (sólo con intención) |

Con `auto` se aplica esta matriz (verificada por `tests/firebase.test.js`):

| Comando | MODE | PROD | host | Red |
|---|---|---|---|---|
| `npm run dev` | development | false | localhost | **off** |
| `npm test` | test | false | localhost | **off** |
| `npm run preview` | preview | true | localhost | **off** |
| `npm run build` (Pages) | production | true | 1990-arcade.pages.dev | remote |
| build de producción servido en localhost | production | true | localhost | **off** |

Dos barreras independientes:

1. `auto` sólo abre la red en un build `production` real.
2. Aunque alguien sirva un build de producción en localhost/127.0.0.1, `auto`
   degrada a `off`. Para apuntar al proyecto real desde una máquina local hay
   que escribir `VITE_FIREBASE_MODE=remote` a propósito.

`npm run preview` construye con `--mode preview` y `.env.preview`
(`VITE_FIREBASE_MODE=off`): el artefacto local **no puede** tocar el ranking.

## Persistencia y deduplicación de récords

- La cola se guarda en `localStorage` (`arcade-queue-v1`) **antes** de tocar la
  red: cerrar la pestaña, recargar o perder conexión no pierde el récord.
- Al volver a abrir, la cola se restaura y se reintenta.
- Se escribe el máximo por juego, 6 s después del último récord.
- El ID del documento es determinista: `<uid>_<juego>_<puntaje>`. Un reintento
  tras una recarga apunta al mismo documento, así que **no puede duplicar**.
- Si la escritura falló pero el documento ya existe (otra pestaña ganó la
  carrera), se verifica con una lectura y se da por guardado.
- Reintentos con backoff 6 → 12 → 24 → 48 s; después se detiene hasta el
  próximo récord, el evento `online` o un flush manual.
- Las reglas exigen que el ID coincida con `uid + '_' + game + '_' + score`.

## Flujo local con emuladores

```bash
npm i -g firebase-tools        # una vez
firebase login                 # una vez
npm run firebase:emulators     # auth + firestore en local
VITE_FIREBASE_MODE=emulator npm run dev
```

## Publicar reglas e índices (manual, requiere autorización)

```bash
# 1. Verificar el diff de reglas antes de publicar
firebase deploy --only firestore:rules --dry-run

# 2. Publicar
npm run firebase:rules
```

Antes de publicar hay que confirmar en la consola:

1. **Auth anónima habilitada** (Authentication → Sign-in method → Anonymous).
   Si está deshabilitada, `getFirebase()` devuelve `null` y **no se guarda
   ningún récord**: el cliente lo avisa con un toast y conserva el puntaje en
   la cola local.
2. **Reglas publicadas actuales**. Las del repositorio exigen `uid`, por lo que
   rechazan a cualquier cliente viejo que todavía tenga el Service Worker
   anterior. Publicarlas sin desplegar el cliente nuevo primero deja el ranking
   sin escrituras.
3. **Índice compuesto** desplegado (`firestore:indexes`). Sin él, la consulta
   por juego cae al fallback (ordena en cliente sobre `limit(n*4)`).

Orden recomendado de una publicación real:

```
1. Habilitar auth anónima
2. Deploy del cliente nuevo (Cloudflare Pages)
3. Verificar en la consola que llegan documentos con uid
4. Publicar reglas + índices
5. Verificar lectura del ranking y una escritura de prueba controlada
```

## Contrato de escritura

El cliente escribe exactamente:

```js
{ game, name, score, at: serverTimestamp(), uid: auth.uid }
```

Y las reglas exigen:

- `request.auth != null` y `uid == request.auth.uid`
- `keys().hasOnly(['game','name','score','at','uid'])`
- `scoreId == uid + '_' + game + '_' + score` (ID determinista)
- `game` en `snake | breakout | invaders | tetris | pacman`
- `name` string de 1–12 con `^[A-Za-z0-9 _-]+$`
- `score` entero `> 0` y `<= maxScore(game)`
- `at == request.time` (compatible con `serverTimestamp()`)
- `update` y `delete` denegados

Techos por juego (justificados en `score-contract.js` a partir del máximo
legítimo observado en producción el 18/11/2026):

| Juego | Máximo observado | Techo |
|---|---:|---:|
| snake | 130 | 10.000 |
| breakout | 380 | 20.000 |
| invaders | 1.260 | 20.000 |
| pacman | 2.060 | 20.000 |
| tetris | 6.100 | 50.000 |

`tests/score-contract.test.js` falla si el cliente y las reglas se
desincronizan (techos, whitelist, nombre, campos, UID).

## Datos históricos

Los 136 documentos existentes (18/11/2026) **no tienen `uid`**. Las reglas no
validan documentos ya escritos, así que siguen siendo visibles en el ranking.
Sólo las escrituras nuevas exigen autenticación.

## Limitaciones de seguridad (explícitas)

- **La auth anónima no valida la legitimidad del puntaje.** Demuestra que el
  documento lo escribe un usuario del proyecto y que el `uid` coincide con el
  token, pero un cliente modificado puede enviar cualquier `score` dentro del
  techo. Los topes por juego acotan el daño; la defensa real exige validación
  server-side (Cloud Functions) o App Check con atestación, que hoy no existen.
- **La lectura del ranking es pública a propósito.** Es el producto: exigir auth
  para leer rompería el hub para quien todavía no jugó. El costo es que el `uid`
  anónimo de cada documento es visible por API.
- **No hay proyecto de staging**: el build de producción y cualquier
  `VITE_FIREBASE_MODE=remote` apuntan al mismo `arcade-1990`.
- **App Check no está habilitado.** El cliente lo soporta de forma opcional
  (`VITE_FIREBASE_APPCHECK_KEY`) pero requiere ampliar la CSP con
  `https://www.google.com/recaptcha/`.

## Rollback

- **Reglas**: la consola de Firebase guarda el historial de versiones; se puede
  restaurar la versión anterior desde Firestore → Rules → Historial.
- **Índices**: eliminar el índice compuesto desde la consola (la app cae al
  fallback sin romperse).
- **Cliente**: el deployment anterior de Cloudflare Pages sigue disponible y se
  puede promover desde el panel.
- **Código**: `git revert` del commit de reconciliación; el tag
  `baseline/audit-2026-11-18` marca el estado previo a todos los cambios.

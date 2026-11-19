// ═══════════════════════════════════════════════
// Firebase — inicialización única, auth anónima y política de red.
//
// Aislamiento de entornos (regla de oro):
//
//   npm run dev      → VITE_FIREBASE_MODE=auto + development  → off
//   npm test         → auto + test                            → off
//   npm run preview  → auto + preview                         → off
//   npm run build    → auto + production en Pages             → remote
//
// Además, un build de producción servido en localhost/127.0.0.1 tampoco
// abre la red: `auto` degrada a `off` en hosts locales. Para apuntar al
// proyecto real desde local hay que pedirlo explícitamente con
// VITE_FIREBASE_MODE=remote (o =emulator para los emuladores).
//
// La configuración Web de Firebase es pública por diseño (viaja en el
// bundle), pero la escritura está protegida por reglas + auth anónima.
// ═══════════════════════════════════════════════

const APP_URL = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
const AUTH_URL = "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
const FS_URL = "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
const APPCHECK_URL = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBySkD2XAPoF6G668PxFlES1G5wFXCzk2A",
  authDomain: "arcade-1990.firebaseapp.com",
  projectId: "arcade-1990",
  storageBucket: "arcade-1990.firebasestorage.app",
  messagingSenderId: "1096332651278",
  appId: "1:1096332651278:web:0ae9b7a68babefa8bf855f",
};

export const EMULATOR = Object.freeze({
  host: "127.0.0.1",
  firestorePort: 8080,
  authPort: 9099,
});

const VALID_MODES = ["auto", "off", "emulator", "remote"];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0", ""]);

function isLocalHost(hostname) {
  return LOCAL_HOSTS.has(String(hostname || "").toLowerCase());
}

/**
 * Resuelve el modo de red. Función pura para poder testear todas las
 * combinaciones de entorno sin tocar `import.meta.env`.
 *
 * @param {object} [options]
 * @param {string} [options.requested] VITE_FIREBASE_MODE
 * @param {boolean} [options.isProd]   import.meta.env.PROD
 * @param {string} [options.mode]      import.meta.env.MODE
 * @param {string} [options.hostname]  location.hostname
 * @returns {"off"|"emulator"|"remote"}
 */
export function resolveNetworkMode({ requested = "auto", isProd = false, mode = "development", hostname = "" } = {}) {
  const clean = String(requested || "auto").toLowerCase();
  const chosen = VALID_MODES.includes(clean) ? clean : "auto";

  // Un pedido explícito manda, incluso en local (es la única forma de
  // apuntar a producción a propósito desde una máquina de desarrollo).
  if (chosen === "off" || chosen === "emulator" || chosen === "remote") return chosen;

  // `auto`: sólo un build de producción real, servido fuera de localhost.
  if (!isProd || mode !== "production") return "off";
  if (isLocalHost(hostname)) return "off";
  return "remote";
}

/** Modo de red efectivo en este runtime. */
export function networkMode() {
  const env = import.meta.env || {};
  const hostname = typeof location !== "undefined" ? location.hostname : "";
  return resolveNetworkMode({
    requested: env.VITE_FIREBASE_MODE,
    isProd: Boolean(env.PROD),
    mode: env.MODE,
    hostname,
  });
}

/** ¿Hay que inicializar red? */
export function networkEnabled() {
  return networkMode() !== "off";
}

/**
 * Campos mínimos para que el SDK pueda inicializarse. Evita arrancar con
 * una configuración incompleta y fallar de forma opaca más adelante.
 * @param {object} [cfg]
 * @returns {string[]} lista de campos faltantes (vacía = OK)
 */
export function configIssues(cfg = firebaseConfig) {
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  return required.filter((key) => typeof cfg?.[key] !== "string" || cfg[key].trim() === "");
}

let statePromise = null;

/**
 * Inicializa app + auth anónima + firestore una sola vez.
 * @returns {Promise<{db: unknown, uid: string}|null>} null si la red está
 *   deshabilitada, la config está incompleta o la auth anónima falla.
 */
export function getFirebase() {
  if (!networkEnabled()) return Promise.resolve(null);
  if (!statePromise) {
    statePromise = init().catch(() => {
      // No memoizar el fallo: un flush posterior puede reintentar.
      statePromise = null;
      return null;
    });
  }
  return statePromise;
}

async function init() {
  const mode = networkMode();
  const missing = configIssues();
  if (missing.length > 0) {
    console.warn("[arcade] Firebase sin configurar; ranking deshabilitado:", missing.join(", "));
    return null;
  }

  const { initializeApp } = await import(/* @vite-ignore */ APP_URL);
  const app = initializeApp(firebaseConfig);

  const appCheckKey = import.meta.env?.VITE_FIREBASE_APPCHECK_KEY;
  if (appCheckKey) {
    // Opcional: requiere habilitar App Check (reCAPTCHA v3) en Firebase Console
    // y ampliar la CSP con https://www.google.com/recaptcha/ y https://www.gstatic.com.
    try {
      const { initializeAppCheck, ReCaptchaV3Provider } = await import(/* @vite-ignore */ APPCHECK_URL);
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      /* App Check es opcional: si falla, seguimos sin attestation */
    }
  }

  const { getAuth, signInAnonymously, connectAuthEmulator } = await import(/* @vite-ignore */ AUTH_URL);
  const { getFirestore, connectFirestoreEmulator } = await import(/* @vite-ignore */ FS_URL);

  const auth = getAuth(app);
  const db = getFirestore(app);

  if (mode === "emulator") {
    connectAuthEmulator(auth, `http://${EMULATOR.host}:${EMULATOR.authPort}`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMULATOR.host, EMULATOR.firestorePort);
  }

  const cred = await signInAnonymously(auth);
  const uid = cred?.user?.uid || null;
  if (!uid) return null;

  return { db, uid };
}

/** Sólo para tests: descarta el estado memoizado. */
export function __resetFirebaseForTests() {
  statePromise = null;
}

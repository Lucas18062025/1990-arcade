import { checkScoreAchievements } from "./profile.js";

const APP_URL = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
const AUTH_URL = "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
const FS_URL = "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBySkD2XAPoF6G668PxFlES1G5wFXCzk2A",
  authDomain: "arcade-1990.firebaseapp.com",
  projectId: "arcade-1990",
  storageBucket: "arcade-1990.firebasestorage.app",
  messagingSenderId: "1096332651278",
  appId: "1:1096332651278:web:0ae9b7a68babefa8bf855f",
};

const NAME_KEY = "arcade-name";
let dbp = null;
let authUid = null;

function db() {
  if (!dbp) {
    dbp = (async () => {
      const { initializeApp } = await import(/* @vite-ignore */ APP_URL);
      const { getAuth, signInAnonymously } = await import(/* @vite-ignore */ AUTH_URL);
      const app = initializeApp(firebaseConfig);
      // Ranking con auth anónima: sin usuario no hay escritura (firestore.rules).
      try {
        const cred = await signInAnonymously(getAuth(app));
        authUid = cred?.user?.uid || null;
      } catch {
        authUid = null; // sin auth: el ranking queda en modo solo lectura
      }
      const { getFirestore } = await import(/* @vite-ignore */ FS_URL);
      return getFirestore(app);
    })().catch(() => null);
  }
  return dbp;
}

export function playerName() {
  const raw = localStorage.getItem(NAME_KEY) || "ANON";
  return raw.replace(/[^a-zA-Z0-9_\- ]/g, "").toUpperCase().slice(0, 12) || "ANON";
}

export function setPlayerName(n) {
  const clean = String(n || "ANON").replace(/[^a-zA-Z0-9_\- ]/g, "").toUpperCase().slice(0, 12) || "ANON";
  localStorage.setItem(NAME_KEY, clean);
}

// Guarda solo récords; evalúa logros y retos diarios; falla en silencio si no hay red
export async function saveBest(game, score) {
  const VALID_GAMES = ["snake", "breakout", "invaders", "tetris", "pacman"];
  if (!VALID_GAMES.includes(game)) return;
  const cleanScore = Math.floor(Number(score) || 0);
  if (cleanScore <= 0) return;

  try {
    // Evaluar logros asociados a marcas y récord
    checkScoreAchievements(game, score);

    const d = await db();
    if (!d || !authUid) return;
    const { collection, addDoc, serverTimestamp } = await import(/* @vite-ignore */ FS_URL);
    await addDoc(collection(d, "scores"), {
      game,
      name: playerName(),
      score: cleanScore,
      at: serverTimestamp(),
      uid: authUid,
    });
  } catch (err) {
    /* ranking offline: no pasa nada */
    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
      console.warn("[arcade] saveBest error:", err);
    }
  }
}

export async function topScores(n = 5, game = null) {
  try {
    const d = await db();
    if (!d) return [];
    const mod = await import(/* @vite-ignore */ FS_URL);
    const { collection, query, orderBy, limit, getDocs, where } = mod;
    const ref = collection(d, "scores");
    try {
      const q = game
        ? query(ref, where("game", "==", game), orderBy("score", "desc"), limit(n))
        : query(ref, orderBy("score", "desc"), limit(n));
      const snap = await getDocs(q);
      return snap.docs.map((x) => x.data());
    } catch {
      // Sin índice compuesto: fallback sin orderBy + orden local
      if (!game) return [];
      const snap = await getDocs(query(ref, where("game", "==", game), limit(n * 4)));
      return snap.docs
        .map((x) => x.data())
        .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
        .slice(0, n);
    }
  } catch {
    return [];
  }
}

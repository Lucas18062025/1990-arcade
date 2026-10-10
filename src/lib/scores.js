const APP_URL = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
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

function db() {
  if (!dbp) {
    dbp = (async () => {
      const { initializeApp } = await import(/* @vite-ignore */ APP_URL);
      const { getFirestore } = await import(/* @vite-ignore */ FS_URL);
      return getFirestore(initializeApp(firebaseConfig));
    })().catch(() => null);
  }
  return dbp;
}

export function playerName() {
  return (localStorage.getItem(NAME_KEY) || "ANON").toUpperCase().slice(0, 12);
}

export function setPlayerName(n) {
  localStorage.setItem(NAME_KEY, (n || "ANON").toUpperCase().slice(0, 12));
}

// Guarda solo récords; falla en silencio si no hay red (el juego local sigue andando)
export async function saveBest(game, score) {
  try {
    const d = await db();
    if (!d) return;
    const { collection, addDoc, serverTimestamp } = await import(/* @vite-ignore */ FS_URL);
    await addDoc(collection(d, "scores"), {
      game,
      name: playerName(),
      score: Math.floor(score),
      at: serverTimestamp(),
    });
  } catch {
    /* ranking offline: no pasa nada */
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

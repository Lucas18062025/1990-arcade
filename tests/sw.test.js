import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const SW_SOURCE = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
const ORIGIN = "https://1990-arcade.pages.dev";

/** Respuesta mínima compartida por el SW y los tests. */
class FakeResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.statusText = init.statusText ?? "";
    this.ok = this.status >= 200 && this.status < 400;
    this.type = init.type ?? "basic";
    const headers = init.headers || {};
    this._headers = Object.fromEntries(Object.entries(headers).map(([k, v]) => [String(k).toLowerCase(), v]));
    this.headers = {
      get: (name) => this._headers[String(name).toLowerCase()] ?? null,
    };
  }
  clone() {
    return new FakeResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      type: this.type,
      headers: this._headers,
    });
  }
  static error() {
    return new FakeResponse(null, { status: 0, type: "error" });
  }
}

function res(body, status = 200) {
  return new FakeResponse(body, { status });
}

/**
 * Ejecuta public/sw.js en un contexto aislado con un Service Worker falso.
 * Devuelve el harness para disparar eventos y observar el comportamiento real
 * del archivo (no una reimplementación).
 */
function loadServiceWorker() {
  const store = new Map();
  const deleted = [];
  const claimed = [];
  const skipped = [];
  let fetchImpl = async () => res("ok");

  const cache = {
    addAll: async (urls) => {
      for (const url of urls) store.set(url, res("cached"));
    },
    put: async (request, response) => {
      store.set(typeof request === "string" ? request : request.url, response);
    },
    match: async (request) => store.get(typeof request === "string" ? request : request.url),
  };

  const listeners = {};
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
    skipWaiting: async () => skipped.push(true),
    clients: { claim: async () => claimed.push(true) },
  };

  const context = vm.createContext({
    self,
    caches: {
      open: async () => cache,
      keys: async () => ["arcade-v1", "arcade-v3", "otra"],
      delete: async (key) => {
        deleted.push(key);
        return true;
      },
      match: async (request) => cache.match(request),
    },
    fetch: (...args) => fetchImpl(...args),
    Response: FakeResponse,
    URL,
    console,
  });
  vm.runInContext(SW_SOURCE, context);

  /** Ejecuta el handler y devuelve qué respondió (o null si lo ignoró). */
  async function dispatch(type, event) {
    let responded = null;
    event.respondWith = (value) => {
      responded = value;
    };
    event.waitUntil = (value) => {
      event._waited = value;
    };
    listeners[type](event);
    return responded;
  }

  return {
    store,
    deleted,
    claimed,
    skipped,
    dispatch,
    setFetch(fn) {
      fetchImpl = fn;
    },
  };
}

function request(url, mode = "no-cors", method = "GET") {
  return { url, mode, method };
}

let sw;

beforeEach(() => {
  sw = loadServiceWorker();
});

describe("Service Worker — estrategia de caché", () => {
  it("instala la versión actual y precachea el shell", async () => {
    const event = { type: "install" };
    await sw.dispatch("install", event);
    await event._waited;

    expect(SW_SOURCE).toContain('const CACHE = "arcade-v3"');
    for (const asset of ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/shot-hub.png"]) {
      expect(sw.store.has(asset), `falta ${asset} en el precache`).toBe(true);
    }
    expect(sw.skipped).toHaveLength(1);
  });

  it("al activarse borra las cachés viejas y toma el control", async () => {
    const event = { type: "activate" };
    await sw.dispatch("activate", event);
    await event._waited;

    expect(sw.deleted).toContain("arcade-v1");
    expect(sw.deleted).toContain("otra");
    expect(sw.deleted).not.toContain("arcade-v3");
    expect(sw.claimed).toHaveLength(1);
  });

  it("ignora métodos que no son GET", async () => {
    const response = await sw.dispatch("fetch", { request: request(`${ORIGIN}/scores`, "cors", "POST") });
    expect(response).toBeNull();
  });

  it("ignora cross-origin (Firestore, fuentes) y no lo cachea", async () => {
    const response = await sw.dispatch("fetch", {
      request: request("https://firestore.googleapis.com/v1/projects/arcade-1990", "cors"),
    });
    expect(response).toBeNull();
    expect(sw.store.size).toBe(0);
  });

  it("navegación: network-first y cachea el HTML nuevo", async () => {
    sw.setFetch(async () => res("<html>nuevo</html>"));
    const response = await sw.dispatch("fetch", { request: request(`${ORIGIN}/#/snake`, "navigate") });

    expect(response.status).toBe(200);
    expect(response.body).toBe("<html>nuevo</html>");
    expect(sw.store.has(`${ORIGIN}/#/snake`)).toBe(true);
  });

  it("navegación sin red: devuelve el shell cacheado", async () => {
    sw.store.set("/", res("<html>shell</html>"));
    sw.setFetch(async () => {
      throw new Error("offline");
    });
    const response = await sw.dispatch("fetch", { request: request(`${ORIGIN}/#/tetris`, "navigate") });

    expect(response.body).toBe("<html>shell</html>");
  });

  it("asset faltante sin red: 504, nunca el HTML del shell", async () => {
    sw.store.set("/", res("<html>shell</html>"));
    sw.setFetch(async () => {
      throw new Error("offline");
    });
    const response = await sw.dispatch("fetch", {
      request: request(`${ORIGIN}/assets/index-viejo.js`, "no-cors"),
    });

    expect(response.status).toBe(504);
    expect(response.body).toBe("");
  });

  it("asset en caché: cache-first (no toca la red)", async () => {
    sw.store.set(`${ORIGIN}/assets/index-abc.js`, res("js"));
    let called = 0;
    sw.setFetch(async () => {
      called++;
      return res("red");
    });
    const response = await sw.dispatch("fetch", {
      request: request(`${ORIGIN}/assets/index-abc.js`, "no-cors"),
    });

    expect(response.body).toBe("js");
    expect(called).toBe(0);
  });

  it("asset inexistente que devuelve HTML (fallback SPA): 504 y no se cachea", async () => {
    const requestObj = request(`${ORIGIN}/assets/index-viejo.js`, "no-cors");
    // El fallback de Cloudflare Pages responde 200 con text/html.
    sw.setFetch(async () => new FakeResponse("<!doctype html>", { status: 200, headers: { "content-type": "text/html" } }));

    const response = await sw.dispatch("fetch", { request: requestObj });

    expect(response.status).toBe(504);
    expect(sw.store.has(requestObj.url)).toBe(false);
  });

  it("un JSON con content-type correcto sí se sirve", async () => {
    sw.setFetch(async () => new FakeResponse("{}", { status: 200, headers: { "content-type": "application/json" } }));
    const response = await sw.dispatch("fetch", { request: request(`${ORIGIN}/manifest.json`, "no-cors") });

    expect(response.status).toBe(200);
    expect(response.body).toBe("{}");
  });
});

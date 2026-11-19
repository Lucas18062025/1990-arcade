import { describe, it, expect } from "vitest";
import { resolveNetworkMode, configIssues, firebaseConfig } from "../src/lib/firebase.js";

const PROD_HOST = "1990-arcade.pages.dev";

describe("Aislamiento de Firebase por entorno", () => {
  it("npm run dev (development, localhost) no abre la red", () => {
    const mode = resolveNetworkMode({ requested: "auto", isProd: false, mode: "development", hostname: "localhost" });
    expect(mode).toBe("off");
  });

  it("npm test (test, localhost) no abre la red", () => {
    const mode = resolveNetworkMode({ requested: "auto", isProd: false, mode: "test", hostname: "localhost" });
    expect(mode).toBe("off");
  });

  it("npm run preview (preview, localhost) no abre la red", () => {
    const mode = resolveNetworkMode({ requested: "auto", isProd: true, mode: "preview", hostname: "localhost" });
    expect(mode).toBe("off");
  });

  it("un build de producción servido en localhost tampoco abre la red", () => {
    for (const host of ["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]) {
      expect(resolveNetworkMode({ requested: "auto", isProd: true, mode: "production", hostname: host })).toBe("off");
    }
  });

  it("un build de producción en el dominio real sí abre la red", () => {
    expect(resolveNetworkMode({ requested: "auto", isProd: true, mode: "production", hostname: PROD_HOST })).toBe("remote");
  });

  it("remote explícito es la única vía para tocar producción desde local", () => {
    expect(resolveNetworkMode({ requested: "remote", isProd: false, mode: "development", hostname: "localhost" })).toBe(
      "remote"
    );
  });

  it("emulator apunta a los emuladores en cualquier entorno", () => {
    expect(resolveNetworkMode({ requested: "emulator", isProd: true, mode: "production", hostname: PROD_HOST })).toBe(
      "emulator"
    );
  });

  it("off gana incluso en producción", () => {
    expect(resolveNetworkMode({ requested: "off", isProd: true, mode: "production", hostname: PROD_HOST })).toBe("off");
  });

  it("un valor inválido cae a auto (nunca a remote por accidente)", () => {
    expect(resolveNetworkMode({ requested: "remot", isProd: false, mode: "development", hostname: "localhost" })).toBe(
      "off"
    );
    expect(resolveNetworkMode({ requested: "yes", isProd: true, mode: "production", hostname: PROD_HOST })).toBe("remote");
  });
});

describe("Validación de configuración", () => {
  it("la configuración del proyecto está completa", () => {
    expect(configIssues()).toEqual([]);
  });

  it("detecta campos faltantes o vacíos", () => {
    expect(configIssues({ apiKey: "", authDomain: "x", projectId: "p", appId: "a" })).toEqual(["apiKey"]);
    expect(configIssues({})).toEqual(["apiKey", "authDomain", "projectId", "appId"]);
  });

  it("una config incompleta nunca habilita la red", () => {
    // getFirebase() valida antes de inicializar el SDK; el contrato se prueba
    // acá de forma aislada para no depender de la red.
    expect(configIssues({ apiKey: firebaseConfig.apiKey })).toContain("projectId");
  });
});

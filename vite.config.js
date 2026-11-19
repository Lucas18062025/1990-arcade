import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";

// La versión sale de package.json: una sola fuente de verdad (antes había
// un fallback hardcodeado en 0.3.0 mientras el paquete decía 0.4.0).
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  plugins: [tailwindcss()],
  server: { port: 5173, strictPort: true },
  define: { __APP_VERSION: JSON.stringify(pkg.version) },
});

import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  server: { port: 5173, strictPort: true },
  define: { __APP_VERSION: JSON.stringify(process.env.npm_package_version ?? "0.3.0") },
});

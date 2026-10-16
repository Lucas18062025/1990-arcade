import js from "@eslint/js";
import globals from "globals";

// Flat config (ESLint 9). Reemplaza a .eslintrc.cjs.
// Sin plugin prettier: no es dependencia del proyecto.
export default [
  { ignores: ["dist/**"] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        __APP_VERSION: "readonly", // inyectado por vite define
      },
    },
  },
  {
    // Tests con globals de Vitest (vitest.config usa globals:true)
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        vi: "readonly",
      },
    },
  },
];

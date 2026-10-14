# Contribución

### Buenas prácticas
- Usa **commits con formato conventional** (`feat:`, `fix:`, `docs:` …).
- Mantén la rama `main` protegida; trabaja siempre en ramas cortas y abre PRs.
- Ejecuta `npm run lint` y `npm run test` antes de push.
- No agregues archivos de configuración sensibles al repositorio.

### Herramientas
- **ESLint** para mantener calidad de código.
- **Vitest** para pruebas unitarias.
- **GitHub Actions** ejecuta lint, test y build en cada PR.

### Flujo de trabajo típico
```bash
# crea rama
git checkout -b feat/nueva-funcionalidad

# instala dependencias (solo la primera vez)
npm install

# corre linter y tests
npm run lint
npm run test

# commit y push
git add .
git commit -m "feat: descripción corta"
git push -u origin feat/nueva-funcionalidad

# abre PR en GitHub
```

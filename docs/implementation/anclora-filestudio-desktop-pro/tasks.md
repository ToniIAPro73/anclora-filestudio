# Desktop PRO Tasks

## Auditoría

- [x] Leer prompt completo.
- [x] Crear rama `feat/desktop-pro-local-complete`.
- [x] Inspeccionar Web/Desktop, motores, diagnóstico, jobs, portables y tests.
- [x] Documentar baseline antes de implementar.

## Implementación

- [ ] Crear matriz `src/lib/capabilities/**`.
- [ ] Añadir shell Desktop PRO por tareas.
- [ ] Reutilizar herramientas Web en Desktop sin modificar modo Vercel.
- [ ] Mejorar diagnóstico con grupos y funciones habilitadas.
- [ ] Documentar matriz Web vs Desktop y portables.
- [ ] Añadir tests de runtime/capabilities/Desktop PRO.

## Validación

- [ ] `git diff --check`
- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:vercel`
- [ ] `pnpm build:vercel`
- [ ] `pnpm verify:vercel`
- [ ] `pnpm build:desktop`
- [ ] Portables Linux
- [ ] Portables Windows
- [ ] Acceptance compare
- [ ] Preview Vercel

## Reglas

- [ ] Web intacta.
- [ ] No Production.
- [ ] No GitHub Release.
- [ ] No auto-merge.

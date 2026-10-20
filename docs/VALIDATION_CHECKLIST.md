# Checklist de validación — fix de ci-security (pnpm audit --prod)

**Alcance:** el job `ci-security` fallaba con 10 vulnerabilidades en dependencias de producción. Se actualizan `next` 16.3.4 → 16.3.8, `sharp` 0.35.4 → 0.35.5 (raíz, `apps/worker`, `apps/local-agent` y override), `smol-toml` → ^1.9.0 (lock 1.9.1) y se añade el override `source-map-js` ^1.2.2.

## Comprobaciones ejecutadas

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Auditoría de producción | `pnpm audit --prod` | PASS — sin vulnerabilidades conocidas |
| Licencias | `pnpm run audit:licenses` | PASS — 0 errores, 3 avisos |
| Typecheck | `npx tsc --noEmit` | PASS |

## Verificación de GitHub

Se comprobará el resultado de CI tras el push a `development`.

## Verificación visual

No aplica: solo actualización de dependencias sin cambios de interfaz.

## Promoción

No solicitada en este cambio.

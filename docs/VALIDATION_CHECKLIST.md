# Checklist de validación — eficiencia de CI (2026-10-23)

**Repositorio:** anclora-filestudio

**Rama base:** `development` @ `d6755e5`

**Estado:** cambios locales sin commit; pendientes de revisión expresa de Toni en desarrollo.

## Cambios

- El clasificador separa código de aplicación de cambios bajo `.github/workflows/**`. Si solo cambia configuración de workflows o documentación, ejecuta `ci-config` con actionlint y omite los jobs de aplicación. Si no puede determinar el diff, activa ambos grupos de comprobaciones.
- `ci-integration` conserva `pnpm test` para mantener toda la cobertura de Vitest. `ci-core` ejecuta además su configuración específica; no se reduce la cobertura como parte de este cambio.
- Se cachea el Chromium runtime instalado por `install-chromium-runtime.mjs`, con clave por Ubuntu 24.04, arquitectura y `scripts/toolchain.lock.json`. La caché apt también incorpora explícitamente Ubuntu 24.04 en la clave.
- La instalación de dependencias Linux continúa siendo necesaria en una cache miss; el script vuelve a instalar y comprobar las herramientas y no se omiten tests.

## Evidencia recopilada

| Comprobación | Resultado |
| --- | --- |
| En el push `d6755e5`, `changes` marcó los archivos como código porque `.github/workflows/ci.yml` no estaba excluido | Confirmado en el clasificador vigente en ese SHA |
| Run `40019449827`: jobs de seguridad, core, service, local-agent, contracts y docker | Completados correctamente; el push documental/workflow lanzó los jobs de aplicación |
| Run `40019449827`: `ci-integration` | Aún en `Install Linux integration test toolchain` tras 43 minutos; `pnpm test` seguía pendiente |
| Cobertura del job `ci-integration` | Mantiene el comando original `pnpm test`; el cambio no excluye suites de Vitest |
| `install-chromium-runtime.mjs` | Escribe en `~/.local/share/anclora-filestudio/runtime-packs/chromium-runtime` y comprueba el runtime restaurado antes de salir |
| Tests o lint ejecutados por el agente para este diff | Ninguno; esperando revisión de Toni |

## Límites

- No se canceló el workflow `40019449827`.
- El primer cache miss aún instala paquetes Linux y descarga Chromium; la caché acelera ejecuciones posteriores.
- El siguiente push debe mostrar `ci-config` y omitir los jobs de aplicación para cambios solo de workflow/documentación. No se ha observado esa ejecución con estos cambios locales.

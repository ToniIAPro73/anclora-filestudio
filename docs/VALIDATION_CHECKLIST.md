# Checklist de validación — cambios de FileStudio

**Repositorio:** anclora-filestudio

**Rama:** `development`

**Commits incluidos:** `3abe91f` (worker remoto YouTube), `c5a5537` (optimización CI)

**Autorización de Toni:** solicitó expresamente el push a `development`.

## Alcance

- Conversión YouTube Desktop/local a través de la API privada de Vercel y el worker HTTPS protegido del VPS.
- Procesamiento con yt-dlp/FFmpeg, BullMQ/Redis, estado en PostgreSQL y artefactos temporales en el volumen privado.
- Streaming de los artefactos directamente desde el VPS al servidor local de Desktop.
- No se pasan cookies del navegador a yt-dlp ni se incluyen credenciales reales en el repositorio.
- CI clasifica cambios documentales para omitir trabajos de código; divide validaciones core e integración y cachea el toolchain de integración.
- No se modificaron recursos VPS, variables protegidas, DNS, bases de datos ni datos de producción.

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| `git diff --check` | PASS |
| Estado de `development` frente a `origin/development` antes del push | 2 commits ahead, 0 behind; árbol limpio |
| Tests, lint y build en esta sesión | NOT_RUN |
| Revisión de patrones de secretos en los nuevos archivos de servicio | PASS; no se encontraron valores con formato de credencial |

## Seguimiento

- [x] Toni autorizó el push a `origin/development`.
- [ ] Revisar el Preview resultante.
- [ ] La configuración de secretos y el rollout de infraestructura quedan para su etapa autorizada separada.

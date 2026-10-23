# Checklist de validación — arquitectura YouTube remota

**Repositorio:** anclora-filestudio
**Cambio incluido:** actualización de `.anclora/PRODUCTION_RUNTIME.md` para registrar la arquitectura autorizada de conversión remota de YouTube desde Desktop/local.
**Rama:** `development`
**Autorización de Toni:** autorizó expresamente esta actualización y el commit/push.

## Alcance

- Se documentan el flujo Desktop → API privada de Vercel → worker HTTPS en VPS, procesamiento con yt-dlp/FFmpeg y cola BullMQ/Redis.
- Se documentan el almacenamiento dedicado de estado en PostgreSQL, artefactos temporales en volumen privado y streaming directo VPS → Desktop.
- Se registran límites, variables de entorno necesarias y controles de cookies y secretos.
- El contrato indica que el código está en preparación local y que infraestructura, secretos y despliegue aún no están configurados.
- Este commit contiene solo el contrato y este checklist; no incluye los demás cambios locales del árbol de trabajo.

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| Revisión del contrato existente y de los límites de arquitectura indicados por Toni | PASS |
| `git diff --check` | PASS |
| Tests, lint y build | NOT_RUN — cambio documental; no solicitados |
| Cambios en Vercel, VPS, base de datos, DNS o datos de producción | Ninguno |

## Seguimiento

- [x] Autorizado por Toni para commit y push a `development`.
- [ ] Revisar el contrato publicado en `development`.
- [ ] La configuración y el rollout de infraestructura requieren su etapa y validación separadas.

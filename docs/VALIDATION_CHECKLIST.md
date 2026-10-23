# Checklist de validación — Conversión remota de YouTube a MP4/MP3 en Desktop (2026-10-23)

> Este fichero se sobrescribe en cada entrega. El historial queda en Git.

**Repositorio:** anclora-filestudio
**Rama y commit:** development @ 688073a (cambios locales sin commit)
**Entorno de validación:** no hay vista previa de Vercel ni VPS configurados para este flujo (infraestructura sin desplegar) · runtime local
**Datos:** ficticios (declaración de Toni). Cuenta: ninguna en esta fase; el end-to-end remoto usará la credencial de servicio del contrato (`ANCLORA_FILESTUDIO_API_KEY` / tokens de servidor), nunca la cuenta personal de Toni

## 1. Qué cambia
- Validación estricta de URL en el worker: solo `https`, hosts YouTube fijos, sin credenciales ni puerto, y rutas `watch?v=`, `/live/`, `/shorts/`, `/embed/`, `youtu.be/<id>` (el caso `/live/5HaOxAAA5qI` se normaliza).
- Errores clasificados y estables (acceso anónimo bloqueado, no disponible, timeout, archivo demasiado grande, fallo genérico) y nunca presentados como error de cookies; sin stderr crudo en el estado del trabajo.
- Worker: yt-dlp con `spawn` sin shell, `--ignore-config`, `--no-cache-dir`, `--max-filesize 4G`, timeout de 12 h y cancelación que termina el grupo de procesos; un trabajo cancelado en cola no se ejecuta; límite de 20 trabajos activos; limpieza de artefactos y parciales; contención de rutas con `relative` (antes `startsWith`).
- Descarga: 410 `ARTIFACT_EXPIRED` si el archivo ya no existe; streaming con `pipeline`; Desktop propaga la cancelación al VPS.
- Ruta de Vercel: tabla de métodos/rutas (metadatos y estado solamente, `/file` nunca pasa por Vercel), errores con código para configuración ausente, no HTTPS y timeout.
- Cliente Desktop: fallos de red/configuración devuelven JSON con código en lugar de lanzar excepción.
- **Corrección de regresión:** el commit previo importaba `server-only` (no instalado) y rompía 9 tests de `inputs-analyze-youtube-route`; eliminado.
- **Corrección de despliegue VPS:** el worker estaba solo en la red `internal: true` (sin salida a YouTube); ahora también en `public` sin publicar puertos. `/data` pasa a ser propiedad del usuario 1001 en la imagen.
- Caddy: `response_header_timeout` 100 s (antes 60 s cortaba metadatos lentos).
- Contrato `.anclora/PRODUCTION_RUNTIME.md`, decisión de producto y guía VPS actualizados (runtime actual vs. objetivo, límites, activación paso a paso, cómo actualizar yt-dlp).

## 2. Ya comprobado por el agente
| Comprobación | Comando o método | Resultado | SHA |
| --- | --- | --- | --- |
| Typecheck raíz | `pnpm typecheck` | PASS | 688073a + local |
| Typecheck worker | `pnpm --filter @anclora/filestudio-worker typecheck` | PASS | 688073a + local |
| Lint | `pnpm lint` | PASS | 688073a + local |
| Tests del worker (51: URL, clasificación, servicio HTTP, contención de rutas, ejecutor con yt-dlp/ffmpeg simulados: args, mp3, timeout, cancelación) | `pnpm --filter @anclora/filestudio-worker test` | PASS | 688073a + local |
| Proxy Vercel y cliente Desktop (token HMAC, errores con código, métodos, sin `/file`) | `pnpm vitest run tests/unit/youtube-remote-proxy.test.ts` | PASS | 688073a + local |
| Suite completa raíz | `pnpm test` | 1315 PASS / 10 FAIL: solo `tests/integration/html-renderer-engine.test.ts` (probe de Chromium no disponible en esta máquina; ajeno a este cambio) | 688073a + local |
| Build modo Vercel (ruta `/api/youtube-service/[...segments]` compilada) | `pnpm build:vercel` | PASS | 688073a + local |
| Compose del VPS con variables marcador | `docker compose -f deploy/vps/compose.yml config -q` | PASS | 688073a + local |
| Espacios en blanco del diff | `git diff --check` | PASS | 688073a + local |

## 3. Pruebas no ejecutadas (NOT_RUN)
| Prueba | Motivo concreto |
| --- | --- |
| End-to-end real: metadatos, MP4 y MP3 con yt-dlp contra YouTube | VPS, Vercel, PostgreSQL y Redis dedicados no están desplegados ni configurados; no se inventan credenciales |
| URL de referencia `https://www.youtube.com/live/5HaOxAAA5qI?si=rzBuBLnotx8Yzn7q` | Sin infraestructura y sin confirmación verificable de que quien pide la prueba tiene autorización para guardar ese contenido. No se afirma éxito; solo se verificó que la URL se normaliza |
| Build de la imagen Docker del worker y verificación de `yt-dlp==2026.7.4` | No se construyó la imagen (requiere red/registro y es parte del despliegue); la versión coincide con `scripts/toolchain.lock.json` |
| Integración real PostgreSQL/BullMQ del servicio (cola, `youtube_jobs`, limpieza horaria) | Requiere los servicios dedicados; el servicio se probó con base de datos y cola simuladas solo en las rutas de rechazo |
| QA visual (`agent-browser`) | No hay cambios de interfaz; el flujo en pantalla depende del servicio remoto no desplegado |

## 4. Checklist para validar en la aplicación
Marca cada punto. Un fallo en un punto marcado **[BLOQUEANTE]** impide promocionar. Los puntos 4-8 requieren activar antes el servicio remoto (ver `docs/implementation/anclora-filestudio-service-api/deployment-vps.md`).

| # | Dónde | Pasos | Resultado esperado | Cuenta o configuración | Bloqueante |
| --- | --- | --- | --- | --- | --- |
| 1 | Desktop local, pantalla de URL | 1. Sin variables remotas, pegar `https://youtu.be/<id de prueba autorizado>`. 2. Analizar | Usa el camino local anterior, sin cambios de comportamiento | Sin `ANCLORA_FILESTUDIO_REMOTE_*` | Sí |
| 2 | Vercel Web (vista previa) | Intentar convertir vídeo/audio desde una URL | Sigue respondiendo "requiere Desktop"; ninguna conversión de vídeo/audio en Vercel Web | Entorno Vercel Web | Sí |
| 3 | `POST /api/youtube-service/v1/youtube/metadata` en Vercel sin cabecera | Llamar sin `Authorization` | 401; con token pero sin `YOUTUBE_WORKER_*` → 503 `REMOTE_YOUTUBE_NOT_CONFIGURED` | Sin secretos en Vercel | Sí |
| 4 | Desktop con variables remotas, analizar | Pegar un enlace `/live/<id>` de un recurso autorizado | Título, canal y calidades; sin límite local de 2 h | Tokens de servicio de QA | Sí |
| 5 | Desktop, convertir a MP4 y MP3 | Elegir formato y calidad, iniciar | Estados queued → downloading → completed; descarga de un MP4/MP3 reproducible | Tokens de servicio de QA | Sí |
| 6 | Desktop, cancelar | Iniciar y cancelar mientras descarga | Estado `cancelled`; el proceso yt-dlp desaparece en el VPS (`docker compose exec worker ps`); no queda archivo | Tokens de servicio de QA | Sí |
| 7 | Red | Durante la descarga, comprobar en los logs de Vercel que no hay tráfico de medios | Los bytes del MP4/MP3 solo van VPS → Desktop | Acceso a logs de Vercel | Sí |
| 8 | VPS | `curl https://<vps>/worker/health` y otra ruta sin token | `{"ok":true}` y 401 respectivamente; el puerto 8081 no es accesible desde fuera | Acceso al VPS | Sí |

### Casos negativos y de borde
| # | Caso | Resultado esperado |
| --- | --- | --- |
| 1 | URL no YouTube o con host parecido (`youtube.com.evil.example`) | Rechazada con `INVALID_URL`; nunca se llama a yt-dlp |
| 2 | Vídeo privado, eliminado o con restricción regional | `YOUTUBE_UNAVAILABLE` con mensaje claro |
| 3 | YouTube bloquea el acceso anónimo | `YOUTUBE_ANONYMOUS_ACCESS_BLOCKED`, sin pedir cookies |
| 4 | Servicio remoto caído o con timeout | `REMOTE_WORKER_UNAVAILABLE` / `REMOTE_WORKER_TIMEOUT` |
| 5 | Descarga tras 24 h del estado terminal | 404/410 `ARTIFACT_EXPIRED` |
| 6 | Más de 20 trabajos activos | 429 `QUEUE_FULL` |

### Estados de interfaz afectados
- [ ] Vacío · [ ] Cargando · [x] Error · [x] Éxito · [ ] Móvil · [x] Escritorio · [ ] Modo oscuro

## 5. Riesgos y limitaciones
- **Sin garantía de extracción anónima:** YouTube puede bloquear IP de centros de datos, exigir PO token o un solucionador de desafíos JS, o restringir un vídeo. No se añadió ningún mecanismo de evasión (p. ej. runtime JS para desafíos); si hace falta, es una decisión separada.
- Esquema de token compartido: válido solo para una instalación controlada. Un Desktop distribuible requiere credenciales por usuario o enrolamiento; no empaquetar tokens en instaladores.
- Desktop conserva el token del worker (descarga directa), por lo que tiene control completo del worker.
- Cancelación y progreso: una sola réplica de worker; el progreso es grueso (sin porcentaje real).
- `--max-filesize 4G` puede no aplicarse a flujos de tamaño desconocido; el disco del VPS debe vigilarse.
- Pendiente de infraestructura (no hecho, fuera de alcance): secretos, variables de Vercel, DNS/dominio del VPS, `docker compose up`, QA end-to-end con recurso autorizado.
- No hubo despliegues, cambios externos, commits ni pushes en esta entrega.

## 6. Decisión de Toni
- [ ] Todos los puntos bloqueantes pasan
- [ ] Se promociona: escribir `PROMOTE=FULL` (staging → production → main)
- [ ] No se promociona. Motivo: ______________________

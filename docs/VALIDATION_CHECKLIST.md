# Checklist de validación — Corrección del job ci-docker (2026-10-23)

> Este fichero se sobrescribe en cada entrega. El historial queda en Git.

**Repositorio:** anclora-filestudio
**Rama:** development (cambio validado sobre `30f3a46`)
**Entorno de validación:** no aplica (cambio solo de workflow de CI; sin vista previa) · runtime local
**Datos:** ficticios (declaración de Toni). Cuenta: ninguna; no se usan credenciales reales ni cuentas de QA

## 1. Qué cambia
- `.github/workflows/ci.yml`, job `ci-docker`: define a nivel de job valores ficticios y exclusivos de CI para `DATABASE_URL`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `PUBLIC_BASE_URL`, `JWT_ISSUER` y `YOUTUBE_WORKER_TOKEN` (todas las que interpola `deploy/vps/compose.yml`), válidas para `config` y `build`.
- `docker compose ... config` pasa a `config -q` para no imprimir la configuración interpolada.
- Sin cambios en `compose.yml`, `.env`, GitHub Secrets, Vercel ni VPS.

## 2. Ya comprobado por el agente
| Comprobación | Comando o método | Resultado | SHA |
| --- | --- | --- | --- |
| Compose interpola con las variables ficticias, sin salida | `docker compose -f deploy/vps/compose.yml config -q` con las 6 variables y entorno limpio | PASS (rc=0, sin salida) | 30f3a46 + local |
| Sin variables sigue fallando (confirma que eran necesarias) | mismo comando con `env -i` | FAIL esperado: `YOUTUBE_WORKER_TOKEN is required` | 30f3a46 + local |
| YAML del workflow válido | `python3 -c "yaml.safe_load(...)"` | PASS | 30f3a46 + local |

## 3. Pruebas no ejecutadas (NOT_RUN)
| Prueba | Motivo concreto |
| --- | --- |
| `docker compose build --no-cache` | Construye imágenes completas con descarga de dependencias; se valida al ejecutarse el job en GitHub Actions |
| Ejecución real del job `ci-docker` en Actions | Pendiente de la ejecución automática tras el push; no se espera al workflow |

## 4. Checklist para validar en la aplicación
Marca cada punto. Un fallo en un punto marcado **[BLOQUEANTE]** impide promocionar.

| # | Dónde | Pasos | Resultado esperado | Cuenta o configuración | Bloqueante |
| --- | --- | --- | --- | --- | --- |
| 1 | Diff de `.github/workflows/ci.yml` | Revisar el bloque `env` del job `ci-docker` | Solo valores marcador, ningún secreto real | — | Sí |
| 2 | GitHub Actions tras el push | Ver el job `ci-docker` | `config -q` y `build` pasan sin avisos de variables | — | Sí |

### Casos negativos y de borde
| # | Caso | Resultado esperado |
| --- | --- | --- |
| 1 | Cambio solo documental | `ci-docker` se omite (condición `code == 'true'` intacta) |

### Estados de interfaz afectados
- Ninguno (sin cambios de interfaz).

## 5. Riesgos y limitaciones
- El paso `build` no se probó localmente; podría fallar por motivos ajenos a las variables.
- `PUBLIC_BASE_URL` y `JWT_ISSUER` usan el dominio reservado `.invalid`; solo sirven para interpolar.

## 6. Decisión de Toni
- [ ] Todos los puntos bloqueantes pasan
- [ ] Se promociona: escribir `PROMOTE=FULL` (staging → production → main)
- [ ] No se promociona. Motivo: ______________________

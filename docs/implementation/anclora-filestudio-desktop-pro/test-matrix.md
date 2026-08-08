# Desktop PRO Test Matrix

## Unit

| Área | Cobertura |
| --- | --- |
| Runtime | `vercel-web` no renderiza Desktop PRO; Desktop local sí |
| Capabilities | Web vs Desktop groups, motores requeridos, orden UI |
| Diagnóstico | Mapeo de motores a funciones, acciones Windows/Linux |
| Seguridad | Sin `shell: true`, paths seguros, Vercel sin imports nativos |
| Historial | Jobs persistidos, estados, descargas expiradas |

## Integration

| Área | Cobertura |
| --- | --- |
| Capabilities API | Desktop calcula motores reales; Web devuelve browser metadata |
| Health API | Toolchain y engines diagnosticados |
| Jobs API | Arranque, progreso, cancelación, resultado |
| Batch | Creación, concurrencia, fallos parciales, cancelación |

## Acceptance

| Suite | Comando |
| --- | --- |
| Fixtures | `pnpm test:acceptance:fixtures` |
| Linux portable | `pnpm test:acceptance:linux` |
| Windows portable | `pnpm test:acceptance:windows` |
| Compare | `pnpm test:acceptance:compare` |

## Web Regression

- `pnpm test:vercel`
- `pnpm build:vercel`
- `pnpm verify:vercel`

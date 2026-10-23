# Checklist de validación — lint de workflows (2026-10-23)

**Repositorio:** anclora-filestudio
**Rama:** development
**Commit base:** `b982622`
**Estado:** cambios locales sin commit; pendientes de revisión expresa de Toni.

## Cambios

- `.github/workflows/promote.yml`: se entrecomilla la ruta enviada a `gh api` para evitar expansión y división de palabras en ShellCheck (SC2086).
- `.github/workflows/release-filestudio.yml`: se agrupan las escrituras consecutivas a `GITHUB_ENV` y `GITHUB_OUTPUT` (SC2129).
- Se conservan los avisos y la comprobación global de actionlint; no se omiten reglas ni se limita el lint a un solo workflow.

## Evidencia

| Comprobación | Resultado |
| --- | --- |
| Run `40026522230`, job `ci-config` | Falló en 14 s por 1 aviso SC2086 en `promote.yml` y 2 avisos SC2129 en `release-filestudio.yml`; los demás jobs se omitieron como se esperaba para este cambio |
| Revisión de los bloques señalados | Cambios aplicados en los tres bloques indicados por actionlint/ShellCheck |
| `git diff --check` | PASS |
| Actionlint local | No ejecutado: Docker está instalado, pero su daemon no está disponible (`docker.sock` ausente) |
| Tests | No ejecutados; el cambio solo afecta scripts de workflows |

## Revisión de Toni

- [ ] Revisar el diff en `development`.
- [ ] Autorizar commit y push cuando esté validado.

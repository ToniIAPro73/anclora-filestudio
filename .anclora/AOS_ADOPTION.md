# AOS Adoption Declaration

Declaracion de adopcion AOS para `anclora-filestudio`.

## Metadatos

- Repository Name: anclora-filestudio
- Repository Owner: AOS Chief Architect
- Adoption Status: Adopted
- AOS Version: v0.2.0
- Adoption Date: 2026-08-09
- Last Reviewed: 2026-08-09
- Governance Level: GL-1

## Proposito del repositorio

`anclora-filestudio` es el repositorio de FileStudio: herramienta interna/local-first para conversion, preparacion, validacion y post-proceso de archivos. Mantiene una aplicacion Web/Desktop local madura, una superficie Vercel Web limitada por navegador, una fundacion de Service API/Worker, un Local Agent y paquetes de integracion para consumidores internos como Nexus.

El repositorio esta en migracion incremental hacia una arquitectura distribuida. Esa migracion no esta completa y no existe paridad total de motores entre Web/Desktop, Worker y Local Agent.

## Fuentes AOS referenciadas

Enlaza las fuentes oficiales AOS que gobiernan este repositorio:

- Constitution: [`../../anclora-governance/constitution/README.md`](../../anclora-governance/constitution/README.md)
- MASTER_DECISIONS: [`../../anclora-governance/knowledge/MASTER_DECISIONS.md`](../../anclora-governance/knowledge/MASTER_DECISIONS.md)
- CURRENT_STATE: [`../../anclora-governance/knowledge/CURRENT_STATE.md`](../../anclora-governance/knowledge/CURRENT_STATE.md)
- SOURCE_OF_TRUTH_REGISTRY: [`../../anclora-governance/knowledge/SOURCE_OF_TRUTH_REGISTRY.md`](../../anclora-governance/knowledge/SOURCE_OF_TRUTH_REGISTRY.md)
- Standards: [`../../anclora-governance/standards/README.md`](../../anclora-governance/standards/README.md)
- Playbooks: [`../../anclora-governance/playbooks/README.md`](../../anclora-governance/playbooks/README.md)
- Templates: [`../../anclora-governance/templates/README.md`](../../anclora-governance/templates/README.md)

Autoridad delegada relevante:

- Repository registry y censo canonico de repos: [`../../boveda-anclora/docs/governance/ecosystem-repos.json`](../../boveda-anclora/docs/governance/ecosystem-repos.json)
- Mecanismo CHG para decisiones operacionales OD: [`../../boveda-anclora/docs/cambios/`](../../boveda-anclora/docs/cambios/)
- Contratos de ecosistema aplicables a marca, UX, localizacion y compliance: [`../../boveda-anclora/contracts/`](../../boveda-anclora/contracts/)

## Fuentes oficiales locales

| Tipo de conocimiento | Ruta local | Owner | Relacion con AOS |
| --- | --- | --- | --- |
| Identidad del producto | [`../README.md`](../README.md) | AOS Chief Architect | Fuente local subordinada a AOS y a contratos delegados aplicables. |
| Reglas locales de agentes | [`../AGENTS.md`](../AGENTS.md) | AOS Chief Architect | Fuente local subordinada; enlaza esta declaracion como estado canonico de adopcion. |
| Implementacion Web/Desktop actual | [`../src/`](../src/) | AOS Chief Architect | Fuente tecnica local para la aplicacion Next.js y motores maduros actuales. |
| Service API | [`../apps/api/`](../apps/api/) | AOS Chief Architect | Fuente tecnica local para la API privada de servicio. |
| Worker | [`../apps/worker/`](../apps/worker/) | AOS Chief Architect | Fuente tecnica local para worker de cola; sin paridad completa con Web/Desktop. |
| Local Agent | [`../apps/local-agent/`](../apps/local-agent/) | AOS Chief Architect | Fuente tecnica local para ejecucion autorizada en equipo local. |
| Core compartido | [`../packages/core/`](../packages/core/) | AOS Chief Architect | Contratos y tipos compartidos locales. |
| Engines package | [`../packages/engines/`](../packages/engines/) | AOS Chief Architect | Stub de migracion incremental; no sustituye aun a `src/lib/engines`. |
| SDK | [`../packages/sdk/`](../packages/sdk/) | AOS Chief Architect | SDK TypeScript local para consumidores internos. |
| Integracion Nexus | [`../packages/integrations/anclora-nexus/`](../packages/integrations/anclora-nexus/) | AOS Chief Architect | Paquete local subordinado a contratos de integracion internos. |
| Documentacion de implementacion | [`../docs/implementation/`](../docs/implementation/) | AOS Chief Architect | Historia, diseno y evidencias locales; no reemplaza AOS ni Boveda. |
| Documentacion API | [`../docs/api/`](../docs/api/) | AOS Chief Architect | Contrato tecnico local de API. |
| Documentacion de integraciones | [`../docs/integrations/`](../docs/integrations/) | AOS Chief Architect | Contratos y flujos locales para consumidores internos. |
| QA local | [`../docs/qa/FILESTUDIO_QA_STRATEGY.md`](../docs/qa/FILESTUDIO_QA_STRATEGY.md) | AOS Chief Architect | Estrategia QA local subordinada a AOS; no declara matriz completa como PASS. |
| Fixtures y aceptacion | [`../scripts/acceptance/`](../scripts/acceptance/) | AOS Chief Architect | Infraestructura local reproducible para QA funcional posterior. |
| Decision local pendiente | [`../docs/governance/decision-expose-filestudio-as-product-infra.md`](../docs/governance/decision-expose-filestudio-as-product-infra.md) | AOS Chief Architect | PD pendiente; no resuelta durante esta adopcion. |
| Package metadata | [`../package.json`](../package.json) | AOS Chief Architect | Fuente tecnica local para scripts, workspaces, dependencias y version de paquete. |

## Politica de decisiones locales

Las decisiones de FileStudio se clasifican conforme a [`../../anclora-governance/knowledge/decisions/D-2026-0008.md`](../../anclora-governance/knowledge/decisions/D-2026-0008.md):

- **ED** (ecosistema): fuente canonica en AOS, `MASTER_DECISIONS.md`.
- **OD** (operacional/registry): fuente canonica en el mecanismo CHG de Boveda-Anclora.
- **PD** (producto/ingenieria local): fuente canonica en este repositorio, mediante documentos locales bajo `docs/governance/`, `docs/implementation/`, `docs/api/`, `docs/integrations/` o specs equivalentes cuando existan.
- **EX** (excepcion de adopcion AOS): fuente canonica en esta declaracion.

Una decision local debe elevarse cuando:

- afecta a mas de un repositorio;
- redefine una fuente oficial AOS o una autoridad delegada;
- cambia el estado de exposicion de FileStudio como producto o infraestructura del ecosistema;
- contradice o tensiona una decision activa AOS;
- requiere cambios en Boveda, infraestructura, Vercel, VPS o contratos de ecosistema.

La decision pendiente [`../docs/governance/decision-expose-filestudio-as-product-infra.md`](../docs/governance/decision-expose-filestudio-as-product-infra.md) permanece pendiente. Esta Wave no la aprueba, rechaza ni modifica.

## Excepciones y desviaciones

No existen excepciones AOS conocidas al momento de esta declaracion.

La falta de paridad de motores entre Web/Desktop, Worker y Local Agent se registra como estado arquitectonico local incompleto, no como excepcion AOS. Su resolucion requiere decision arquitectonica separada.

## Politica de upgrade AOS

`anclora-filestudio` revisara nuevas versiones de AOS cuando:

- AOS publique una nueva release;
- cambien Constitucion, decisiones, registro de fuentes oficiales, estandares o playbooks aplicables;
- se resuelva la decision pendiente sobre FileStudio como producto/infraestructura;
- se complete o cambie la migracion de motores hacia `packages/engines`;
- se modifiquen Service API, Worker, Local Agent, Nexus integration, QA funcional o documentacion de gobierno local.

El upgrade debe:

1. Revisar release notes de AOS.
2. Revisar decisiones AOS nuevas o modificadas.
3. Actualizar `AOS Version` si adopta la nueva version.
4. Registrar excepciones si no puede actualizar.
5. Elevar conflictos a AOS o Boveda segun el dominio afectado.

## Historial de adopcion

| Fecha | AOS Version | Cambio | Owner |
| --- | --- | --- | --- |
| 2026-08-09 | v0.2.0 | Declaracion inicial de adopcion AOS para FileStudio; AGENTS actualizado para arquitectura real e incompleta. | AOS Chief Architect |

## Documentos relacionados

- [`../README.md`](../README.md)
- [`../AGENTS.md`](../AGENTS.md)
- [`../docs/qa/FILESTUDIO_QA_STRATEGY.md`](../docs/qa/FILESTUDIO_QA_STRATEGY.md)
- [`../docs/governance/decision-expose-filestudio-as-product-infra.md`](../docs/governance/decision-expose-filestudio-as-product-infra.md)
- [`../docs/implementation/anclora-filestudio-service-api/architecture.md`](../docs/implementation/anclora-filestudio-service-api/architecture.md)
- [`../docs/implementation/anclora-filestudio-vercel/architecture.md`](../docs/implementation/anclora-filestudio-vercel/architecture.md)

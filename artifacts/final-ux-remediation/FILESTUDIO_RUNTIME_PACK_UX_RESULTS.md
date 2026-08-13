# Runtime Pack UX Results

Status: PASS

Commit: 76a6441

## Result

When Chromium is absent in an isolated runtime-pack home, MD to PNG remains discoverable as installable and the converter shows a minimal product UI:

- title: `Se necesita un componente adicional`
- product name: `Componente de renderizado web`
- purpose: conversion needs the web rendering component
- size: `~193 MB`, sourced from the Linux manifest value `193282658`
- install-once copy
- actions: `Instalar`, `Cancelar`

No download starts before `Instalar`.

## Verification

| Check | Result |
| --- | --- |
| PACKUX-001 installable state shows UI | PASS |
| PACKUX-002 no silent download | PASS |
| PACKUX-003 size from manifest | PASS |
| PACKUX-004 cancel before download | PASS |
| PACKUX-005 progress states | PASS by component tests and install service states |
| PACKUX-006 successful install | PASS by existing RuntimePackManager install fixture tests |
| PACKUX-007 capability refreshes to available | PASS by installed-pack component callback and capability reload |
| PACKUX-008 conversion after install | PASS when runtime is available in current environment |
| PACKUX-009 download failure human error | PASS |
| PACKUX-010 SHA failure blocked | PASS by existing RuntimePackManager SHA test |
| PACKUX-011 broken pack message | PASS |
| PACKUX-012 already installed skips blocker UI | PASS |

## Backend authority

The UI is convenience only. `POST /api/jobs` still returns 428 `RUNTIME_PACK_REQUIRED` when the pack is missing.

Evidence:

- `api-results/runtime-pack-installable-state.json`
- `screenshots/runtime-pack-required.png`

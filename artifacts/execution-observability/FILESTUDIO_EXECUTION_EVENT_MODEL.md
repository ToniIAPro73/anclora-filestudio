# FileStudio Execution Event Model

Generated: 2026-08-13

## Events

Events are local structured records stored in job metadata and logged as JSON lines.

Deterministic order for primary success:

1. `conversion.started`
2. `conversion.route.selected`
3. `conversion.attempt.started`
4. `conversion.step.started`
5. `conversion.step.completed`
6. repeat step events for each step
7. `conversion.completed`

Fallback path inserts:

- `conversion.step.failed`
- `conversion.attempt.failed`
- `conversion.fallback.selected`
- next `conversion.attempt.started`

Final failure emits exactly one:

- `conversion.failed`

Cancellation emits exactly one:

- `conversion.cancelled`

## Conversion Metadata

- `conversionId`
- `sourceFormat`
- `targetFormat`
- `selectedRouteId`
- `selectedRouteScore`
- `selectedQualityBand`
- `routeReasons`
- `fallbackUsed`
- `fallbackReason`
- `attemptCount`
- `finalRouteId`
- `finalStatus`
- `startedAt`
- `completedAt`
- `durationMs`
- `attempts`
- `events`

## Attempt Metadata

- `attemptIndex`
- `routeId`
- `routeScore`
- `qualityBand`
- `engines`
- `runtimePacks`
- `startedAt`
- `completedAt`
- `durationMs`
- `status`
- `failure`
- `steps`

## Step Metadata

- `stepIndex`
- `sourceFormat`
- `targetFormat`
- `engineId`
- `routeEdgeId`
- `startedAt`
- `completedAt`
- `durationMs`
- `status`
- `errorCode`
- `errorMessageSafe`
- `outputSize`
- `runtimePackId`

## Privacy

Stored execution metadata excludes file content, extracted text, full local paths and raw stacks. User-facing APIs expose only a public execution summary:

- `selectedRouteId`
- `finalRouteId`
- `fallbackUsed`
- `attemptCount`
- `durationMs`
- `finalStatus`

Full local metadata remains internal in `toolchain_snapshot_json`.

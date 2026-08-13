# FileStudio Failure Taxonomy

Generated: 2026-08-13

## Policy

Unknown failures fail closed: no automatic fallback.

Adapters and job processors normalize raw failures into execution error codes. The fallback policy only reasons over normalized codes, failure class, route quality and failure domain.

| Error code | Class | Fallback eligible | User action | Example | Source |
| --- | --- | --- | --- | --- | --- |
| ENGINE_UNAVAILABLE | USER_ACTION_REQUIRED | No | Install/fix engine | LibreOffice missing | probe/capability |
| ENGINE_START_FAILED | RECOVERABLE_TECHNICAL | Yes | No | process could not start after probe | adapter/process |
| ENGINE_CRASH | RECOVERABLE_TECHNICAL | Yes | No | SIGSEGV/SIGABRT | adapter/process |
| ENGINE_TIMEOUT | RECOVERABLE_TECHNICAL | Yes | No | conversion timeout | process runner |
| TEMPORARY_IO_ERROR | RECOVERABLE_TECHNICAL | Yes | Maybe retry later | EBUSY/EIO transient | filesystem/process |
| OUTPUT_WRITE_ERROR | RECOVERABLE_TECHNICAL | Yes | Maybe free/fix storage | output write failure | filesystem/adapter |
| PROCESS_EXIT_NONZERO | RECOVERABLE_TECHNICAL | Yes, unless adapter maps content | No | generic non-zero exit | adapter/process |
| RUNTIME_PACK_BROKEN | NON_RECOVERABLE_POLICY | No by default | Repair/reinstall pack | Chromium pack probe failed | runtime pack manager |
| RUNTIME_PACK_REQUIRED | USER_ACTION_REQUIRED | No | Install pack | Chromium runtime missing/installable | runtime pack manager |
| INVALID_SOURCE | NON_RECOVERABLE_CONTENT | No | Pick correct input | file category invalid | detector/contract |
| SOURCE_MISMATCH | NON_RECOVERABLE_CONTENT | No | Pick correct source | route source != detected source | source contract |
| CORRUPT_INPUT | NON_RECOVERABLE_CONTENT | No | Replace file | corrupt PDF/JSON/XML/image | detector/adapter |
| UNSUPPORTED_CONTENT | NON_RECOVERABLE_CONTENT | No | Use supported content | unsupported codec/content | adapter |
| QUALITY_GUARD_FAILED | NON_RECOVERABLE_CONTENT | No | Use different explicit flow | validation or quality guard | validation |
| SCANNED_CONTENT_REQUIRES_OCR | NON_RECOVERABLE_CONTENT | No | Use OCR conversion | scanned PDF to editable output | PDF guard |
| SECURITY_POLICY_BLOCKED | NON_RECOVERABLE_POLICY | No | Remove unsafe input | unsafe path/archive/network | security |
| USER_CANCELLED | CANCELLED | No | Re-run if desired | job cancellation | API/user |
| UNKNOWN | UNKNOWN | No | Inspect diagnostics | unclassified exception | safety fallback |

## Classification Rules

Recoverable technical failures may use controlled fallback when the candidate avoids the failed engine/runtime domain and passes the quality floor.

Content, policy, user-action and cancelled failures do not fallback automatically. This preserves the real problem instead of hiding it behind a lower-quality route.

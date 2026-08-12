# FileStudio Execution Alignment Report

Generated: 2026-08-12T23:23:26.133Z

## Root Cause

Diagnostics and execution had separate Poppler resolver implementations. Diagnostics resolved the Windows bundled Poppler layout through the toolchain probe helper, while `PopplerEngine` had a private resolver.

## Fix

`PopplerEngine` now delegates Poppler directory resolution to the diagnostics resolver. This aligns:

- diagnostics availability;
- discovery/routing engine ids;
- execution adapter resolution;
- bundled priority;
- PATH fallback when no bundled path exists.

## Windows Poppler Case

Expected bundled executable:

```text
tools/poppler/Library/bin/pdftoppm.exe
```

If diagnostics reports bundled Poppler available, execution now resolves the same bundled layout.

## Source File Contract

Explicit-source route capabilities are validated before route lookup:

```text
route-docx-png + detected md -> SOURCE_FORMAT_MISMATCH
route-pdf-png + detected docx -> SOURCE_FORMAT_MISMATCH
```

Auto-source flows remain capability driven: after analysis, any source that can reach the target may proceed.

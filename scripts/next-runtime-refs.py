#!/usr/bin/env python3
"""Check or fix Next.js runtime external references in a packaged app dir.

Turbopack server chunks load some Next.js runtime modules through dynamic
external requires of the form:

    e.x("next/dist/...", () => require("next/dist/..."))

The Next.js NFT output file tracer does not follow these references, so
.next/standalone/node_modules can silently miss runtime files that are only
required when a matching route is first evaluated (Windows native QA P0:
next/dist/compiled/next-server/app-route-turbo.runtime.prod.js).

Modes:
    check <app_dir>             print OK/MISSING per referenced module,
                                exit 1 if any is missing from app/node_modules
    fix   <app_dir> <repo_root> copy missing modules from the repository
                                node_modules (lockfile-installed Next.js),
                                then verify like check mode
"""

import os
import re
import shutil
import sys

REF_RE = re.compile(r"""(?:e\.x|require)\(\s*["'](next/dist/[^"']+)["']""")


def collect_refs(app_dir):
    server_dir = os.path.join(app_dir, ".next", "server")
    if not os.path.isdir(server_dir):
        raise SystemExit(f"missing server build dir: {server_dir}")
    refs = set()
    for root, _, files in os.walk(server_dir):
        for fname in files:
            if not fname.endswith(".js") or fname.endswith(".map"):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as fh:
                    refs.update(REF_RE.findall(fh.read()))
            except OSError:
                continue
    if not refs:
        raise SystemExit(f"no next/dist external references found under {server_dir}")
    return sorted(refs)


def module_present(app_dir, ref):
    target = os.path.join(app_dir, "node_modules", ref)
    return (
        os.path.exists(target)
        or os.path.exists(target + ".js")
        or os.path.exists(os.path.join(target, "index.js"))
    )


def fix_refs(app_dir, repo_root, refs):
    copied = []
    for ref in refs:
        if module_present(app_dir, ref):
            continue
        src = os.path.realpath(os.path.join(repo_root, "node_modules", ref))
        if not os.path.exists(src):
            raise SystemExit(
                f"referenced module not found in repository node_modules: {ref}"
            )
        dest = os.path.join(app_dir, "node_modules", ref)
        if os.path.isdir(src):
            shutil.copytree(src, dest, symlinks=False, dirs_exist_ok=True)
        else:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(src, dest)
        copied.append(ref)
    return copied


def run_check(app_dir, refs):
    missing = 0
    for ref in refs:
        if module_present(app_dir, ref):
            print(f"OK {ref}")
        else:
            print(f"MISSING {ref}")
            missing += 1
    if missing:
        print(f"{missing} referenced Next.js runtime module(s) missing", file=sys.stderr)
        return 1
    print(f"all {len(refs)} referenced Next.js runtime module(s) present")
    return 0


def main(argv):
    if len(argv) < 3:
        raise SystemExit(__doc__)
    mode, app_dir = argv[1], argv[2]
    refs = collect_refs(app_dir)
    if mode == "check":
        return run_check(app_dir, refs)
    if mode == "fix":
        if len(argv) < 4:
            raise SystemExit("fix mode requires <repo_root>")
        copied = fix_refs(app_dir, argv[3], refs)
        for ref in copied:
            print(f"COPIED {ref}")
        if copied:
            print(f"supplemented {len(copied)} untraced Next.js runtime module(s)")
        return run_check(app_dir, refs)
    raise SystemExit(f"unknown mode: {mode}")


if __name__ == "__main__":
    sys.exit(main(sys.argv))

#!/usr/bin/env python3
"""
scripts/lib/sanitize-required-server-files.py

Sanitizes Next.js runtime metadata (.next/required-server-files.json and server.js)
for portable relocatable distributions (Linux, macOS, Windows).

Removes host-specific workspace paths while preserving all runtime-required
Next.js configuration, manifests, and flags.
"""

import argparse
import json
import os
import pathlib
import re
import sys


def is_matching_path(candidate, target_str):
    if not isinstance(candidate, str) or not target_str:
        return False
    c_norm = candidate.replace("\\", "/").rstrip("/")
    t_norm = target_str.replace("\\", "/").rstrip("/")
    return c_norm.lower() == t_norm.lower()


def sanitize_required_server_files(metadata_path, repo_root_str):
    meta_path = pathlib.Path(metadata_path)
    if not meta_path.is_file():
        raise FileNotFoundError(f"Metadata file not found: {metadata_path}")

    with meta_path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)

    resolved_root = pathlib.Path(repo_root_str).resolve()
    root_posix = resolved_root.as_posix()
    raw_root_posix = repo_root_str.replace("\\", "/").rstrip("/")

    # 1. Sanitize appDir
    app_dir = data.get("appDir")
    if is_matching_path(app_dir, root_posix) or is_matching_path(app_dir, raw_root_posix):
        data["appDir"] = "."

    # 2. Sanitize config fields
    config = data.get("config")
    if isinstance(config, dict):
        if is_matching_path(config.get("outputFileTracingRoot"), root_posix) or is_matching_path(config.get("outputFileTracingRoot"), raw_root_posix):
            config["outputFileTracingRoot"] = "."
        if is_matching_path(config.get("repoRoot"), root_posix) or is_matching_path(config.get("repoRoot"), raw_root_posix):
            config["repoRoot"] = "."
        turbopack = config.get("turbopack")
        if isinstance(turbopack, dict):
            if is_matching_path(turbopack.get("root"), root_posix) or is_matching_path(turbopack.get("root"), raw_root_posix):
                turbopack["root"] = "."

    encoded = json.dumps(data, indent=2, ensure_ascii=False) + "\n"

    # 3. Validation: ensure no form of repo_root remains in the encoded JSON
    encoded_lower = encoded.lower()
    for root_candidate in {root_posix, raw_root_posix}:
        c_posix = root_candidate.replace("\\", "/").rstrip("/").lower()
        c_win = c_posix.replace("/", "\\")
        if c_posix and c_posix in encoded_lower:
            raise ValueError(f"required-server-files.json still contains build workspace path (posix): {c_posix}")
        if c_win and c_win in encoded_lower:
            raise ValueError(f"required-server-files.json still contains build workspace path (windows): {c_win}")

    # 4. Validation: ensure essential runtime fields are intact
    for field in ("version", "config", "files"):
        if field not in data:
            raise ValueError(f"required-server-files.json missing essential field: {field}")

    meta_path.write_text(encoded, encoding="utf-8")
    return data


def sanitize_server_js(server_js_path, repo_root_str):
    p = pathlib.Path(server_js_path)
    if not p.is_file():
        return
    source = p.read_text(encoding="utf-8")
    resolved = pathlib.Path(repo_root_str).resolve().as_posix()
    raw_posix = repo_root_str.replace("\\", "/").rstrip("/")
    for r in {resolved, raw_posix}:
        if not r:
            continue
        variants = [
            r,
            r.replace("/", "\\"),
            r.replace("/", "\\\\")
        ]
        for v in variants:
            pattern = re.compile(re.escape(v), re.IGNORECASE)
            source = pattern.sub(".", source)
    p.write_text(source, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Sanitize Next.js standalone metadata for portable packaging.")
    parser.add_argument("target", help="Path to required-server-files.json or server.js")
    parser.add_argument("repo_root", help="Build repository root path to sanitize")
    parser.add_argument("--server-js", action="store_true", help="Sanitize server.js instead of required-server-files.json")

    args = parser.parse_args()

    try:
        if args.server_js:
            sanitize_server_js(args.target, args.repo_root)
        else:
            sanitize_required_server_files(args.target, args.repo_root)
    except Exception as exc:
        print(f"Error during metadata sanitization: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

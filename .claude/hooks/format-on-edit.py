#!/usr/bin/env python3
"""PostToolUse hook: auto-format files after Claude edits them.

Reads JSON from stdin per the Claude Code hook spec, dispatches to
prettier (TS/JS/JSON/MD/CSS) or ruff (Python). Silent on success;
silent on missing tools too — the hook should never block work.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

PRETTIER_EXTS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
                 ".json", ".md", ".mdx", ".css", ".scss", ".html", ".yml", ".yaml"}
PYTHON_EXTS = {".py", ".pyi"}


def run(cmd: list[str]) -> None:
    try:
        subprocess.run(cmd, check=False, capture_output=True, timeout=30)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0

    file_path = (
        payload.get("tool_input", {}).get("file_path")
        or payload.get("file_path")
    )
    if not file_path:
        return 0

    path = Path(file_path)
    if not path.exists() or not path.is_file():
        return 0

    suffix = path.suffix.lower()

    if suffix in PRETTIER_EXTS and shutil.which("prettier"):
        run(["prettier", "--write", str(path)])
    elif suffix in PYTHON_EXTS and shutil.which("ruff"):
        run(["ruff", "format", str(path)])
        run(["ruff", "check", "--fix", "--unsafe-fixes", str(path)])

    return 0


if __name__ == "__main__":
    sys.exit(main())

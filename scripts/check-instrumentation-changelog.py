#!/usr/bin/env python3
"""PostToolUse hook: nudge to update the instrumentation changelog.

Fires after Edit/Write/MultiEdit. If the edit touched analytics instrumentation
(lib/analytics.ts, or any edit whose text adds/changes a
track()/trackIntent()/trackSystem()/setPersona() call) but
analytics/INSTRUMENTATION_CHANGELOG.md was not modified in the working tree, it
emits a reminder as additionalContext so logging changes are always documented.
Analysts rely on that log to avoid mistaking a logging change for a behavior
change.

Advisory only: never blocks, always exits 0.
"""

import sys
import os
import json
import subprocess

CHANGELOG = "analytics/INSTRUMENTATION_CHANGELOG.md"
CALL_TOKENS = ("track(", "trackIntent(", "trackSystem(", "setPersona(")


def edited_text(tool_input):
    """All text this tool wrote/changed, so we can scan for instrumentation calls."""
    parts = []
    if not isinstance(tool_input, dict):
        return ""
    for key in ("content", "old_string", "new_string"):
        v = tool_input.get(key)
        if isinstance(v, str):
            parts.append(v)
    edits = tool_input.get("edits")
    if isinstance(edits, list):
        for e in edits:
            if isinstance(e, dict):
                for key in ("old_string", "new_string"):
                    v = e.get(key)
                    if isinstance(v, str):
                        parts.append(v)
    return "\n".join(parts)


def touches_instrumentation(tool_input):
    path = (tool_input or {}).get("file_path", "") if isinstance(tool_input, dict) else ""
    norm = path.replace("\\", "/")
    if norm.endswith("lib/analytics.ts"):
        return True
    text = edited_text(tool_input)
    return any(tok in text for tok in CALL_TOKENS)


def changelog_dirty(cwd):
    """True if the changelog shows up as modified/added in the working tree."""
    try:
        out = subprocess.run(
            ["git", "-C", cwd, "status", "--porcelain", "--", CHANGELOG],
            capture_output=True, text=True, timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return True  # can't tell -> stay quiet rather than nag wrongly
    return bool(out.stdout.strip())


def main():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        return

    tool_input = payload.get("tool_input") or {}
    cwd = payload.get("cwd") or os.getcwd()

    if not touches_instrumentation(tool_input):
        return
    if changelog_dirty(cwd):
        return

    msg = (
        "Instrumentation change detected (analytics event logging) but "
        + CHANGELOG + " was not updated. Add an entry: event(s) touched, change "
        "type (added/renamed/removed/semantics-changed/props-changed), what & why, "
        "and a Comparability note saying which metric is discontinuous and from "
        "when. This is what keeps analysts from reading a logging change as a "
        "change in user behavior."
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": msg,
        }
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)

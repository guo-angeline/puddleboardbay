#!/usr/bin/env python3
"""PreToolUse hook: gate `vercel --prod` on the changes that need owner review.

Deploys are automatic by default. This hook is the mechanical backstop: it lets a
routine `vercel --prod` through, and blocks (exit 2) only when the diff since the
last deployed commit touches something the studio has decided needs a human look
first. The deploy pointer is the git tag `deployed-prod`, moved after every
verified deploy (ship skill step 6).

Gated changes:
  * Standing gates (always on):
      - data/spots.json lat/lng lines (D19: the owner reads the coordinate diff
        before it reaches the alert crons).
      - push / cron send behavior and Supabase subscription code (studio.md
        PROTECTED list, the 6am-alert incident).
  * Dynamic gates (no extra doc): any path named on a `Gates:` line of an OPEN
    decision in DECISIONS.md. The gate lives inside the decision and dies when
    the decision is answered.

Only acts on commands containing `vercel --prod`; everything else exits 0
instantly. If the `deployed-prod` tag does not exist yet, it cannot compare, so
it stays out of the way (exit 0). Guarded and best-effort: on any internal error
it fails open rather than blocking a legitimate deploy.
"""

import sys
import os
import re
import json
import fnmatch
import subprocess

DEPLOY_TAG = "deployed-prod"
SPOTS = "data/spots.json"
# Push / cron send behavior and subscription storage (studio.md PROTECTED).
PROTECTED_PATTERNS = ("app/api/cron/*", "app/api/alerts/*")


def git(cwd, *args):
    out = subprocess.run(
        ["git", "-C", cwd, *args],
        capture_output=True, text=True, timeout=8,
    )
    return out


def tag_exists(cwd):
    return git(cwd, "rev-parse", "--verify", "--quiet", DEPLOY_TAG).returncode == 0


def changed_files(cwd):
    """Files differing between the deploy tag and the working tree (the deploy
    ships the tree, so compare against the tree, not just HEAD)."""
    out = git(cwd, "diff", DEPLOY_TAG, "--name-only")
    if out.returncode != 0:
        return []
    return [ln.strip().replace("\\", "/") for ln in out.stdout.splitlines() if ln.strip()]


def matches(path, pattern):
    return pattern in path or fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(path, pattern.rstrip("*") + "*")


def spots_latlng_changed(cwd):
    out = git(cwd, "diff", DEPLOY_TAG, "--", SPOTS)
    if out.returncode != 0:
        return False
    for line in out.stdout.splitlines():
        if line[:1] in ("+", "-") and line[1:2] != line[:1]:  # a real +/- line, not the +++/--- header
            if '"lat"' in line or '"lng"' in line:
                return True
    return False


def open_decision_gates(cwd):
    """[(decision_id, [patterns])] for OPEN decisions carrying a `Gates:` line."""
    path = os.path.join(cwd, "DECISIONS.md")
    gates = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    except OSError:
        return gates
    current_id, current_open = None, False
    header = re.compile(r"^##\s+(D\d+)\s+\[(OPEN|RESOLVED)\]", re.IGNORECASE)
    for line in text.splitlines():
        m = header.match(line)
        if m:
            current_id = m.group(1)
            current_open = m.group(2).upper() == "OPEN"
            continue
        if current_open and line.strip().lower().startswith("gates:"):
            raw = line.split(":", 1)[1]
            pats = [p.strip().replace("\\", "/") for p in re.split(r"[,\s]+", raw) if p.strip()]
            if pats:
                gates.append((current_id, pats))
    return gates


def find_block(cwd):
    """Return a human-readable reason string if the deploy should be blocked, else None."""
    if not tag_exists(cwd):
        return None
    files = changed_files(cwd)
    if not files:
        return None

    reasons = []
    if SPOTS in files and spots_latlng_changed(cwd):
        reasons.append("data/spots.json lat/lng changed (D19: owner reads the coordinate diff before it reaches the alert crons)")

    protected_hits = sorted({f for f in files for p in PROTECTED_PATTERNS if matches(f, p)})
    if protected_hits:
        reasons.append("push/cron/subscription surface changed (" + ", ".join(protected_hits) + "): studio.md PROTECTED, always owner-reviewed")

    for did, pats in open_decision_gates(cwd):
        hits = sorted({f for f in files for p in pats if matches(f, p)})
        if hits:
            reasons.append(f"{did} gates {', '.join(hits)} (open decision, answer it in DECISIONS.md first)")

    if not reasons:
        return None
    return (
        "Deploy blocked by predeploy-gate: the diff since the last deployed commit "
        "touches gated paths that need owner review before production.\n  - "
        + "\n  - ".join(reasons)
        + "\nEscalate this deploy (ship skill step 4) instead of deploying, or resolve the gate first."
    )


def main():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        return 0

    tool_input = payload.get("tool_input") or {}
    command = tool_input.get("command", "") if isinstance(tool_input, dict) else ""
    if "vercel --prod" not in command:
        return 0

    cwd = payload.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    reason = find_block(cwd)
    if reason:
        print(reason, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)

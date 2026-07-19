#!/usr/bin/env python3
"""PreToolUse hook: gate `vercel --prod` on the changes that need owner review.

Deploys are automatic by default. This hook is the mechanical backstop: it lets a
routine `vercel --prod` through, and blocks (exit 2) only when the diff since the
last deployed commit touches something the studio has decided needs a human look
first. The deploy pointer is the git tag `deployed-prod`, moved after every
verified deploy (ship skill step 6).

Gated changes:
  * Standing gates (always on):
      - data/spots.json lat/lng CHANGES to existing spots (D19: the owner reads
        the coordinate diff before a moved pin reaches the alert crons). New-spot
        additions do NOT gate (D23): a purely added coordinate is reviewed by the
        act of adding the spot, and gating it froze unrelated deploys too.
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
SPOTS = "web/data/spots.json"
# Push / cron send behavior and subscription storage (studio.md PROTECTED).
PROTECTED_PATTERNS = ("web/app/api/cron/*", "web/app/api/alerts/*")


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
    ships the tree, so compare against the tree, not just HEAD).

    Rename-aware (2026-07-19 web/ restructure): a content-identical rename
    (R100, e.g. app/api/cron/x.ts -> web/app/api/cron/x.ts) is NOT a change to
    send behavior and does not gate. A rename WITH edits (R<100) reports the
    new path as changed, so real content changes still gate."""
    out = git(cwd, "diff", DEPLOY_TAG, "--name-status", "-M100%")
    if out.returncode != 0:
        return []
    files = []
    for ln in out.stdout.splitlines():
        parts = ln.strip().split("\t")
        if len(parts) < 2:
            continue
        status = parts[0]
        if status == "R100":
            continue  # pure rename, content identical
        # For renames/copies the last column is the new path; else it's the path.
        files.append(parts[-1].replace("\\", "/"))
    return files


def matches(path, pattern):
    return pattern in path or fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(path, pattern.rstrip("*") + "*")


def spots_latlng_changed(cwd):
    """True only when an EXISTING spot's coordinate was changed or removed.

    A modified or deleted coordinate shows as a REMOVED (`-`) lat/lng line in the
    diff, and that is the risk D19 exists for: a pin silently moving under live
    users and the alert crons (the item-40 machine-audit scenario). A brand-new
    spot adds only `+` lat/lng lines with no matching `-`; those do NOT gate.
    A new spot is already reviewed by the act of adding it, and gating additions
    both asked the owner to review coordinates they had just supplied and froze
    every unrelated deploy that shared the tree (D23, owner directive 2026-07-17).
    """
    out = git(cwd, "diff", DEPLOY_TAG, "--", SPOTS)
    if out.returncode != 0:
        return False
    for line in out.stdout.splitlines():
        if line.startswith("-") and not line.startswith("---"):  # a removed line, not the --- header
            if '"lat"' in line or '"lng"' in line:
                return True
    return False


def owner_approved_protected(cwd):
    """A DEPLOY_APPROVAL file at the repo root containing the current HEAD sha
    (full or short prefix, >=7 chars) releases the standing PROTECTED push/cron
    gate for THAT EXACT commit: it is written only after the owner explicitly
    reviews and approves the deploy in chat, and deleted right after the
    deploy. Any further commit invalidates it. It does NOT release the D19
    coordinate gate or dynamic Gates: lines. (Added 2026-07-19 when the owner
    approved the native-push backend deploy live in session.)"""
    try:
        with open(os.path.join(cwd, "DEPLOY_APPROVAL"), "r", encoding="utf-8") as f:
            approved = f.read().strip()
    except OSError:
        return False
    if len(approved) < 7:
        return False
    head = git(cwd, "rev-parse", "HEAD")
    if head.returncode != 0:
        return False
    return head.stdout.strip().startswith(approved)


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
        reasons.append("web/data/spots.json lat/lng changed (D19: owner reads the coordinate diff before it reaches the alert crons)")

    protected_hits = sorted({f for f in files for p in PROTECTED_PATTERNS if matches(f, p)})
    if protected_hits and not owner_approved_protected(cwd):
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

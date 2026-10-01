#!/usr/bin/env bash
set -euo pipefail

# Patterns that should never appear, all currently at zero. Like Kistulentz's check, this ratchets
# structurally rather than numerically: the floor is 0, forever, with no baseline file. There's no
# legitimate reason for any of these counts to rise above zero, so failing the moment one does is
# the whole design.
#
# Two groups:
#   - In the shipped page's code (app.js, markdown.js): leftover debug output, debugger
#     statements, eval, and TODO/FIXME markers. scripts/ and tests/ are excluded, since a
#     command-line script printing its result is the point of it.
#   - Anywhere in the repository: strings shaped like real credentials. This repository is public
#     and chapter 3 is about keeping keys out of reach, so a real key landing here is the one
#     mistake the tour can least afford.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

findings=()

check_pattern() {
    local label="$1" pattern="$2"
    shift 2
    local matches
    matches="$(grep -nE "$pattern" "$@" 2>/dev/null || true)"
    if [[ -n "$matches" ]]; then
        findings+=("$label")
        echo >&2
        echo "Found ${label}:" >&2
        while IFS= read -r line; do echo "  ${line}" >&2; done <<< "$matches"
    fi
}

page_code=(app.js markdown.js)
check_pattern "console debug output" '\bconsole\.(log|debug|info|trace)\(' "${page_code[@]}"
check_pattern "debugger statement" '\bdebugger\b' "${page_code[@]}"
check_pattern "eval(" '\beval\(' "${page_code[@]}"
check_pattern "TODO/FIXME comment markers" '//\s*(TODO|FIXME)' "${page_code[@]}"

# Tracked files only, so node_modules and test output never count. This script is skipped because
# it names the patterns it looks for.
mapfile -t tracked < <(git ls-files | grep -v '^scripts/check-banned-patterns\.sh$')
check_pattern "credential-shaped strings" \
    '(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|sk_live_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16})' \
    "${tracked[@]}"

if (( ${#findings[@]} > 0 )); then
    echo >&2
    echo "Banned-pattern check failed: ${#findings[@]} pattern(s) found." >&2
    echo "Remove leftover debugging, finish or file the TODO/FIXME as an issue, and never commit a" >&2
    echo "real credential (revoke it if one was pushed). These patterns hold at zero on main." >&2
    exit 1
fi

echo "Banned-pattern check passed: no debug output, debugger, eval, TODO/FIXME or credentials."

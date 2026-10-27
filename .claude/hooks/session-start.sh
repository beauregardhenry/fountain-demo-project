#!/bin/bash
# Prepares a Claude Code on the web session: installs the npm dependencies the
# browser tests need, and the Fountain CLI used to log in and make recordings
# (see docs/RECORDING.md). Runs only in remote sessions, and is safe to re-run.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# npm install rather than npm ci, so the cached container keeps node_modules.
npm install --no-audit --no-fund --loglevel=error

# The Fountain CLI, pinned to the version the tour is written against. The release
# publishes no checksums, so these were recorded when the pin was set; update both
# together when bumping the version.
FOUNTAIN_VERSION="v0.21.0"
case "$(uname -m)" in
  x86_64)        arch=amd64; sha=a226d651818850bd6bf6a4ae7f662e472debd219a6352aa76d23f798572664d2 ;;
  aarch64|arm64) arch=arm64; sha=f1e696573f40336d52ba12a6f247811cc28959ae62ce5962ebabc8a51f78e927 ;;
  *) echo "session-start: no Fountain CLI build for $(uname -m); skipping it" >&2; exit 0 ;;
esac

bin_dir="$HOME/.local/bin"
mkdir -p "$bin_dir"
if ! "$bin_dir/fountain" --version 2>/dev/null | grep -q "$FOUNTAIN_VERSION"; then
  tmp="$(mktemp)"
  curl -fsSL -o "$tmp" "https://github.com/managoat/fountain/releases/download/${FOUNTAIN_VERSION}/fountain-linux-${arch}"
  if ! echo "${sha}  ${tmp}" | sha256sum -c --quiet -; then
    rm -f "$tmp"
    echo "session-start: the Fountain CLI download did not match its pinned checksum" >&2
    exit 1
  fi
  install -m 0755 "$tmp" "$bin_dir/fountain"
  rm -f "$tmp"
fi

# Make sure later commands in the session find it.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$bin_dir:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

"$bin_dir/fountain" --version

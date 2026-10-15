#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 北京京微资易科技有限公司 and AI WorkDeck contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
# Syncs SDK and bundled official plugins to an AI-WorkDeck/aiworkdeck host checkout.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 /path/to/aiworkdeck" >&2
  exit 1
fi

HOST_ROOT="$(cd "$1" && pwd)"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cp "$REPO_ROOT/sdk/plugin-sdk/awd-plugin-sdk.js" "$HOST_ROOT/sdk/plugin-sdk/awd-plugin-sdk.js"
for p in tencent-meeting project-im baoqingtian lawfirm-management; do
  if [ -d "$HOST_ROOT/official-plugins/$p" ]; then
    rsync -a --delete --exclude 'dist' --exclude 'target' "$REPO_ROOT/plugins/$p/" "$HOST_ROOT/official-plugins/$p/"
  fi
done
echo "Synced SDK and official-plugins to $HOST_ROOT"

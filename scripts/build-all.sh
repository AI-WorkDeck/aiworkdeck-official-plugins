#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 北京京微资易科技有限公司 and AI WorkDeck contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$(uname -s)" = Darwin ] && /usr/libexec/java_home -v 21 >/dev/null 2>&1; then
  export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
fi

echo "==> [1/3] Installing sdk/plugin-api into local Maven repository..."
if command -v mvn >/dev/null 2>&1; then
  mvn -q -f "$REPO_ROOT/sdk/plugin-api/pom.xml" install -DskipTests
elif [ "${CI:-}" = "true" ]; then
  echo "ERROR: mvn is required in CI" >&2
  exit 1
else
  echo "  (mvn not installed on this host; skipping local Maven install, CI runs full JDK 21 Maven verify)"
fi

cp "$REPO_ROOT/sdk/plugin-sdk/awd-plugin-sdk.js" "$REPO_ROOT/plugins/tencent-meeting/web/awd-plugin-sdk.js"
cp "$REPO_ROOT/sdk/plugin-sdk/awd-plugin-sdk.js" "$REPO_ROOT/plugins/baoqingtian/web/awd-plugin-sdk.js"

DIST_DIR="$REPO_ROOT/dist"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

PLUGINS=(
  "tencent-meeting"
  "project-im"
  "baoqingtian"
  "lawfirm-management"
  "litigation-visual"
  "desensitize"
  "voice-suite"
  "calendar"
)

echo "==> [2/3] Building & testing all ${#PLUGINS[@]} official plugins..."
for plugin in "${PLUGINS[@]}"; do
  echo "  -> Building plugins/$plugin ..."
  bash "$REPO_ROOT/plugins/$plugin/build.sh"
  cp "$REPO_ROOT/plugins/$plugin/dist/"*.zip "$DIST_DIR/"
done

echo "==> [3/3] Generating dist/catalog.json and dist/SHA256SUMS..."
python3 - "$REPO_ROOT" "$DIST_DIR" <<'PY'
from pathlib import Path
import hashlib, json, sys

repo = Path(sys.argv[1])
dist = Path(sys.argv[2])
entries = []
sums = []

for z in sorted(dist.glob("*.zip")):
    digest = hashlib.sha256(z.read_bytes()).hexdigest()
    sums.append(f"{digest}  {z.name}")

for plugin_dir in sorted((repo / "plugins").iterdir()):
    manifest_file = plugin_dir / "manifest.json"
    if not manifest_file.is_file():
        continue
    manifest = json.loads(manifest_file.read_text("utf-8"))
    bundle_name = f"{manifest['id']}-{manifest['version']}.zip"
    bundle_path = dist / bundle_name
    sha256 = hashlib.sha256(bundle_path.read_bytes()).hexdigest()
    entries.append({
        "id": manifest["id"],
        "name": manifest["name"],
        "version": manifest["version"],
        "description": manifest.get("description", ""),
        "category": manifest.get("category", "官方插件"),
        "bundle": bundle_name,
        "sha256": sha256,
        "sizeBytes": bundle_path.stat().st_size,
        "permissions": manifest.get("permissions", []),
        "hasBackendJar": bool(manifest.get("backendJars")),
        "hasSkill": bool(manifest.get("skill")),
        "requiresPack": manifest.get("requiresPack")
    })

(dist / "catalog.json").write_text(json.dumps({
    "schemaVersion": 1,
    "repository": "AI-WorkDeck/aiworkdeck-official-plugins",
    "sdkVersion": "1.6.0",
    "plugins": entries
}, ensure_ascii=False, indent=2) + "\n", "utf-8")

(dist / "SHA256SUMS").write_text("\n".join(sums) + "\n", "utf-8")
print(f"Built {len(entries)} official plugin bundles in {dist}")
PY

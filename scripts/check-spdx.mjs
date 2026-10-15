#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 北京京微资易科技有限公司 and AI WorkDeck contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CHECKED_EXTS = ['.java', '.js', '.mjs', '.cjs', '.ts', '.vue', '.py', '.sh', '.scss', '.css', '.html'];
const EXCLUDED_PREFIXES = ['plugins/litigation-visual/skill/'];

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean);

const missing = [];
for (const file of files) {
  if (EXCLUDED_PREFIXES.some((p) => file.startsWith(p))) continue;
  if (!CHECKED_EXTS.some((ext) => file.endsWith(ext))) continue;
  const content = readFileSync(file, 'utf8');
  if (!content.includes('SPDX-License-Identifier: AGPL-3.0-or-later')) {
    missing.push(file);
  }
}

if (missing.length > 0) {
  console.error('Missing SPDX header in files:\n' + missing.map((f) => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log(`SPDX check passed (${files.length} tracked files inspected).`);

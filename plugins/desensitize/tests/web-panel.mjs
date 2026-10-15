// SPDX-FileCopyrightText: 2026 北京京微资易科技有限公司 and AI WorkDeck contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { JSDOM } = (() => {
  for (const rel of ['../../../package.json', '../../../frontend/package.json']) {
    try { return createRequire(new URL(rel, import.meta.url))('jsdom'); } catch {}
  }
  throw new Error('Cannot resolve jsdom');
})();

const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const sdk = readFileSync(new URL('../../../sdk/plugin-sdk/awd-plugin-sdk.js', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../web/panel.js', import.meta.url), 'utf8');
const tick = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

test('desensitize plugin previews entities, warns on invalid checksums, executes masking and restores with password', async (t) => {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://plugin.invalid/' });
  t.after(() => dom.window.close());
  const calls = [];
  const parent = {
    postMessage(msg) {
      calls.push(msg);
      queueMicrotask(() => {
        let result = {};
        if (msg.method === 'files.list') {
          result = { files: [{ path: '合同/股权转让协议.docx', name: '股权转让协议.docx', size: 4096 }] };
        } else if (msg.method === 'desensitize.request') {
          if (msg.params.action === 'preview') {
            result = {
              entities: [
                { original: '北京华星科技有限公司', replacement: '[公司1]', type: 'COMPANY' },
                { original: '张伟', replacement: '[姓名1]', type: 'PERSON_NAME' }
              ],
              invalidChecksums: ['11010119900307888X（身份证校验位不符）']
            };
          } else if (msg.params.action === 'execute') {
            result = {
              entities: [{ original: '北京华星科技有限公司', replacement: '[公司1]', type: 'COMPANY' }],
              outputPath: '合同/股权转让协议_脱敏版.docx'
            };
          } else if (msg.params.action === 'restore') {
            result = {
              entities: [{ original: '[公司1]', replacement: '北京华星科技有限公司', type: 'COMPANY' }],
              outputPath: '合同/股权转让协议_复敏版.docx'
            };
          }
        }
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
          source: parent,
          data: { awd: 1, type: 'result', seq: msg.seq, ok: true, result }
        }));
      });
    }
  };
  Object.defineProperty(dom.window, 'parent', { value: parent });
  dom.window.eval(sdk);
  dom.window.eval(panel);
  dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
    source: parent,
    data: { awd: 1, type: 'init', context: { projectId: 9, pluginId: 'desensitize', theme: 'light' } }
  }));
  await tick();

  dom.window.document.getElementById('custom-words').value = '核心专利A, 核心专利B';
  dom.window.document.getElementById('preview-btn').click();
  await tick();
  assert.match(dom.window.document.getElementById('checksum-warning').textContent, /身份证校验位不符/);
  assert.match(dom.window.document.getElementById('entity-list').textContent, /北京华星科技有限公司/);

  dom.window.document.getElementById('mask-password').value = 'Secr3t!';
  dom.window.document.getElementById('execute-btn').click();
  await tick();
  dom.window.document.getElementById('open-output-btn').click();
  await tick();
  assert.ok(calls.some((c) => c.method === 'ui.openFile' && c.params.path === '合同/股权转让协议_脱敏版.docx'));

  dom.window.document.getElementById('tab-restore').click();
  dom.window.document.getElementById('restore-password').value = 'Secr3t!';
  dom.window.document.getElementById('restore-btn').click();
  await tick();
  assert.ok(calls.some((c) => c.method === 'desensitize.request' && c.params.action === 'restore'));
});

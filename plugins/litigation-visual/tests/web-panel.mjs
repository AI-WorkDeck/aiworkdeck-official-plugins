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

test('litigation-visual plugin loads files, switches layout, dispatches AI prompt and inserts figure into active doc', async (t) => {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://plugin.invalid/' });
  t.after(() => dom.window.close());
  const calls = [];
  const parent = {
    postMessage(msg) {
      calls.push(msg);
      queueMicrotask(() => {
        let result = {};
        if (msg.method === 'files.list') {
          result = { files: [{ path: '卷宗/一审判决书.pdf', name: '一审判决书.pdf', size: 2048 }, { path: '卷宗/保证合同.docx', name: '保证合同.docx', size: 1024 }] };
        } else if (msg.method === 'litviz.request') {
          result = {
            title: '当事人与担保法律关系图',
            layout: msg.params.params.layout,
            deliverables: {
              drawio: '诉讼可视化/当事人与担保法律关系图.drawio',
              svg: '诉讼可视化/当事人与担保法律关系图.svg',
              png: '诉讼可视化/当事人与担保法律关系图.png'
            }
          };
        } else if (msg.method === 'doc.exec') {
          result = { result: { inserted: true } };
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
    data: { awd: 1, type: 'init', context: { projectId: 42, pluginId: 'litigation-visual', theme: 'light' } }
  }));
  await tick();

  assert.equal(dom.window.document.getElementById('file-count').textContent, '2 份文件');
  const relBtn = dom.window.document.querySelector('[data-layout="relations"]');
  relBtn.click();
  await tick();
  assert.ok(relBtn.classList.contains('active'));

  dom.window.document.getElementById('focus-input').value = '保证期间是否经过';
  dom.window.document.getElementById('generate-ai-btn').click();
  await tick();
  const chatCall = calls.find((c) => c.method === 'chat.send');
  assert.ok(chatCall);
  assert.match(chatCall.params.prompt, /当事人与担保法律关系图/);
  assert.match(chatCall.params.prompt, /保证期间是否经过/);

  dom.window.document.getElementById('quick-preview-btn').click();
  await tick();
  assert.equal(dom.window.document.getElementById('preview-card').hidden, false);

  dom.window.document.getElementById('open-drawio-btn').click();
  dom.window.document.getElementById('insert-doc-btn').click();
  await tick();
  assert.ok(calls.some((c) => c.method === 'ui.openFile' && c.params.path.endsWith('.drawio')));
  assert.ok(calls.some((c) => c.method === 'doc.exec' && c.params.action === 'insert_at_cursor'));
});

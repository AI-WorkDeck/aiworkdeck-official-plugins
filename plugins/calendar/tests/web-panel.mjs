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

test('calendar plugin lists events, calculates statutory appeal deadlines, creates events and dispatches AI extraction', async (t) => {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://plugin.invalid/' });
  t.after(() => dom.window.close());
  const calls = [];
  const parent = {
    postMessage(msg) {
      calls.push(msg);
      queueMicrotask(() => {
        let result = {};
        if (msg.method === 'calendar.request') {
          if (msg.params.action === 'list') {
            result = { events: [{ id: 1, type: 'COURT', date: '2026-10-22', title: '北京金融法院一审开庭' }] };
          } else if (msg.params.action === 'create') {
            result = { event: { id: 2, ...msg.params.params } };
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
    data: { awd: 1, type: 'init', context: { projectId: 15, pluginId: 'calendar', theme: 'light' } }
  }));
  await tick();

  assert.match(dom.window.document.getElementById('event-list').textContent, /北京金融法院一审开庭/);

  dom.window.document.getElementById('calc-start').value = '2026-10-15';
  dom.window.document.getElementById('calc-rule').value = '15';
  dom.window.document.getElementById('calc-btn').click();
  assert.match(dom.window.document.getElementById('calc-result').textContent, /2026-10-30/);

  dom.window.document.getElementById('add-event-btn').click();
  await tick();
  assert.ok(calls.some((c) => c.method === 'calendar.request' && c.params.action === 'create'));
  assert.match(dom.window.document.getElementById('event-list').textContent, /2026-10-30/);

  dom.window.document.getElementById('extract-ai-btn').click();
  await tick();
  assert.ok(calls.some((c) => c.method === 'chat.send' && /办案日历/.test(c.params.prompt)));
});

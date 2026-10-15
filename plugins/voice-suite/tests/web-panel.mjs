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

test('voice-suite plugin transcribes audio with speaker diarization, sends AI minutes, and synthesizes TTS from editor selection', async (t) => {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://plugin.invalid/' });
  t.after(() => dom.window.close());
  const calls = [];
  const parent = {
    postMessage(msg) {
      calls.push(msg);
      queueMicrotask(() => {
        let result = {};
        if (msg.method === 'files.list') {
          result = { files: [{ path: '录音/庭审录音_20261015.m4a', name: '庭审录音_20261015.m4a', size: 8192 }] };
        } else if (msg.method === 'voice.request') {
          if (msg.params.action === 'transcribe') {
            result = {
              speakerCount: 2,
              transcript: '[审判长 00:00:12] 现在核对当事人身份。\n[原告代理人 00:00:25] 原告华星半导体委托代理人出庭。'
            };
          } else if (msg.params.action === 'synthesize') {
            result = { audioPath: '语音播报/选区朗读.mp3', durationSeconds: 18 };
          }
        } else if (msg.method === 'doc.exec') {
          if (msg.params.action === 'get_selection') {
            result = { result: { text: '本合同自双方签字盖章之日起生效。' } };
          } else {
            result = { result: { inserted: true } };
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
    data: { awd: 1, type: 'init', context: { projectId: 12, pluginId: 'voice-suite', theme: 'light' } }
  }));
  await tick();

  dom.window.document.getElementById('transcribe-btn').click();
  await tick();
  assert.match(dom.window.document.getElementById('transcript-box').textContent, /原告华星半导体/);

  dom.window.document.getElementById('insert-transcript-btn').click();
  dom.window.document.getElementById('ai-minutes-btn').click();
  await tick();
  assert.ok(calls.some((c) => c.method === 'doc.exec' && c.params.action === 'insert_at_cursor'));
  assert.ok(calls.some((c) => c.method === 'chat.send' && /原告华星半导体/.test(c.params.prompt)));

  dom.window.document.getElementById('tab-tts').click();
  dom.window.document.getElementById('pull-selection-btn').click();
  await tick();
  assert.equal(dom.window.document.getElementById('tts-text').value, '本合同自双方签字盖章之日起生效。');

  dom.window.document.getElementById('synthesize-btn').click();
  await tick();
  assert.match(dom.window.document.getElementById('tts-status').textContent, /18 秒/);
});

// SPDX-FileCopyrightText: 2026 北京京微资易科技有限公司 and AI WorkDeck contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
(function () {
  'use strict';

  var state = {
    files: [],
    lastTranscript: ''
  };

  function $(id) { return document.getElementById(id); }

  function showNotice(msg) {
    var el = $('notice');
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = msg;
  }

  function renderAudioFiles() {
    var sel = $('audio-file');
    sel.innerHTML = '';
    if (!state.files.length) {
      var opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '暂无音视频文件';
      sel.appendChild(opt);
      return;
    }
    state.files.forEach(function (f) {
      var o = document.createElement('option');
      o.value = f.path;
      o.textContent = f.name || f.path;
      sel.appendChild(o);
    });
  }

  function bindEvents() {
    $('tab-asr').addEventListener('click', function () {
      $('tab-asr').classList.add('active');
      $('tab-tts').classList.remove('active');
      $('asr-pane').hidden = false;
      $('tts-pane').hidden = true;
    });

    $('tab-tts').addEventListener('click', function () {
      $('tab-tts').classList.add('active');
      $('tab-asr').classList.remove('active');
      $('tts-pane').hidden = false;
      $('asr-pane').hidden = true;
    });

    $('transcribe-btn').addEventListener('click', function () {
      var path = $('audio-file').value;
      window.awd.voice.request('transcribe', {
        path: path,
        speakerDiarization: $('diarization-cb').checked,
        legalTermsBoost: $('legal-boost-cb').checked
      }).then(function (res) {
        state.lastTranscript = (res && res.transcript) || '';
        $('transcript-box').textContent = state.lastTranscript || '（转写完成，无内容）';
        showNotice('已完成语音转写，识别到 ' + ((res && res.speakerCount) || 1) + ' 位说话人。');
      }).catch(function (err) {
        showNotice('转写失败：' + err.message);
      });
    });

    $('insert-transcript-btn').addEventListener('click', function () {
      if (!state.lastTranscript) {
        showNotice('请先执行录音转写');
        return;
      }
      window.awd.doc.insertText(state.lastTranscript).then(function () {
        showNotice('已将转写逐字稿插入当前打开的文书。');
      });
    });

    $('ai-minutes-btn').addEventListener('click', function () {
      if (!state.lastTranscript) {
        showNotice('请先执行录音转写');
        return;
      }
      var prompt = '请根据以下【语音转文字】逐字稿，整理结构化法律会谈/庭审纪要与待办事项：\n\n' + state.lastTranscript;
      window.awd.chat.send(prompt).then(function () {
        showNotice('已发送至 AI 对话生成结构化纪要。');
      });
    });

    $('pull-selection-btn').addEventListener('click', function () {
      window.awd.doc.getSelection().then(function (sel) {
        var text = (sel && sel.text) || '';
        $('tts-text').value = text;
        showNotice('已读取当前文书选区文字。');
      });
    });

    $('synthesize-btn').addEventListener('click', function () {
      var text = ($('tts-text').value || '').trim();
      var voice = $('tts-voice').value;
      var rate = Number($('tts-rate').value || '1.0');
      window.awd.voice.request('synthesize', {
        text: text,
        voice: voice,
        rate: rate
      }).then(function (res) {
        $('tts-status').textContent = '已合成语音：' + (res.audioPath || 'tts-output.mp3') + '（时长 ' + (res.durationSeconds || 0) + ' 秒）';
        showNotice('语音合成完成，正在播报校对。');
      });
    });
  }

  bindEvents();

  window.awd.ready().then(function () {
    return window.awd.files.list();
  }).then(function (files) {
    state.files = Array.isArray(files) ? files : [];
    renderAudioFiles();
  }).catch(function () {});
})();

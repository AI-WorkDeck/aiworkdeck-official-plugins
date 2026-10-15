// SPDX-FileCopyrightText: 2026 北京京微资易科技有限公司 and AI WorkDeck contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
(function () {
  'use strict';

  var state = {
    projectId: null,
    files: [],
    lastOutputPath: null
  };

  function $(id) { return document.getElementById(id); }

  function showNotice(msg) {
    var el = $('notice');
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = msg;
  }

  function getSelectedStrategies() {
    var checks = document.querySelectorAll('#strategy-grid input[type="checkbox"]');
    var out = [];
    checks.forEach(function (c) { if (c.checked) out.push(c.value); });
    return out;
  }

  function parseCustomWords() {
    var raw = ($('custom-words').value || '').trim();
    if (!raw) return [];
    return raw.split(/[\n,，;；]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function renderFileSelectors() {
    var srcSel = $('source-file');
    var maskSel = $('masked-file');
    srcSel.innerHTML = '';
    maskSel.innerHTML = '';
    if (!state.files.length) {
      var opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '暂无项目文件';
      srcSel.appendChild(opt);
      maskSel.appendChild(opt.cloneNode(true));
      return;
    }
    state.files.forEach(function (f) {
      var o1 = document.createElement('option');
      o1.value = f.path;
      o1.textContent = f.name || f.path;
      srcSel.appendChild(o1);
      var o2 = o1.cloneNode(true);
      maskSel.appendChild(o2);
    });
  }

  function renderResult(res) {
    $('result-card').hidden = false;
    var warnEl = $('checksum-warning');
    if (res.invalidChecksums && res.invalidChecksums.length) {
      warnEl.hidden = false;
      warnEl.textContent = '校验位未通过（未自动替换）：' + res.invalidChecksums.join('、');
    } else {
      warnEl.hidden = true;
    }
    var listEl = $('entity-list');
    listEl.innerHTML = '';
    (res.entities || []).forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'ds-entity-row';
      row.textContent = item.original + '  →  ' + item.replacement + ' (' + item.type + ')';
      listEl.appendChild(row);
    });
    if (res.outputPath) {
      state.lastOutputPath = res.outputPath;
      $('open-output-btn').hidden = false;
    } else {
      $('open-output-btn').hidden = true;
    }
  }

  function bindEvents() {
    $('tab-mask').addEventListener('click', function () {
      $('tab-mask').classList.add('active');
      $('tab-restore').classList.remove('active');
      $('mask-pane').hidden = false;
      $('restore-pane').hidden = true;
    });

    $('tab-restore').addEventListener('click', function () {
      $('tab-restore').classList.add('active');
      $('tab-mask').classList.remove('active');
      $('restore-pane').hidden = false;
      $('mask-pane').hidden = true;
    });

    $('preview-btn').addEventListener('click', function () {
      var path = $('source-file').value;
      var strategies = getSelectedStrategies();
      var customWords = parseCustomWords();
      window.awd.desensitize.request('preview', {
        path: path,
        strategies: strategies,
        customWords: customWords
      }).then(function (res) {
        renderResult(res);
        showNotice('已完成敏感词扫描，共命中 ' + ((res.entities && res.entities.length) || 0) + ' 处实体。');
      }).catch(function (err) {
        showNotice('预览失败：' + err.message);
      });
    });

    $('execute-btn').addEventListener('click', function () {
      var path = $('source-file').value;
      var strategies = getSelectedStrategies();
      var customWords = parseCustomWords();
      var password = $('mask-password').value || '';
      window.awd.desensitize.request('execute', {
        path: path,
        strategies: strategies,
        customWords: customWords,
        password: password
      }).then(function (res) {
        renderResult(res);
        showNotice('已生成脱敏副本：' + (res.outputPath || '脱敏文书.docx'));
      }).catch(function (err) {
        showNotice('生成脱敏副本失败：' + err.message);
      });
    });

    $('restore-btn').addEventListener('click', function () {
      var path = $('masked-file').value;
      var password = $('restore-password').value || '';
      window.awd.desensitize.request('restore', {
        path: path,
        password: password
      }).then(function (res) {
        renderResult(res);
        showNotice('已成功复敏并还原文书：' + (res.outputPath || '复敏文书.docx'));
      }).catch(function (err) {
        showNotice('复敏失败：' + err.message);
      });
    });

    $('open-output-btn').addEventListener('click', function () {
      if (!state.lastOutputPath) return;
      window.awd.ui.openFile(state.lastOutputPath);
    });
  }

  bindEvents();

  window.awd.ready().then(function (ctx) {
    state.projectId = ctx && ctx.projectId ? ctx.projectId : null;
    return window.awd.files.list();
  }).then(function (files) {
    state.files = Array.isArray(files) ? files : [];
    renderFileSelectors();
  }).catch(function () {});
})();

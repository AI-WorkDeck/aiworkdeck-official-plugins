// SPDX-FileCopyrightText: 2026 北京京微资易科技有限公司 and AI WorkDeck contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
(function () {
  'use strict';

  var LAYOUT_LABELS = {
    timeline: '案件事实时间轴',
    relations: '当事人与担保法律关系图',
    equity: '股权与控制权结构图',
    flowchart: '诉讼与执行程序流程图',
    limitation: '诉讼时效与保证期间图',
    gantt: '合同履行对比甘特图'
  };

  var state = {
    projectId: null,
    selectedLayout: 'timeline',
    visualMode: 'courtroom',
    files: [],
    selectedPaths: {},
    lastRender: null
  };

  function $(id) { return document.getElementById(id); }

  function showNotice(text) {
    var el = $('notice');
    if (!text) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = text;
  }

  function renderFiles() {
    var listEl = $('file-list');
    listEl.innerHTML = '';
    $('file-count').textContent = state.files.length + ' 份文件';
    if (!state.files.length) {
      var empty = document.createElement('div');
      empty.className = 'lv-meta';
      empty.textContent = state.projectId ? '当前项目暂无可读取材料' : '请先在左侧选择案件项目';
      listEl.appendChild(empty);
      return;
    }
    state.files.forEach(function (file) {
      var label = document.createElement('label');
      label.className = 'lv-file-row';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = file.path;
      cb.checked = !!state.selectedPaths[file.path];
      cb.addEventListener('change', function () {
        if (cb.checked) state.selectedPaths[file.path] = true;
        else delete state.selectedPaths[file.path];
      });
      var span = document.createElement('span');
      span.textContent = file.name || file.path;
      label.appendChild(cb);
      label.appendChild(span);
      listEl.appendChild(label);
    });
  }

  function loadProjectFiles() {
    if (!state.projectId) {
      $('project-banner').textContent = '请先打开一个案件项目';
      state.files = [];
      state.selectedPaths = {};
      renderFiles();
      return Promise.resolve();
    }
    $('project-banner').textContent = '当前案件项目 #' + state.projectId + ' · 支持 .drawio / .svg / .png 三件套输出';
    return window.awd.files.list().then(function (files) {
      state.files = Array.isArray(files) ? files : [];
      state.selectedPaths = {};
      state.files.slice(0, 5).forEach(function (f) { state.selectedPaths[f.path] = true; });
      renderFiles();
    }).catch(function (err) {
      showNotice('读取项目材料失败：' + (err && err.message ? err.message : '未知错误'));
    });
  }

  function getSelectedFilePaths() {
    return Object.keys(state.selectedPaths).filter(function (k) { return state.selectedPaths[k]; });
  }

  function buildPrompt() {
    var layoutName = LAYOUT_LABELS[state.selectedLayout] || state.selectedLayout;
    var mode = $('visual-mode').value;
    var focus = ($('focus-input').value || '').trim();
    var chosen = getSelectedFilePaths();
    var parts = [
      '请使用【诉讼可视化】技能生成一张「' + layoutName + '」（layout=' + state.selectedLayout + '，visualMode=' + mode + '）。'
    ];
    if (chosen.length) {
      parts.push('重点参考材料：' + chosen.join('、') + '。');
    }
    if (focus) {
      parts.push('图中深红焦点强调（crimson accent）：' + focus + '。');
    }
    parts.push('请先抽取事实节点并展示审计检查点，确认后调用 litigation_render 输出 .drawio、.svg 与 .png。');
    return parts.join('\n');
  }

  function bindEvents() {
    var chips = document.querySelectorAll('#layout-grid .lv-chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        state.selectedLayout = chip.getAttribute('data-layout') || 'timeline';
        window.awd.storage.set('lastLayout', state.selectedLayout).catch(function () {});
      });
    });

    $('refresh-btn').addEventListener('click', function () {
      showNotice('');
      loadProjectFiles();
    });

    $('generate-ai-btn').addEventListener('click', function () {
      var prompt = buildPrompt();
      var chosen = getSelectedFilePaths();
      Promise.all(chosen.map(function (p) {
        return window.awd.chat.addFile(p).catch(function () {});
      })).then(function () {
        return window.awd.chat.send(prompt);
      }).then(function () {
        showNotice('已向 AI 发送诉讼可视化出图指令，请在右侧对话确认检查点。');
      }).catch(function (err) {
        showNotice('发送失败：' + (err && err.message ? err.message : '未知错误'));
      });
    });

    $('quick-preview-btn').addEventListener('click', function () {
      var chosen = getSelectedFilePaths();
      var focus = ($('focus-input').value || '').trim() || '关键违约/时效节点';
      var payload = {
        layout: state.selectedLayout,
        visualMode: $('visual-mode').value,
        focus: focus,
        files: chosen
      };
      window.awd.litviz.request('previewSemanticMap', payload).catch(function () {
        return {
          title: LAYOUT_LABELS[state.selectedLayout] || '诉讼可视化图',
          layout: state.selectedLayout,
          visualMode: payload.visualMode,
          crimsonAccent: focus,
          sourceFiles: chosen,
          deliverables: {
            drawio: '诉讼可视化/' + (LAYOUT_LABELS[state.selectedLayout] || '图表') + '.drawio',
            svg: '诉讼可视化/' + (LAYOUT_LABELS[state.selectedLayout] || '图表') + '.svg',
            png: '诉讼可视化/' + (LAYOUT_LABELS[state.selectedLayout] || '图表') + '.png'
          }
        };
      }).then(function (res) {
        state.lastRender = res;
        $('preview-card').hidden = false;
        $('preview-title').textContent = (res && res.title) || '语义地图预览';
        $('preview-box').textContent = JSON.stringify(res, null, 2);
        showNotice('已生成语义地图预览，可一键打开 .drawio 或插入当前文书。');
      });
    });

    $('open-drawio-btn').addEventListener('click', function () {
      var path = state.lastRender && state.lastRender.deliverables && state.lastRender.deliverables.drawio;
      if (!path) return;
      window.awd.ui.openFile(path).catch(function (err) {
        showNotice('打开图形文件失败：' + err.message);
      });
    });

    $('insert-doc-btn').addEventListener('click', function () {
      var title = (state.lastRender && state.lastRender.title) || LAYOUT_LABELS[state.selectedLayout];
      var pngPath = (state.lastRender && state.lastRender.deliverables && state.lastRender.deliverables.png) || ('诉讼可视化/' + title + '.png');
      window.awd.doc.insertText('【附图：' + title + '（' + pngPath + '）】').then(function () {
        showNotice('已将图表引用插入当前打开的文书光标处。');
      }).catch(function (err) {
        showNotice('插入文书失败：' + err.message);
      });
    });
  }

  bindEvents();

  window.awd.ready().then(function (ctx) {
    state.projectId = ctx && ctx.projectId ? ctx.projectId : null;
    return loadProjectFiles();
  });

  window.awd.events.on('project.switched', function (data) {
    state.projectId = data && data.projectId !== undefined ? data.projectId : null;
    $('preview-card').hidden = true;
    loadProjectFiles();
  });
})();

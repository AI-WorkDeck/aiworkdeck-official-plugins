// SPDX-FileCopyrightText: 2026 北京京微资易科技有限公司 and AI WorkDeck contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
(function () {
  'use strict';

  var TYPE_LABELS = {
    COURT: '开庭排期',
    DEADLINE: '审限届满',
    PRESERVATION: '保全预警',
    MEETING: '客户会谈'
  };

  var state = {
    events: []
  };

  function $(id) { return document.getElementById(id); }

  function showNotice(msg) {
    var el = $('notice');
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = msg;
  }

  function renderEvents() {
    var listEl = $('event-list');
    listEl.innerHTML = '';
    if (!state.events.length) {
      var empty = document.createElement('div');
      empty.className = 'cal-meta';
      empty.textContent = '暂无办案日程';
      listEl.appendChild(empty);
      return;
    }
    state.events.forEach(function (ev) {
      var row = document.createElement('div');
      row.className = 'cal-event-item';
      var info = document.createElement('span');
      info.textContent = '[' + (TYPE_LABELS[ev.type] || ev.type) + '] ' + ev.date + ' · ' + ev.title;
      row.appendChild(info);
      listEl.appendChild(row);
    });
  }

  function addDaysIso(startIso, days) {
    var parts = startIso.split('-').map(Number);
    var dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
    return dt.toISOString().slice(0, 10);
  }

  function bindEvents() {
    $('add-event-btn').addEventListener('click', function () {
      var title = ($('event-title').value || '').trim();
      var date = $('event-date').value;
      var type = $('event-type').value;
      if (!title) {
        showNotice('请填写日程或审限标题');
        return;
      }
      window.awd.calendar.request('create', { title: title, date: date, type: type }).then(function (res) {
        var created = (res && res.event) || { id: Date.now(), title: title, date: date, type: type };
        state.events.push(created);
        $('event-title').value = '';
        renderEvents();
        showNotice('已添加办案日程：' + created.title);
      });
    });

    $('calc-btn').addEventListener('click', function () {
      var start = $('calc-start').value;
      var days = Number($('calc-rule').value || '15');
      var due = addDaysIso(start, days);
      var box = $('calc-result');
      box.hidden = false;
      box.textContent = '期间届满日：' + due + '（自送达次日起算 ' + days + ' 日，若遇法定节假日顺延至节后首日）';
      $('event-date').value = due;
      $('event-type').value = 'DEADLINE';
      $('event-title').value = '法定期间届满（起算日 ' + start + ' +' + days + '日）';
    });

    $('extract-ai-btn').addEventListener('click', function () {
      window.awd.chat.send('请扫描当前项目中的传票、受理通知书、判决书与财产保全裁定书，提取所有开庭时间、举证期限、上诉期限与保全到期日，并汇总为办案日历表。').then(function () {
        showNotice('已请求 AI 扫描项目卷宗并提取办案日历节点。');
      });
    });
  }

  bindEvents();

  window.awd.ready().then(function () {
    return window.awd.calendar.request('list', {});
  }).then(function (res) {
    state.events = (res && Array.isArray(res.events)) ? res.events : [];
    renderEvents();
  }).catch(function () {
    renderEvents();
  });
})();

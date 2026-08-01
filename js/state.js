/* ===========================================================
   state.js — Trạng thái chung của app + lớp truy cập dữ liệu.
   Các màn hình chỉ gọi qua đây, không đụng thẳng vào App.db.
   =========================================================== */

App.state = (function () {
  'use strict';

  var u = App.util;
  var D = App.dates;

  var S = {
    settings: {},
    categories: [],
    catById: {},
    budgets: {},           // { daily: 300000, weekly: ..., monthly: ..., 'cat:cho:monthly': ... }
    period: 'month',
    anchor: D.today(),
    loaded: false
  };

  /* ---------------- Bộ phát sự kiện ---------------- */

  var listeners = {};

  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function () { off(evt, fn); };
  }
  function off(evt, fn) {
    if (!listeners[evt]) return;
    listeners[evt] = listeners[evt].filter(function (f) { return f !== fn; });
  }
  function emit(evt, payload) {
    (listeners[evt] || []).forEach(function (f) {
      try { f(payload); } catch (e) { console.error('[state] lỗi listener ' + evt, e); }
    });
  }

  /* ---------------- Nạp dữ liệu ---------------- */

  function load() {
    return App.db.init()
      .then(App.seed.ensure)
      .then(function () {
        return Promise.all([
          App.db.getAll('settings'),
          App.db.getAll('categories'),
          App.db.getAll('budgets')
        ]);
      })
      .then(function (res) {
        // Cài đặt
        var st = {};
        Object.keys(App.seed.DEFAULT_SETTINGS).forEach(function (k) {
          st[k] = App.seed.DEFAULT_SETTINGS[k];
        });
        (res[0] || []).forEach(function (r) { st[r.key] = r.value; });
        S.settings = st;

        // Hạng mục
        setCategories(res[1] || []);

        // Hạn mức
        S.budgets = {};
        (res[2] || []).forEach(function (b) { S.budgets[b.id] = b.amount; });

        App.money.setCurrency(S.settings.currency);
        applyTheme();
        S.loaded = true;
        return S;
      });
  }

  function setCategories(list) {
    S.categories = list.slice().sort(function (a, b) {
      if (a.type !== b.type) return a.type === 'expense' ? -1 : 1;
      return (a.order || 0) - (b.order || 0);
    });
    S.catById = {};
    S.categories.forEach(function (c) { S.catById[c.id] = c; });
  }

  function cats(type) {
    return S.categories.filter(function (c) {
      return !c.archived && (!type || c.type === type);
    });
  }

  function cat(id) {
    return S.catById[id] || { id: id, name: 'Không rõ', emoji: '❓', color: 'c12', type: 'expense' };
  }

  function catColor(id) {
    return 'var(--' + cat(id).color + ')';
  }

  /* ---------------- Cài đặt ---------------- */

  function setSetting(key, value) {
    S.settings[key] = value;
    return App.db.put('settings', { key: key, value: value }).then(function () {
      if (key === 'currency') App.money.setCurrency(value);
      if (key === 'theme') applyTheme();
      emit('settings', { key: key, value: value });
      return value;
    });
  }

  function applyTheme() {
    var t = S.settings.theme || 'auto';
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var dark = t === 'dark' || (t === 'auto' && window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
      meta.setAttribute('content', dark ? '#1e2126' : '#2563eb');
    }
  }

  /* ---------------- Kỳ xem ---------------- */

  function setPeriod(p) {
    if (S.period === p) return;
    S.period = p;
    emit('period', currentRange());
  }

  function setAnchor(iso) {
    S.anchor = iso;
    emit('period', currentRange());
  }

  function shiftPeriod(delta) {
    S.anchor = D.shift(S.period, S.anchor, delta, S.settings.weekStart);
    emit('period', currentRange());
  }

  function currentRange() {
    return D.range(S.period, S.anchor, S.settings.weekStart);
  }

  function isCurrentPeriod() {
    var r = currentRange();
    var t = D.today();
    return t >= r.start && t <= r.end;
  }

  /* ---------------- Giao dịch ---------------- */

  function txInRange(start, end) {
    return App.db.txByDateRange(start, end).then(function (list) {
      return list.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return (b.createdAt || '') < (a.createdAt || '') ? -1 : 1;
      });
    });
  }

  function allTx() { return App.db.getAll('transactions'); }

  function saveTx(tx) {
    if (!tx.id) {
      tx.id = u.uid();
      tx.createdAt = new Date().toISOString();
    }
    tx.updatedAt = new Date().toISOString();
    tx.amount = Math.abs(Math.round(tx.amount || 0));
    return App.db.put('transactions', tx).then(function () {
      emit('data', { store: 'transactions' });
      return tx;
    });
  }

  function delTx(id) {
    return App.db.del('transactions', id).then(function () {
      emit('data', { store: 'transactions' });
    });
  }

  /* ---------------- Hạn mức ---------------- */

  function getBudget(id) {
    var v = S.budgets[id];
    return (typeof v === 'number' && v > 0) ? v : 0;
  }

  function setBudget(id, amount) {
    amount = Math.max(0, Math.round(amount || 0));
    S.budgets[id] = amount;
    return App.db.put('budgets', { id: id, amount: amount }).then(function () {
      emit('data', { store: 'budgets' });
      return amount;
    });
  }

  function catBudgetKey(catId) { return 'cat:' + catId + ':monthly'; }

  /* ---------------- Công việc ---------------- */

  function allTasks() {
    return App.db.getAll('tasks').then(function (list) {
      return list.sort(function (a, b) {
        if (!!a.done !== !!b.done) return a.done ? 1 : -1;
        var ad = a.due || '9999-12-31', bd = b.due || '9999-12-31';
        if (ad !== bd) return ad < bd ? -1 : 1;
        return (b.priority || 0) - (a.priority || 0);
      });
    });
  }

  function saveTask(t) {
    if (!t.id) { t.id = u.uid(); t.createdAt = new Date().toISOString(); }
    t.updatedAt = new Date().toISOString();
    return App.db.put('tasks', t).then(function () {
      emit('data', { store: 'tasks' });
      return t;
    });
  }

  function delTask(id) {
    return App.db.del('tasks', id).then(function () { emit('data', { store: 'tasks' }); });
  }

  /* ---------------- Khoản định kỳ ---------------- */

  function allRecurring() { return App.db.getAll('recurring'); }

  function saveRecurring(r) {
    if (!r.id) { r.id = u.uid(); r.createdAt = new Date().toISOString(); }
    return App.db.put('recurring', r).then(function () {
      emit('data', { store: 'recurring' });
      return r;
    });
  }

  function delRecurring(id) {
    return App.db.del('recurring', id).then(function () { emit('data', { store: 'recurring' }); });
  }

  /* ---------------- Mục tiêu tiết kiệm ---------------- */

  function allGoals() {
    return App.db.getAll('goals').then(function (l) {
      return l.sort(function (a, b) { return (a.createdAt || '') < (b.createdAt || '') ? -1 : 1; });
    });
  }

  function saveGoal(g) {
    if (!g.id) { g.id = u.uid(); g.createdAt = new Date().toISOString(); }
    return App.db.put('goals', g).then(function () {
      emit('data', { store: 'goals' });
      return g;
    });
  }

  function delGoal(id) {
    return App.db.del('goals', id).then(function () { emit('data', { store: 'goals' }); });
  }

  /* ---------------- Nhập nhanh ---------------- */

  /** Ghi nhớ cặp (hạng mục + số tiền) hay dùng để hiện nút nhập nhanh */
  function rememberQuickPick(tx) {
    if (tx.type !== 'expense') return Promise.resolve();
    var picks = (S.settings.quickPicks || []).slice();
    var key = tx.categoryId + ':' + tx.amount;
    var i = picks.findIndex(function (p) { return p.key === key; });
    if (i >= 0) { picks[i].count = (picks[i].count || 1) + 1; picks[i].at = Date.now(); }
    else picks.push({ key: key, categoryId: tx.categoryId, amount: tx.amount, count: 1, at: Date.now() });
    picks.sort(function (a, b) { return (b.count - a.count) || (b.at - a.at); });
    picks = picks.slice(0, 8);
    return setSetting('quickPicks', picks);
  }

  return {
    S: S,
    on: on, off: off, emit: emit,
    load: load, applyTheme: applyTheme,
    cats: cats, cat: cat, catColor: catColor, setCategories: setCategories,
    setSetting: setSetting,
    setPeriod: setPeriod, setAnchor: setAnchor, shiftPeriod: shiftPeriod,
    currentRange: currentRange, isCurrentPeriod: isCurrentPeriod,
    txInRange: txInRange, allTx: allTx, saveTx: saveTx, delTx: delTx,
    getBudget: getBudget, setBudget: setBudget, catBudgetKey: catBudgetKey,
    allTasks: allTasks, saveTask: saveTask, delTask: delTask,
    allRecurring: allRecurring, saveRecurring: saveRecurring, delRecurring: delRecurring,
    allGoals: allGoals, saveGoal: saveGoal, delGoal: delGoal,
    rememberQuickPick: rememberQuickPick
  };
})();

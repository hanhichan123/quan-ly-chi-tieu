/* ===========================================================
   main.js — Khởi động app, điều hướng, thanh công cụ.
   =========================================================== */

App.VERSION = '1.2.0';

(function () {
  'use strict';

  var u = App.util, D = App.dates, M = App.money, st = App.state;

  var ROUTES = ['home', 'tx', 'tasks', 'stats', 'settings'];
  var DEFAULT_ROUTE = 'home';
  var currentRoute = null;

  var elScreen, elTitle, elActions, elPeriodBar, elPeriodLabel, elFab;

  /* ---------------- Điều hướng ---------------- */

  function routeFromHash() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    return ROUTES.indexOf(h) >= 0 ? h : DEFAULT_ROUTE;
  }

  function go(route) {
    location.hash = '#/' + route;
  }

  function render() {
    var route = routeFromHash();
    var screen = App.screens[route];
    if (!screen) { go(DEFAULT_ROUTE); return; }

    var changed = route !== currentRoute;
    currentRoute = route;

    // Thanh trên
    elTitle.textContent = screen.title || '';
    u.clear(elActions);
    (typeof screen.actions === 'function' ? screen.actions() : (screen.actions || []))
      .forEach(function (a) {
        elActions.appendChild(u.el('button', {
          class: 'icon-btn', type: 'button', text: a.icon,
          'aria-label': a.label, title: a.label, onclick: a.onClick
        }));
      });

    // Bộ chọn kỳ
    elPeriodBar.classList.toggle('hidden', !screen.showPeriod);
    if (screen.showPeriod) syncPeriodBar();

    // Nút "+" : ở tab Công việc thì thêm công việc, còn lại thêm giao dịch
    elFab.setAttribute('aria-label',
      route === 'tasks' ? 'Thêm công việc mới' : 'Thêm giao dịch mới');

    // Tab đang chọn
    u.$$('.tabbar a').forEach(function (a) {
      if (a.dataset.tab === route) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    if (changed) elScreen.scrollTop = 0;

    u.clear(elScreen);
    elScreen.appendChild(u.el('div', { class: 'empty', text: 'Đang tải…' }));
    try {
      screen.render(elScreen);
    } catch (e) {
      console.error('[render] ' + route, e);
      u.clear(elScreen);
      elScreen.appendChild(u.el('div', { class: 'alert alert--danger' }, [
        u.el('span', { class: 'ico', text: '⚠️' }),
        u.el('div', { class: 'alert__body', text: 'Lỗi hiển thị: ' + (e.message || e) })
      ]));
    }
  }

  App.router = {
    go: go,
    refresh: function () { render(); },
    current: function () { return currentRoute; }
  };

  /* ---------------- Bộ chọn kỳ ---------------- */

  function syncPeriodBar() {
    var r = st.currentRange();
    elPeriodLabel.textContent = r.label;
    u.$$('#periodBar .segmented button').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.period === st.S.period));
    });
    // Không cho đi quá tương lai xa: cho phép tối đa kỳ hiện tại + 1
    var next = u.$('#periodNext');
    next.disabled = r.start > D.today();
    next.style.opacity = next.disabled ? '0.3' : '';
  }

  function wirePeriodBar() {
    u.$$('#periodBar .segmented button').forEach(function (b) {
      b.addEventListener('click', function () {
        st.setPeriod(b.dataset.period);
        st.setAnchor(D.today());
      });
    });
    u.$('#periodPrev').addEventListener('click', function () { st.shiftPeriod(-1); });
    u.$('#periodNext').addEventListener('click', function () { st.shiftPeriod(1); });
    u.$('#periodLabel').addEventListener('click', function () {
      st.setAnchor(D.today());
      u.toast('Đã về kỳ hiện tại');
    });
  }

  /* ---------------- Nút "+" ---------------- */

  function wireFab() {
    elFab.addEventListener('click', function () {
      if (currentRoute === 'tasks') App.taskEditor.open(null);
      else App.txEditor.open(null, { onSaved: App.router.refresh });
    });
  }

  /* ---------------- Thông báo vượt hạn mức ---------------- */

  function maybeNotify() {
    if (!st.S.settings.notifyEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Chỉ nhắc 1 lần mỗi ngày
    var todayKey = D.today();
    if (st.S.settings.lastNotifyDate === todayKey) return;

    App.budget.overview().then(function (ov) {
      var overs = [ov.week, ov.month].filter(function (s) { return s.level === 'over'; });
      if (!overs.length) return;
      try {
        new Notification('Vượt hạn mức chi tiêu', {
          body: overs.map(function (s) {
            return s.name + ': ' + M.format(s.spent) + ' / ' + M.format(s.limit);
          }).join('\n'),
          icon: 'icons/icon-192.png',
          tag: 'qlct-over'
        });
        st.setSetting('lastNotifyDate', todayKey);
      } catch (e) { /* một số trình duyệt chặn Notification ngoài service worker */ }
    });
  }

  /* ---------------- Service Worker ---------------- */

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;   // file:// không chạy được SW

    navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            u.confirm({
              title: 'Có bản cập nhật',
              text: 'Phiên bản mới của app đã tải xong. Tải lại để dùng bản mới?',
              okLabel: 'Tải lại', cancelLabel: 'Để sau'
            }).then(function (ok) {
              if (!ok) return;
              nw.postMessage({ type: 'SKIP_WAITING' });
              setTimeout(function () { location.reload(); }, 250);
            });
          }
        });
      });
    }).catch(function (e) {
      console.warn('[sw] không đăng ký được:', e && e.message);
    });
  }

  /* ---------------- Khởi động ---------------- */

  function boot() {
    elScreen = u.$('#screen');
    elTitle = u.$('#screenTitle');
    elActions = u.$('#screenActions');
    elPeriodBar = u.$('#periodBar');
    elPeriodLabel = u.$('#periodLabel');
    elFab = u.$('#fab');

    wirePeriodBar();
    wireFab();

    window.addEventListener('hashchange', render);
    st.on('period', function () { syncPeriodBar(); render(); });
    st.on('settings', function (e) {
      if (e.key === 'currency' || e.key === 'theme') { /* render lại do nơi gọi tự lo */ }
    });

    // Đổi chế độ sáng/tối của hệ thống -> cập nhật màu thanh trạng thái
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', function () { st.applyTheme(); });
    }

    // Quay lại app sau một thời gian -> nếu đã sang ngày mới thì vẽ lại
    var bootDay = D.today();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && D.today() !== bootDay) {
        bootDay = D.today();
        st.setAnchor(D.today());
        render();
      }
    });

    if (!location.hash) location.replace('#/' + DEFAULT_ROUTE);

    st.load().then(function () {
      // Đang bật khoá thì phải mở khoá xong mới vẽ dữ liệu ra màn hình,
      // tránh việc số liệu loé lên trong tích tắc trước khi bị che.
      return App.lock.gate();
    }).then(function () {
      App.lock.watchIdle();
      render();
      registerSW();
      return App.recurring.promptIfDue();
    }).then(function () {
      maybeNotify();
    }).catch(function (e) {
      console.error('[boot]', e);
      u.clear(elScreen);
      elScreen.appendChild(u.el('div', { class: 'alert alert--danger' }, [
        u.el('span', { class: 'ico', text: '⚠️' }),
        u.el('div', { class: 'alert__body' }, [
          u.el('div', { class: 'alert__title', text: 'Không khởi động được' }),
          u.el('div', { text: (e && e.message) || String(e) })
        ])
      ]));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

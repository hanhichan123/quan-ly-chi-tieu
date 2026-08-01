/* ===========================================================
   screens/home.js — Tổng quan.
   Luôn tính theo NGÀY HÔM NAY (không phụ thuộc bộ chọn kỳ),
   vì đây là màn hình "tình hình hiện tại".
   =========================================================== */

(function () {
  'use strict';

  var u = App.util, D = App.dates, M = App.money, st = App.state,
      B = App.budget, C = App.charts;

  App.screens = App.screens || {};

  App.screens.home = {
    title: 'Tổng quan',
    showPeriod: false,

    render: function (root) {
      Promise.all([B.overview(), st.allTasks(), st.allGoals()])
        .then(function (res) {
          var ov = res[0], tasks = res[1], goals = res[2];
          u.clear(root);

          root.appendChild(alertsBlock(ov));
          root.appendChild(balanceCard(ov));
          root.appendChild(limitsCard(ov));

          var qp = quickPicksCard();
          if (qp) root.appendChild(qp);

          var td = todayTasksCard(tasks);
          if (td) root.appendChild(td);

          var g = goalsCard(goals);
          if (g) root.appendChild(g);

          root.appendChild(recentCard(ov));
        })
        .catch(function (e) {
          console.error(e);
          u.clear(root);
          root.appendChild(u.el('div', { class: 'alert alert--danger' }, [
            u.el('span', { class: 'ico', text: '⚠️' }),
            u.el('div', { class: 'alert__body', text: 'Không đọc được dữ liệu: ' + (e.message || e) })
          ]));
        });
    }
  };

  /* ---------------- Cảnh báo ---------------- */

  function alertsBlock(ov) {
    var box = u.el('div');
    var overs = [ov.day, ov.week, ov.month].filter(function (s) { return s.level === 'over'; });
    var warns = [ov.day, ov.week, ov.month].filter(function (s) { return s.level === 'warn'; });

    if (overs.length) {
      box.appendChild(u.el('div', { class: 'alert alert--danger', role: 'alert' }, [
        u.el('span', { class: 'ico', text: '🚨' }),
        u.el('div', { class: 'alert__body' }, [
          u.el('div', { class: 'alert__title', text: 'Đã vượt hạn mức!' }),
          u.el('div', {
            text: overs.map(function (s) {
              return s.name.toLowerCase() + ' vượt ' + M.format(s.over);
            }).join(' · ')
          })
        ])
      ]));
    } else if (warns.length) {
      box.appendChild(u.el('div', { class: 'alert alert--warn', role: 'alert' }, [
        u.el('span', { class: 'ico', text: '⚠️' }),
        u.el('div', { class: 'alert__body' }, [
          u.el('div', { class: 'alert__title', text: 'Sắp chạm hạn mức' }),
          u.el('div', {
            text: warns.map(function (s) {
              return s.name.toLowerCase() + ' còn ' + M.format(s.remaining);
            }).join(' · ')
          })
        ])
      ]));
    }
    return box;
  }

  /* ---------------- Số dư tháng ---------------- */

  function balanceCard(ov) {
    var card = u.el('div', { class: 'card' });
    var bal = ov.balance;

    card.appendChild(u.el('div', { class: 'spread', style: 'align-items:flex-start' }, [
      u.el('div', {}, [
        u.el('div', { class: 'small muted', text: 'Số dư tháng ' + (D.fromISO(D.today()).getMonth() + 1) }),
        u.el('div', {
          class: 'amt amt--big' + (bal < 0 ? ' amt--neg' : ''),
          text: (bal < 0 ? '−' : '') + M.format(Math.abs(bal))
        })
      ]),
      ov.dailyAllowance > 0 ? u.el('div', { style: 'text-align:right' }, [
        u.el('div', { class: 'small muted', text: 'Nên tiêu mỗi ngày' }),
        u.el('div', { class: 'amt', style: 'font-size:17px;color:var(--primary)', text: M.format(ov.dailyAllowance) }),
        u.el('div', { class: 'small muted', text: 'còn ' + ov.daysLeftInMonth + ' ngày' })
      ]) : null
    ]));

    card.appendChild(u.el('div', { class: 'stats-grid mt3' }, [
      stat('Thu vào', M.compact(ov.income), 'var(--income)'),
      stat('Chi ra', M.compact(ov.expense), 'var(--danger)'),
      stat('Tỉ lệ để dành', ov.income > 0 ? Math.round(bal / ov.income * 100) + '%' : '—',
        bal >= 0 ? 'var(--ok)' : 'var(--danger)')
    ]));
    return card;
  }

  function stat(label, value, color) {
    return u.el('div', { class: 'stat' }, [
      u.el('div', { class: 'stat__label', text: label }),
      u.el('div', { class: 'stat__value', style: color ? 'color:' + color : null, text: value })
    ]);
  }

  /* ---------------- Ba thanh hạn mức ---------------- */

  function limitsCard(ov) {
    var card = u.el('div', { class: 'card' });
    card.appendChild(u.el('div', { class: 'card__head' }, [
      u.el('h2', { class: 'card__title', text: 'Hạn mức chi tiêu' }),
      u.el('button', {
        class: 'card__link', type: 'button', text: 'Chỉnh sửa',
        onclick: function () { App.settingsUI.openLimits(); }
      })
    ]));

    var any = ov.day.limit || ov.week.limit || ov.month.limit;
    [ov.day, ov.week, ov.month].forEach(function (s) {
      card.appendChild(C.limitBar(s, {
        onSetLimit: function () { App.settingsUI.openLimits(); }
      }));
    });

    if (!any) {
      card.appendChild(u.el('div', { class: 'alert alert--info mt3', style: 'margin-bottom:0' }, [
        u.el('span', { class: 'ico', text: '💡' }),
        u.el('div', { class: 'alert__body', text: 'Đặt hạn mức để app cảnh báo khi bạn tiêu quá tay.' })
      ]));
    }
    return card;
  }

  /* ---------------- Nhập nhanh ---------------- */

  function quickPicksCard() {
    var picks = (st.S.settings.quickPicks || []).slice(0, 6);
    if (!picks.length) return null;

    var card = u.el('div', { class: 'card' });
    card.appendChild(u.el('div', { class: 'card__head' }, [
      u.el('h2', { class: 'card__title', text: 'Nhập nhanh' })
    ]));

    var box = u.el('div', { class: 'chips' });
    picks.forEach(function (p) {
      var c = st.cat(p.categoryId);
      box.appendChild(u.el('button', {
        class: 'chip', type: 'button',
        text: c.emoji + ' ' + c.name + ' · ' + M.format(p.amount),
        onclick: function () { quickSave(p); }
      }));
    });
    card.appendChild(box);
    card.appendChild(u.el('div', {
      class: 'field__hint', style: 'margin-top:10px',
      text: 'Chạm để ghi ngay khoản này cho hôm nay. Danh sách tự cập nhật theo thói quen của bạn.'
    }));
    return card;
  }

  function quickSave(p) {
    var rec = {
      type: 'expense', amount: p.amount, categoryId: p.categoryId,
      date: D.today(), note: '', photo: null
    };
    var check = st.S.settings.confirmOverLimit ? B.checkBeforeSave(rec) : Promise.resolve([]);
    check.then(function (hits) {
      if (!hits.length) return true;
      return u.confirm({
        title: '⚠️ Vượt hạn mức',
        text: 'Khoản ' + M.format(p.amount) + ' này sẽ làm vượt ' + hits[0].name +
          ' (' + M.format(hits[0].after) + ' / ' + M.format(hits[0].limit) + '). Vẫn ghi?',
        okLabel: 'Vẫn ghi', cancelLabel: 'Thôi', danger: true
      });
    }).then(function (ok) {
      if (!ok) return;
      return st.saveTx(rec).then(function (saved) {
        return st.rememberQuickPick(saved);
      }).then(function () {
        u.toast('Đã ghi ' + M.format(p.amount), 'ok');
        App.router.refresh();
      });
    });
  }

  /* ---------------- Công việc hôm nay ---------------- */

  function todayTasksCard(tasks) {
    var t = D.today();
    var due = tasks.filter(function (x) {
      return !x.done && x.due && x.due <= t;
    }).slice(0, 5);
    if (!due.length) return null;

    var overdue = due.filter(function (x) { return x.due < t; }).length;
    var card = u.el('div', { class: 'card card--pad0' });
    card.appendChild(u.el('div', { class: 'card__head', style: 'padding:16px 16px 8px;margin:0' }, [
      u.el('h2', { class: 'card__title', text: 'Việc cần làm' + (overdue ? ' (' + overdue + ' quá hạn)' : '') }),
      u.el('a', { class: 'card__link', href: '#/tasks', text: 'Xem tất cả' })
    ]));
    due.forEach(function (x) { card.appendChild(App.taskRow(x, App.router.refresh)); });
    return card;
  }

  /* ---------------- Mục tiêu tiết kiệm ---------------- */

  function goalsCard(goals) {
    if (!goals.length) return null;
    var card = u.el('div', { class: 'card' });
    card.appendChild(u.el('div', { class: 'card__head' }, [
      u.el('h2', { class: 'card__title', text: 'Mục tiêu tiết kiệm' }),
      u.el('button', {
        class: 'card__link', type: 'button', text: 'Quản lý',
        onclick: function () { App.goalsUI.openList(); }
      })
    ]));
    goals.slice(0, 3).forEach(function (g) {
      card.appendChild(App.goalsUI.row(g));
    });
    return card;
  }

  /* ---------------- Giao dịch gần đây ---------------- */

  function recentCard(ov) {
    var recent = ov.monthList.slice(0, 5);
    var card = u.el('div', { class: 'card card--pad0' });
    card.appendChild(u.el('div', { class: 'card__head', style: 'padding:16px 16px 8px;margin:0' }, [
      u.el('h2', { class: 'card__title', text: 'Giao dịch gần đây' }),
      u.el('a', { class: 'card__link', href: '#/tx', text: 'Xem tất cả' })
    ]));

    if (!recent.length) {
      card.appendChild(u.el('div', { class: 'empty' }, [
        u.el('span', { class: 'ico', text: '🧾' }),
        u.el('div', { class: 'empty__title', text: 'Chưa có giao dịch nào' }),
        u.el('p', { text: 'Nhấn nút + màu xanh để ghi khoản đầu tiên.' })
      ]));
    } else {
      recent.forEach(function (t) { card.appendChild(App.txRow(t)); });
    }
    return card;
  }
})();

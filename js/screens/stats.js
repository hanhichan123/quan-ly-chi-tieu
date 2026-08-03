/* ===========================================================
   screens/stats.js — Thống kê & biểu đồ theo kỳ đang chọn.
   =========================================================== */

(function () {
  'use strict';

  var u = App.util, D = App.dates, M = App.money, st = App.state,
      B = App.budget, C = App.charts;

  App.screens = App.screens || {};

  var viewType = 'expense';   // 'expense' | 'income'

  App.screens.stats = {
    title: 'Thống kê',
    showPeriod: true,

    render: function (root) {
      var r = st.currentRange();
      var prev = D.range(r.period, D.shift(r.period, r.anchor, -1, st.S.settings.weekStart), st.S.settings.weekStart);

      // Khoảng 6 tháng gần nhất để vẽ xu hướng
      var trendStart = D.startOfMonth(D.addMonths(r.anchor, -5));
      var trendEnd = D.endOfMonth(r.anchor);
      var lo = [r.start, prev.start, trendStart].sort()[0];
      var hi = [r.end, prev.end, trendEnd].sort().reverse()[0];

      st.txInRange(lo, hi).then(function (all) {
        u.clear(root);

        var cur = all.filter(function (t) { return t.date >= r.start && t.date <= r.end; });
        var pre = all.filter(function (t) { return t.date >= prev.start && t.date <= prev.end; });

        root.appendChild(typeSwitch());
        root.appendChild(headlineCard(cur, pre, r, prev));

        if (!cur.filter(function (t) { return t.type === viewType; }).length) {
          root.appendChild(u.el('div', { class: 'card empty' }, [
            u.el('span', { class: 'ico', text: '📊' }),
            u.el('div', { class: 'empty__title', text: 'Chưa có dữ liệu trong kỳ này' }),
            u.el('p', { text: 'Ghi vài giao dịch rồi quay lại xem biểu đồ nhé.' })
          ]));
        } else {
          root.appendChild(donutCard(cur, r));
          root.appendChild(paymentCard(cur));
          root.appendChild(barsCard(cur, all, r));
        }

        var limitsCard = catLimitsCard(all, r);
        if (limitsCard) root.appendChild(limitsCard);

        root.appendChild(trendCard(all, r));
      });
    }
  };

  /* ---------------- Chuyển Chi / Thu ---------------- */

  function typeSwitch() {
    var box = u.el('div', { class: 'typeswitch' });
    [['expense', 'Chi tiêu'], ['income', 'Thu nhập']].forEach(function (p) {
      box.appendChild(u.el('button', {
        type: 'button', dataset: { type: p[0] },
        'aria-pressed': String(viewType === p[0]),
        text: p[1],
        onclick: function () {
          if (viewType === p[0]) return;
          viewType = p[0];
          App.router.refresh();
        }
      }));
    });
    return box;
  }

  /* ---------------- Số tổng + so sánh kỳ trước ---------------- */

  function headlineCard(cur, pre, r, prevRange) {
    var pick = viewType === 'income' ? B.sumIncome : B.sumExpense;
    var now = pick(cur), was = pick(pre);
    var diff = now - was;
    var pctChange = was > 0 ? Math.round(diff / was * 100) : (now > 0 ? 100 : 0);

    var avgPerDay = r.days > 0 ? Math.round(now / r.days) : 0;
    var card = u.el('div', { class: 'card' });

    var heading = App.i18n.pick(
      (viewType === 'income' ? 'Tổng thu ' : 'Tổng chi ') + r.label,
      (viewType === 'income' ? 'Income · ' : 'Spent · ') + r.label,
      r.label + (viewType === 'income' ? ' の収入合計' : ' の支出合計')
    );
    card.appendChild(u.el('div', {}, [
      u.el('div', { class: 'small muted', text: heading }),
      u.el('div', { class: 'amt amt--big', text: M.format(now) })
    ]));

    var better = viewType === 'income' ? diff >= 0 : diff <= 0;
    var arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '=';
    var change = diff === 0
      ? App.i18n.pick('Không đổi', 'No change', '変化なし')
      : M.format(Math.abs(diff)) + ' (' + Math.abs(pctChange) + '%)';
    var compareText = App.i18n.pick(
      arrow + ' ' + change + ' so với ' + D.periodName(r.period) + ' trước (' + M.format(was) + ')',
      arrow + ' ' + change + ' vs last ' + D.periodName(r.period) + ' (' + M.format(was) + ')',
      arrow + ' 前' + D.periodName(r.period) + '（' + M.format(was) + '）と比べて ' + change
    );
    card.appendChild(u.el('div', {
      class: 'small mt2',
      style: 'font-weight:600;color:' + (diff === 0 ? 'var(--text-dim)' : better ? 'var(--ok)' : 'var(--danger)'),
      text: compareText
    }));

    card.appendChild(u.el('div', { class: 'stats-grid mt3' }, [
      cell('Trung bình/ngày', M.compact(avgPerDay)),
      cell('Số giao dịch', String(cur.filter(function (t) { return t.type === viewType; }).length)),
      cell('Số ngày', String(r.days))
    ]));
    return card;
  }

  function cell(label, value) {
    return u.el('div', { class: 'stat' }, [
      u.el('div', { class: 'stat__label', text: label }),
      u.el('div', { class: 'stat__value', text: value })
    ]);
  }

  /* ---------------- Donut theo hạng mục ---------------- */

  function donutCard(cur, r) {
    var rows = B.byCategory(cur, viewType);
    var items = rows.map(function (x) {
      return {
        label: x.category.name, value: x.amount,
        color: 'var(--' + x.category.color + ')', emoji: x.category.emoji
      };
    });

    var card = u.el('div', { class: 'card' });
    card.appendChild(u.el('div', { class: 'card__head' }, [
      u.el('h2', { class: 'card__title', text: 'Theo hạng mục' })
    ]));
    card.appendChild(C.donut(items, {
      centerLabel: viewType === 'income' ? 'Tổng thu' : 'Tổng chi',
      ariaLabel: 'Tỉ trọng theo hạng mục trong ' + r.label
    }));
    card.appendChild(C.legend(items));

    // Bấm vào hạng mục -> mở tab Chi tiêu đã lọc sẵn
    card.appendChild(u.el('div', { class: 'field__hint center mt3', text: 'Chạm vào lát màu để xem số chi tiết.' }));
    return card;
  }

  /* ---------------- Theo phương thức thanh toán ---------------- */

  function paymentCard(cur) {
    var map = {};
    cur.forEach(function (t) {
      if (t.type !== viewType) return;
      var key = t.paymentId || '__none';
      map[key] = (map[key] || 0) + t.amount;
    });

    var ids = Object.keys(map);
    if (!ids.length) return u.el('span');

    var items = ids.map(function (id) {
      var p = id === '__none' ? null : st.pay(id);
      return {
        label: p ? p.name : 'Không ghi phương thức',
        value: map[id],
        color: 'var(--' + (p ? p.color : 'c12') + ')',
        emoji: p ? p.emoji : '❔'
      };
    }).sort(function (a, b) { return b.value - a.value; });

    var card = u.el('div', { class: 'card' });
    card.appendChild(u.el('div', { class: 'card__head' }, [
      u.el('h2', { class: 'card__title', text: 'Theo phương thức thanh toán' })
    ]));

    // Chỉ 1 phương thức thì vẽ donut là thừa, hiện chú giải cho gọn
    if (items.length > 1) {
      card.appendChild(C.donut(items, {
        centerLabel: viewType === 'income' ? 'Tổng thu' : 'Tổng chi',
        ariaLabel: 'Tỉ trọng theo phương thức thanh toán'
      }));
    }
    card.appendChild(C.legend(items));
    return card;
  }

  /* ---------------- Cột theo ngày / tháng ---------------- */

  function barsCard(cur, all, r) {
    var card = u.el('div', { class: 'card' });
    var data, title, limit = 0;

    if (r.period === 'day') {
      // Xem theo ngày thì vẽ 14 ngày gần đây cho có ngữ cảnh so sánh
      title = '14 ngày gần đây';
      var start = D.addDays(r.end, -13);
      data = B.byDay(all, start, r.end, viewType).map(function (d) {
        return {
          label: String(D.fromISO(d.date).getDate()),
          full: D.fmtDayHeading(d.date),
          value: d.amount,
          highlight: d.date === r.anchor
        };
      });
      if (viewType === 'expense') limit = st.getBudget('daily');
    } else if (r.period === 'year') {
      title = 'Theo tháng';
      data = monthsOf(cur, r);
    } else {
      title = r.period === 'week' ? 'Theo ngày trong tuần' : 'Theo ngày trong tháng';
      data = B.byDay(cur, r.start, r.end, viewType).map(function (d) {
        return {
          label: r.period === 'week' ? D.dowShort(d.date) : String(D.fromISO(d.date).getDate()),
          full: D.fmtDayHeading(d.date),
          value: d.amount,
          highlight: d.date === D.today()
        };
      });
      if (viewType === 'expense') limit = st.getBudget('daily');
    }

    card.appendChild(u.el('div', { class: 'card__head' }, [
      u.el('h2', { class: 'card__title', text: title }),
      limit ? u.el('span', { class: 'small', style: 'color:var(--danger)', text: '┄ hạn mức ngày' }) : null
    ]));
    card.appendChild(C.bars(data, {
      limit: limit,
      readoutHint: 'Chạm vào cột để xem số tiền',
      ariaLabel: title
    }));
    return card;
  }

  function monthsOf(list, r) {
    var out = [];
    for (var i = 0; i < 12; i++) {
      var m = D.addMonths(D.startOfYear(r.anchor), i);
      var s = D.startOfMonth(m), e = D.endOfMonth(m);
      var v = u.sum(list.filter(function (t) {
        return t.type === viewType && t.date >= s && t.date <= e;
      }), function (t) { return t.amount; });
      out.push({ label: String(D.fromISO(m).getMonth() + 1), full: 'Tháng ' + (D.fromISO(m).getMonth() + 1), value: v });
    }
    return out;
  }

  /* ---------------- Hạn mức riêng theo hạng mục ---------------- */

  function catLimitsCard(all, r) {
    if (viewType !== 'expense') return null;
    var mr = D.range('month', r.anchor, st.S.settings.weekStart);
    var monthList = all.filter(function (t) { return t.date >= mr.start && t.date <= mr.end; });
    var limits = B.categoryLimits(monthList);
    if (!limits.length) return null;

    var card = u.el('div', { class: 'card' });
    card.appendChild(u.el('div', { class: 'card__head' }, [
      u.el('h2', { class: 'card__title', text: 'Hạn mức theo hạng mục (tháng)' }),
      u.el('button', {
        class: 'card__link', type: 'button', text: 'Chỉnh sửa',
        onclick: function () { App.settingsUI.openCategoryLimits(); }
      })
    ]));
    limits.forEach(function (s) { card.appendChild(C.limitBar(s)); });
    return card;
  }

  /* ---------------- Xu hướng 6 tháng ---------------- */

  function trendCard(all, r) {
    var pts = [];
    for (var i = 5; i >= 0; i--) {
      var m = D.addMonths(r.anchor, -i);
      var s = D.startOfMonth(m), e = D.endOfMonth(m);
      var v = u.sum(all.filter(function (t) {
        return t.type === viewType && t.date >= s && t.date <= e;
      }), function (t) { return t.amount; });
      pts.push({ label: D.monthShort(m), value: v });
    }

    var card = u.el('div', { class: 'card' });
    card.appendChild(u.el('div', { class: 'card__head' }, [
      u.el('h2', { class: 'card__title', text: 'Xu hướng 6 tháng' })
    ]));
    card.appendChild(C.line(pts, { ariaLabel: 'Xu hướng 6 tháng gần nhất' }));

    var vals = pts.map(function (p) { return p.value; }).filter(function (v) { return v > 0; });
    if (vals.length >= 2) {
      var avg = Math.round(u.sum(vals) / vals.length);
      card.appendChild(u.el('div', { class: 'small muted center', text: 'Trung bình ' + M.format(avg) + '/tháng' }));
    }
    return card;
  }
})();

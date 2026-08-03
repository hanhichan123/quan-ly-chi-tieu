/* ===========================================================
   budget.js — Tính toán hạn mức và mức cảnh báo.

   Quy ước mức:
     none  : chưa đặt hạn mức
     ok    : dưới ngưỡng cảnh báo
     warn  : từ ngưỡng cảnh báo (mặc định 80%) đến 100%
     over  : vượt 100%
   =========================================================== */

App.budget = (function () {
  'use strict';

  var st = App.state;
  var D = App.dates;
  var u = App.util;

  function level(spent, limit) {
    if (!limit) return 'none';
    var pct = spent / limit * 100;
    var warnAt = st.S.settings.warnThreshold || 80;
    if (pct > 100) return 'over';
    if (pct >= warnAt) return 'warn';
    return 'ok';
  }

  /** Gói thông tin một hạn mức để vẽ ra màn hình */
  function stat(name, periodKey, spent, limit, range) {
    var lv = level(spent, limit);
    return {
      name: name,
      key: periodKey,
      spent: spent,
      limit: limit,
      remaining: limit ? limit - spent : 0,
      over: limit && spent > limit ? spent - limit : 0,
      pct: limit ? spent / limit * 100 : 0,
      level: lv,
      range: range || null
    };
  }

  function sumExpense(list) {
    return u.sum(list.filter(function (t) { return t.type === 'expense'; }), function (t) { return t.amount; });
  }

  function sumIncome(list) {
    return u.sum(list.filter(function (t) { return t.type === 'income'; }), function (t) { return t.amount; });
  }

  /**
   * Ba hạn mức Ngày / Tuần / Tháng tính quanh một ngày mốc (mặc định hôm nay).
   * Trả về Promise<{day, week, month, extra}>
   */
  function overview(anchorISO) {
    var anchor = anchorISO || D.today();
    var ws = st.S.settings.weekStart;
    var rDay = D.range('day', anchor, ws);
    var rWeek = D.range('week', anchor, ws);
    var rMonth = D.range('month', anchor, ws);

    // Tháng bao trọn tuần và ngày trong đa số trường hợp; lấy khoảng rộng nhất rồi lọc lại.
    var lo = [rDay.start, rWeek.start, rMonth.start].sort()[0];
    var hi = [rDay.end, rWeek.end, rMonth.end].sort().reverse()[0];

    return st.txInRange(lo, hi).then(function (all) {
      function inR(r) {
        return all.filter(function (t) { return t.date >= r.start && t.date <= r.end; });
      }
      var dayList = inR(rDay), weekList = inR(rWeek), monthList = inR(rMonth);

      var day = stat('Hôm nay', 'daily', sumExpense(dayList), st.getBudget('daily'), rDay);
      var week = stat('Tuần này', 'weekly', sumExpense(weekList), st.getBudget('weekly'), rWeek);
      var month = stat('Tháng này', 'monthly', sumExpense(monthList), st.getBudget('monthly'), rMonth);

      var daysLeft = D.daysLeftIn(rMonth);
      return {
        day: day, week: week, month: month,
        income: sumIncome(monthList),
        expense: month.spent,
        balance: sumIncome(monthList) - month.spent,
        daysLeftInMonth: daysLeft,
        // Còn được tiêu trung bình mỗi ngày cho đến hết tháng
        dailyAllowance: month.limit && daysLeft > 0
          ? Math.max(0, Math.floor((month.limit - month.spent) / daysLeft))
          : 0,
        monthList: monthList
      };
    });
  }

  /**
   * Kiểm tra một khoản chi SẮP LƯU có làm vượt hạn mức nào không.
   * tx: {type, amount, date, categoryId, id?}  (id có nghĩa là đang sửa)
   * Trả về Promise<Array<{name, limit, before, after, over}>>
   */
  function checkBeforeSave(tx) {
    if (tx.type !== 'expense' || !tx.amount) return Promise.resolve([]);
    var ws = st.S.settings.weekStart;
    var rDay = D.range('day', tx.date, ws);
    var rWeek = D.range('week', tx.date, ws);
    var rMonth = D.range('month', tx.date, ws);

    var lo = [rDay.start, rWeek.start, rMonth.start].sort()[0];
    var hi = [rDay.end, rWeek.end, rMonth.end].sort().reverse()[0];

    return st.txInRange(lo, hi).then(function (all) {
      // Bỏ chính nó ra nếu đang sửa
      if (tx.id) all = all.filter(function (t) { return t.id !== tx.id; });

      var checks = [
        { r: rDay, key: 'daily', name: 'hạn mức ngày' },
        { r: rWeek, key: 'weekly', name: 'hạn mức tuần' },
        { r: rMonth, key: 'monthly', name: 'hạn mức tháng' }
      ];

      var hits = [];
      checks.forEach(function (c) {
        var limit = st.getBudget(c.key);
        if (!limit) return;
        var before = sumExpense(all.filter(function (t) {
          return t.date >= c.r.start && t.date <= c.r.end;
        }));
        var after = before + tx.amount;
        if (after > limit) {
          hits.push({ name: c.name, limit: limit, before: before, after: after, over: after - limit });
        }
      });

      // Hạn mức riêng của hạng mục (theo tháng)
      var catLimit = st.getBudget(st.catBudgetKey(tx.categoryId));
      if (catLimit) {
        var beforeCat = sumExpense(all.filter(function (t) {
          return t.categoryId === tx.categoryId && t.date >= rMonth.start && t.date <= rMonth.end;
        }));
        var afterCat = beforeCat + tx.amount;
        if (afterCat > catLimit) {
          hits.push({
            name: 'hạn mức tháng của "' + st.cat(tx.categoryId).name + '"',
            limit: catLimit, before: beforeCat, after: afterCat, over: afterCat - catLimit
          });
        }
      }
      return hits;
    });
  }

  /** Tổng chi theo từng hạng mục trong khoảng, sắp xếp giảm dần */
  function byCategory(list, type) {
    var wanted = type || 'expense';
    var map = {};
    list.forEach(function (t) {
      if (t.type !== wanted) return;
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    });
    var total = u.sum(Object.keys(map), function (k) { return map[k]; });
    return Object.keys(map).map(function (id) {
      return {
        categoryId: id,
        category: st.cat(id),
        amount: map[id],
        pct: total ? map[id] / total * 100 : 0
      };
    }).sort(function (a, b) { return b.amount - a.amount; });
  }

  /** Tổng chi mỗi ngày trong khoảng (dùng cho biểu đồ cột) */
  function byDay(list, start, end, type) {
    var wanted = type || 'expense';
    var map = {};
    list.forEach(function (t) {
      if (t.type !== wanted) return;
      map[t.date] = (map[t.date] || 0) + t.amount;
    });
    return D.listDays(start, end).map(function (d) {
      return { date: d, amount: map[d] || 0 };
    });
  }

  /** Danh sách hạn mức riêng theo hạng mục đã đặt, kèm mức tiêu trong tháng */
  function categoryLimits(monthList) {
    var out = [];
    st.cats('expense').forEach(function (c) {
      var limit = st.getBudget(st.catBudgetKey(c.id));
      if (!limit) return;
      var spent = u.sum(monthList.filter(function (t) {
        return t.type === 'expense' && t.categoryId === c.id;
      }), function (t) { return t.amount; });
      out.push(stat(c.emoji + ' ' + App.i18n.t(c.name), 'cat:' + c.id, spent, limit, null));
    });
    return out.sort(function (a, b) { return b.pct - a.pct; });
  }

  return {
    level: level, stat: stat,
    sumExpense: sumExpense, sumIncome: sumIncome,
    overview: overview, checkBeforeSave: checkBeforeSave,
    byCategory: byCategory, byDay: byDay, categoryLimits: categoryLimits
  };
})();

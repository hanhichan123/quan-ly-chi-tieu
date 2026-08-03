/* ===========================================================
   dates.js — Xử lý ngày tháng theo giờ địa phương.
   Mọi ngày lưu trong CSDL là chuỗi 'YYYY-MM-DD' (không kèm giờ)
   để tránh lệch múi giờ khi dùng Date.toISOString().
   =========================================================== */

App.dates = (function () {
  'use strict';

  /* Tên thứ và tháng theo từng ngôn ngữ.
     Các chuỗi ngày tháng đều là chuỗi ghép động nên không nhờ bộ dịch DOM được,
     phải xử lý ngay tại đây. */
  var NAMES = {
    vi: {
      dowShort: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
      dowLong: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
      monthShort: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12']
    },
    en: {
      dowShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      dowLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      monthShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    }
  };

  function L() { return (App.i18n && App.i18n.lang === 'en') ? NAMES.en : NAMES.vi; }
  function isEn() { return !!(App.i18n && App.i18n.lang === 'en'); }
  function pick(vi, en) { return isEn() ? en : vi; }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /** Date -> 'YYYY-MM-DD' theo giờ máy */
  function toISO(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /** 'YYYY-MM-DD' -> Date lúc 00:00 giờ máy */
  function fromISO(iso) {
    var p = String(iso).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function today() { return toISO(new Date()); }

  function addDays(iso, n) {
    var d = fromISO(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  }

  /** Cộng tháng, kẹp ngày nếu tháng đích ngắn hơn (31/1 + 1 tháng = 28/2) */
  function addMonths(iso, n) {
    var d = fromISO(iso);
    var day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
    return toISO(d);
  }

  function daysInMonth(year, monthIdx) {
    return new Date(year, monthIdx + 1, 0).getDate();
  }

  /** weekStart: 1 = Thứ hai (mặc định), 0 = Chủ nhật */
  function startOfWeek(iso, weekStart) {
    var ws = (weekStart === 0 ? 0 : 1);
    var d = fromISO(iso);
    var diff = (d.getDay() - ws + 7) % 7;
    d.setDate(d.getDate() - diff);
    return toISO(d);
  }

  function endOfWeek(iso, weekStart) { return addDays(startOfWeek(iso, weekStart), 6); }

  function startOfMonth(iso) { return iso.slice(0, 7) + '-01'; }

  function endOfMonth(iso) {
    var d = fromISO(iso);
    return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  }

  function startOfYear(iso) { return iso.slice(0, 4) + '-01-01'; }
  function endOfYear(iso) { return iso.slice(0, 4) + '-12-31'; }

  /** Số ngày từ a đến b (bao gồm cả 2 đầu) */
  function daysBetween(a, b) {
    return Math.round((fromISO(b) - fromISO(a)) / 86400000) + 1;
  }

  /** Danh sách ngày trong khoảng */
  function listDays(start, end) {
    var out = [], cur = start, guard = 0;
    while (cur <= end && guard++ < 800) { out.push(cur); cur = addDays(cur, 1); }
    return out;
  }

  /**
   * Khoảng thời gian của một kỳ.
   * period: 'day' | 'week' | 'month' | 'year'
   * Trả về {start, end, period, anchor, label, sublabel}
   */
  function range(period, anchor, weekStart) {
    var start, end;
    if (period === 'day') { start = end = anchor; }
    else if (period === 'week') { start = startOfWeek(anchor, weekStart); end = endOfWeek(anchor, weekStart); }
    else if (period === 'year') { start = startOfYear(anchor); end = endOfYear(anchor); }
    else { start = startOfMonth(anchor); end = endOfMonth(anchor); }
    return {
      period: period, anchor: anchor, start: start, end: end,
      label: rangeLabel(period, start, end),
      days: daysBetween(start, end)
    };
  }

  /** Lùi/tiến 1 kỳ */
  function shift(period, anchor, delta, weekStart) {
    if (period === 'day') return addDays(anchor, delta);
    if (period === 'week') return addDays(startOfWeek(anchor, weekStart), delta * 7);
    if (period === 'year') return addMonths(anchor, delta * 12);
    return addMonths(startOfMonth(anchor), delta);
  }

  function rangeLabel(period, start, end) {
    var s = fromISO(start);
    if (period === 'day') {
      var isToday = start === today();
      return (isToday ? pick('Hôm nay, ', 'Today, ') : '') +
        L().dowShort[s.getDay()] + ' ' + pad(s.getDate()) + '/' + pad(s.getMonth() + 1);
    }
    if (period === 'week') {
      var e = fromISO(end);
      return pad(s.getDate()) + '/' + pad(s.getMonth() + 1) + ' – ' + pad(e.getDate()) + '/' + pad(e.getMonth() + 1);
    }
    if (period === 'year') return pick('Năm ' + s.getFullYear(), s.getFullYear() + '');
    return pick('Tháng ' + (s.getMonth() + 1) + '/' + s.getFullYear(),
      L().monthShort[s.getMonth()] + ' ' + s.getFullYear());
  }

  function periodName(period) {
    if (period === 'day') return pick('ngày', 'day');
    if (period === 'week') return pick('tuần', 'week');
    if (period === 'year') return pick('năm', 'year');
    return pick('tháng', 'month');
  }

  /** '2026-08-01' -> '01/08/2026' */
  function fmt(iso) {
    var d = fromISO(iso);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  /** '2026-08-01' -> '01/08' */
  function fmtShort(iso) {
    var d = fromISO(iso);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
  }

  /** Tiêu đề nhóm ngày: 'Hôm nay · Thứ sáu, 01/08' */
  function fmtDayHeading(iso) {
    var d = fromISO(iso);
    var rel = relativeDay(iso);
    var base = L().dowLong[d.getDay()] + ', ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
    return rel ? rel + ' · ' + base : base;
  }

  function relativeDay(iso) {
    var t = today();
    if (iso === t) return pick('Hôm nay', 'Today');
    if (iso === addDays(t, -1)) return pick('Hôm qua', 'Yesterday');
    if (iso === addDays(t, 1)) return pick('Ngày mai', 'Tomorrow');
    return '';
  }

  /** Mô tả hạn công việc: 'Quá hạn 3 ngày', 'Hôm nay', 'Còn 5 ngày' */
  function dueText(iso) {
    if (!iso) return '';
    var diff = Math.round((fromISO(iso) - fromISO(today())) / 86400000);
    if (diff === 0) return pick('Hôm nay', 'Today');
    if (diff === 1) return pick('Ngày mai', 'Tomorrow');
    if (diff === -1) return pick('Quá hạn 1 ngày', '1 day overdue');
    if (diff < 0) return pick('Quá hạn ' + (-diff) + ' ngày', (-diff) + ' days overdue');
    if (diff <= 7) return pick('Còn ' + diff + ' ngày', diff + ' days left');
    return fmtShort(iso);
  }

  function isOverdue(iso) { return !!iso && iso < today(); }

  function monthShort(iso) {
    var d = fromISO(iso);
    return L().monthShort[d.getMonth()];
  }

  function dowShort(iso) { return L().dowShort[fromISO(iso).getDay()]; }

  /** Số ngày còn lại của kỳ tính từ hôm nay (tối thiểu 1) */
  function daysLeftIn(r) {
    var t = today();
    if (t > r.end) return 0;
    if (t < r.start) return r.days;
    return Math.max(1, daysBetween(t, r.end));
  }

  return {
    toISO: toISO, fromISO: fromISO, today: today, pad: pad,
    addDays: addDays, addMonths: addMonths, daysInMonth: daysInMonth,
    startOfWeek: startOfWeek, endOfWeek: endOfWeek,
    startOfMonth: startOfMonth, endOfMonth: endOfMonth,
    startOfYear: startOfYear, endOfYear: endOfYear,
    daysBetween: daysBetween, listDays: listDays,
    range: range, shift: shift, rangeLabel: rangeLabel, periodName: periodName,
    fmt: fmt, fmtShort: fmtShort, fmtDayHeading: fmtDayHeading,
    relativeDay: relativeDay, dueText: dueText, isOverdue: isOverdue,
    monthShort: monthShort, dowShort: dowShort, daysLeftIn: daysLeftIn,
    // Đọc theo ngôn ngữ đang chọn tại thời điểm truy cập
    get DOW_SHORT() { return L().dowShort; },
    get DOW_LONG() { return L().dowLong; }
  };
})();

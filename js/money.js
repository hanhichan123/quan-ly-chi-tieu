/* ===========================================================
   money.js — Đơn vị tiền tệ, định dạng và đọc số tiền.

   QUY ƯỚC QUAN TRỌNG:
   Mọi số tiền lưu trong CSDL là SỐ NGUYÊN theo đơn vị nhỏ nhất
   của tiền tệ đang dùng (JPY/VND/KRW: 1 = 1 yên/đồng/won;
   USD/EUR: 1 = 1 xu). Nhờ vậy không bao giờ sai số dấu phẩy động.
   =========================================================== */

App.money = (function () {
  'use strict';

  var LIST = [
    { code: 'JPY', name: 'Yên Nhật',        nameEn: 'Japanese yen',      symbol: '¥',   decimals: 0 },
    { code: 'VND', name: 'Đồng Việt Nam',   nameEn: 'Vietnamese dong',   symbol: '₫',   decimals: 0 },
    { code: 'USD', name: 'Đô la Mỹ',        nameEn: 'US dollar',         symbol: '$',   decimals: 2 },
    { code: 'EUR', name: 'Euro',            nameEn: 'Euro',              symbol: '€',   decimals: 2 },
    { code: 'KRW', name: 'Won Hàn Quốc',    nameEn: 'Korean won',        symbol: '₩',   decimals: 0 },
    { code: 'CNY', name: 'Nhân dân tệ',     nameEn: 'Chinese yuan',      symbol: '¥',   decimals: 2 },
    { code: 'TWD', name: 'Đài tệ',          nameEn: 'Taiwan dollar',     symbol: 'NT$', decimals: 0 },
    { code: 'THB', name: 'Baht Thái',       nameEn: 'Thai baht',         symbol: '฿',   decimals: 2 },
    { code: 'GBP', name: 'Bảng Anh',        nameEn: 'British pound',     symbol: '£',   decimals: 2 },
    { code: 'AUD', name: 'Đô la Úc',        nameEn: 'Australian dollar', symbol: 'A$',  decimals: 2 },
    { code: 'SGD', name: 'Đô la Singapore', nameEn: 'Singapore dollar',  symbol: 'S$',  decimals: 2 },
    { code: 'CAD', name: 'Đô la Canada',    nameEn: 'Canadian dollar',   symbol: 'C$',  decimals: 2 }
  ];

  /** Tên tiền tệ theo ngôn ngữ đang chọn */
  function nameOf(c) {
    return (App.i18n && App.i18n.lang === 'en' && c.nameEn) ? c.nameEn : c.name;
  }

  var BY_CODE = {};
  LIST.forEach(function (c) { BY_CODE[c.code] = c; });

  var current = BY_CODE.JPY;

  // Bộ định dạng đệm theo SỐ CHỮ SỐ THẬP PHÂN, không theo tiền tệ hiện tại.
  // Nhờ vậy format(v, {code:'USD'}) vẫn đúng khi app đang để JPY.
  var nfCache = {};

  function locale() {
    return (App.i18n && App.i18n.numberLocale) ? App.i18n.numberLocale() : 'vi-VN';
  }

  function formatterFor(decimals) {
    // Đệm theo cả locale: đổi ngôn ngữ thì dấu phân nhóm cũng đổi
    // (1.500 kiểu Việt <-> 1,500 kiểu Anh).
    var key = locale() + ':' + decimals;
    if (nfCache[key]) return nfCache[key];
    var f;
    try {
      f = new Intl.NumberFormat(locale(), {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    } catch (e) {
      f = null;
    }
    nfCache[key] = f;
    return f;
  }

  function setCurrency(code) {
    current = BY_CODE[code] || BY_CODE.JPY;
    return current;
  }

  function get(code) { return BY_CODE[code] || BY_CODE.JPY; }
  function currency() { return current; }
  function factor(cur) { return Math.pow(10, (cur || current).decimals); }

  /** Số nguyên đơn vị nhỏ nhất -> số thực đơn vị chính (12345 xu -> 123.45) */
  function toMajor(minor, cur) { return (minor || 0) / factor(cur); }

  /** Số thực đơn vị chính -> số nguyên đơn vị nhỏ nhất (làm tròn) */
  function toMinor(major, cur) { return Math.round((Number(major) || 0) * factor(cur)); }

  function groupNumber(n, cur) {
    var c = cur || current;
    var f = formatterFor(c.decimals);
    if (f) return f.format(c.decimals === 0 ? Math.round(n) : n);
    return c.decimals === 0 ? String(Math.round(n)) : n.toFixed(c.decimals);
  }

  /**
   * Định dạng để hiển thị.
   * opts: {code, symbol:false, sign:'auto'|'always'|'none', abs:true}
   */
  function format(minor, opts) {
    opts = opts || {};
    var cur = opts.code ? get(opts.code) : current;
    var v = toMajor(minor, cur);
    if (opts.abs) v = Math.abs(v);
    var neg = v < 0;
    var body = groupNumber(Math.abs(v), cur);
    var out = (opts.symbol === false) ? body : cur.symbol + body;
    if (neg) out = '−' + out;
    else if (opts.sign === 'always') out = '+' + out;
    return out;
  }

  /** Dạng rút gọn cho trục biểu đồ: ¥1,2 Tr · ¥15N (tiếng Anh: ¥1.2M · ¥15K) */
  function compact(minor, opts) {
    opts = opts || {};
    var cur = opts.code ? get(opts.code) : current;
    var en = !!(App.i18n && App.i18n.lang === 'en');
    var v = Math.abs(toMajor(minor, cur));
    var s;
    if (v >= 1e9) s = trim(v / 1e9, en) + (en ? 'B' : ' tỷ');
    else if (v >= 1e6) s = trim(v / 1e6, en) + (en ? 'M' : ' Tr');
    else if (v >= 1e4) s = trim(v / 1e3, en) + (en ? 'K' : 'N');
    else s = groupNumber(v, cur);
    return (opts.symbol === false ? '' : cur.symbol) + s;
  }

  function trim(n, en) {
    var r = n >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
    return en ? String(r) : String(r).replace('.', ',');
  }

  /**
   * Đọc chuỗi người dùng gõ thành số nguyên đơn vị nhỏ nhất.
   * Chấp nhận: "1.500", "1,500", "1500.5", "1 500", "1500đ", "¥1,500"
   * Trả về null nếu không đọc được.
   */
  function parse(text, cur) {
    var c = cur || current;
    if (text === null || text === undefined) return null;
    var s = String(text).trim();
    if (!s) return null;

    // Bỏ mọi ký tự không phải số, dấu chấm, phẩy, trừ
    s = s.replace(/[^\d.,\-]/g, '');
    if (!s || s === '-') return null;

    var neg = s.charAt(0) === '-';
    s = s.replace(/-/g, '');

    var lastDot = s.lastIndexOf('.');
    var lastComma = s.lastIndexOf(',');
    var sepPos = Math.max(lastDot, lastComma);
    var intPart = s, fracPart = '';

    if (sepPos >= 0) {
      var tail = s.slice(sepPos + 1);
      // Là dấu thập phân nếu đuôi có 1-2 chữ số VÀ tiền tệ có phần lẻ
      if (c.decimals > 0 && tail.length > 0 && tail.length <= c.decimals && /^\d+$/.test(tail)) {
        intPart = s.slice(0, sepPos);
        fracPart = tail;
      }
    }

    intPart = intPart.replace(/[.,]/g, '');
    if (!intPart) intPart = '0';
    if (!/^\d+$/.test(intPart)) return null;

    while (fracPart.length < c.decimals) fracPart += '0';
    fracPart = fracPart.slice(0, c.decimals);

    var minor = parseInt(intPart, 10) * factor(c) + (c.decimals ? parseInt(fracPart || '0', 10) : 0);
    if (!isFinite(minor)) return null;
    return neg ? -minor : minor;
  }

  /** Giá trị đưa vào ô nhập (không có ký hiệu, có phân nhóm) */
  function toInput(minor, cur) {
    if (minor === null || minor === undefined || minor === '') return '';
    return groupNumber(toMajor(minor, cur), cur);
  }

  /** Quy đổi toàn bộ số liệu khi đổi tiền tệ: rate = 1 đơn vị chính CŨ đổi ra bao nhiêu đơn vị chính MỚI */
  function convert(minor, fromCur, toCur, rate) {
    var major = toMajor(minor, fromCur);
    return toMinor(major * rate, toCur);
  }

  return {
    LIST: LIST, get: get, currency: currency, setCurrency: setCurrency, nameOf: nameOf,
    format: format, compact: compact, parse: parse, toInput: toInput,
    toMajor: toMajor, toMinor: toMinor, convert: convert, groupNumber: groupNumber
  };
})();

/* ===========================================================
   seed.js — Dữ liệu mặc định lần đầu chạy app.
   =========================================================== */

App.seed = (function () {
  'use strict';

  var EXPENSE_CATS = [
    { id: 'cho',      name: 'Đi chợ / Ăn uống', emoji: '🛒', color: 'c1' },
    { id: 'nha',      name: 'Tiền nhà',         emoji: '🏠', color: 'c2' },
    { id: 'dilai',    name: 'Xăng xe / Đi lại', emoji: '🚗', color: 'c3' },
    { id: 'dienuoc',  name: 'Điện nước ga',     emoji: '💡', color: 'c4' },
    { id: 'lienlac',  name: 'Điện thoại / Net', emoji: '📱', color: 'c5' },
    { id: 'yte',      name: 'Y tế',             emoji: '💊', color: 'c6' },
    { id: 'muasam',   name: 'Mua sắm',          emoji: '👕', color: 'c7' },
    { id: 'giaitri',  name: 'Giải trí',         emoji: '🎮', color: 'c8' },
    { id: 'hoctap',   name: 'Học tập',          emoji: '📚', color: 'c9' },
    { id: 'baohiem',  name: 'Bảo hiểm / Thuế',  emoji: '🧾', color: 'c10' },
    { id: 'guinha',   name: 'Gửi về nhà',       emoji: '💸', color: 'c11' },
    { id: 'khac',     name: 'Khác',             emoji: '📦', color: 'c12' }
  ];

  var INCOME_CATS = [
    { id: 'luong',    name: 'Lương',      emoji: '💰', color: 'c9' },
    { id: 'lamthem',  name: 'Làm thêm',   emoji: '⏰', color: 'c6' },
    { id: 'thuong',   name: 'Thưởng',     emoji: '🎁', color: 'c5' },
    { id: 'thukhac',  name: 'Thu khác',   emoji: '📦', color: 'c12' }
  ];

  var DEFAULT_SETTINGS = {
    currency: 'JPY',
    lang: 'vi',               // vi | en
    theme: 'auto',            // auto | light | dark
    weekStart: 1,             // 1 = Thứ hai
    warnThreshold: 80,        // % bắt đầu cảnh báo vàng
    confirmOverLimit: true,   // hỏi lại khi khoản chi làm vượt hạn mức
    notifyEnabled: false,     // thông báo hệ thống
    quickPicks: [],           // nhập nhanh do người dùng ghim

    // --- Nhắc sao lưu ---
    backupReminderDays: 14,   // 0 = tắt nhắc
    lastBackupAt: null,       // ISO datetime lần xuất file gần nhất
    lastBackupTxCount: 0,     // số giao dịch tại thời điểm đó

    // --- Khoá ứng dụng ---
    lockEnabled: false,
    lockSalt: null,           // chuỗi hex, sinh ngẫu nhiên khi đặt PIN
    lockHash: null,           // PBKDF2 của PIN, KHÔNG bao giờ lưu PIN thô
    lockPinLength: 4,         // chỉ độ dài, để màn khoá biết khi nào gõ xong
    lockAutoMinutes: 5,       // tự khoá sau bao nhiêu phút rời app (0 = khoá ngay)
    lockBiometric: false,     // đã đăng ký vân tay/khuôn mặt qua WebAuthn
    lockCredentialId: null,   // id thông tin xác thực WebAuthn (không phải dữ liệu sinh trắc)

    seededAt: null
  };

  /* Phương thức thanh toán phổ biến ở Nhật Bản.
     Giữ cả tên tiếng Nhật trong ngoặc để dễ đối chiếu với hoá đơn/app ngân hàng. */
  var PAYMENT_METHODS = [
    { id: 'cash',      name: 'Tiền mặt',            jp: '現金',            emoji: '💴', color: 'c5' },
    { id: 'credit',    name: 'Thẻ tín dụng',        jp: 'クレジットカード', emoji: '💳', color: 'c1' },
    { id: 'paypay',    name: 'PayPay',              jp: 'ペイペイ',        emoji: '📱', color: 'c9' },
    { id: 'rakutenpay', name: 'Rakuten Pay',        jp: '楽天ペイ',        emoji: '🅿️', color: 'c9' },
    { id: 'suica',     name: 'Suica / PASMO',       jp: 'IC カード',       emoji: '🚃', color: 'c3' },
    { id: 'linepay',   name: 'LINE Pay',            jp: 'ラインペイ',      emoji: '💬', color: 'c5' },
    { id: 'dbarai',    name: 'd Payment',           jp: 'd払い',           emoji: '🔵', color: 'c8' },
    { id: 'aupay',     name: 'au PAY',              jp: 'au ペイ',         emoji: '🟠', color: 'c2' },
    { id: 'merpay',    name: 'MerPay',              jp: 'メルペイ',        emoji: '🔴', color: 'c4' },
    { id: 'debit',     name: 'Thẻ ghi nợ',          jp: 'デビットカード',   emoji: '🏧', color: 'c6' },
    { id: 'furikomi',  name: 'Chuyển khoản',        jp: '銀行振込',        emoji: '🏦', color: 'c10' },
    { id: 'kouza',     name: 'Trừ tự động',         jp: '口座振替',        emoji: '🔁', color: 'c11' },
    { id: 'konbini',   name: 'Trả tại konbini',     jp: 'コンビニ払い',    emoji: '🏪', color: 'c7' },
    { id: 'paykhac',   name: 'Khác',                jp: 'その他',          emoji: '📦', color: 'c12' }
  ];

  function defaultPaymentMethods() {
    return PAYMENT_METHODS.map(function (p, i) {
      return {
        id: p.id, name: p.name, jp: p.jp, emoji: p.emoji, color: p.color,
        order: i, archived: false
      };
    });
  }

  function defaultCategories() {
    var out = [];
    EXPENSE_CATS.forEach(function (c, i) {
      out.push({ id: c.id, name: c.name, emoji: c.emoji, color: c.color, type: 'expense', order: i, archived: false });
    });
    INCOME_CATS.forEach(function (c, i) {
      out.push({ id: c.id, name: c.name, emoji: c.emoji, color: c.color, type: 'income', order: i, archived: false });
    });
    return out;
  }

  /**
   * Chạy khi khởi động: nạp dữ liệu mặc định cho những kho còn rỗng.
   * Xét từng kho riêng để người đã dùng bản cũ vẫn nhận được phương thức
   * thanh toán mặc định mà không đụng gì tới hạng mục họ đã sửa.
   */
  function ensure() {
    return Promise.all([
      App.db.getAll('categories'),
      App.db.getAll('paymentMethods')
    ]).then(function (res) {
      var jobs = [];
      if (!res[0] || !res[0].length) jobs.push(App.db.bulkPut('categories', defaultCategories()));
      if (!res[1] || !res[1].length) jobs.push(App.db.bulkPut('paymentMethods', defaultPaymentMethods()));
      if (!jobs.length) return false;
      return Promise.all(jobs).then(function () {
        return App.db.put('settings', { key: 'seededAt', value: new Date().toISOString() });
      }).then(function () { return true; });
    });
  }

  return {
    EXPENSE_CATS: EXPENSE_CATS,
    INCOME_CATS: INCOME_CATS,
    PAYMENT_METHODS: PAYMENT_METHODS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    defaultCategories: defaultCategories,
    defaultPaymentMethods: defaultPaymentMethods,
    ensure: ensure
  };
})();

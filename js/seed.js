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
    theme: 'auto',            // auto | light | dark
    weekStart: 1,             // 1 = Thứ hai
    warnThreshold: 80,        // % bắt đầu cảnh báo vàng
    confirmOverLimit: true,   // hỏi lại khi khoản chi làm vượt hạn mức
    notifyEnabled: false,     // thông báo hệ thống
    quickPicks: [],           // nhập nhanh do người dùng ghim
    seededAt: null
  };

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

  /** Chạy 1 lần: nếu chưa có hạng mục nào thì nạp mặc định. */
  function ensure() {
    return App.db.getAll('categories').then(function (cats) {
      if (cats && cats.length) return false;
      var seeded = defaultCategories();
      return App.db.bulkPut('categories', seeded).then(function () {
        return App.db.put('settings', { key: 'seededAt', value: new Date().toISOString() });
      }).then(function () { return true; });
    });
  }

  return {
    EXPENSE_CATS: EXPENSE_CATS,
    INCOME_CATS: INCOME_CATS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    defaultCategories: defaultCategories,
    ensure: ensure
  };
})();

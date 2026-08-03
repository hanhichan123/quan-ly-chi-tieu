/* ===========================================================
   backup.js — Sao lưu và khôi phục dữ liệu.
   - Xuất JSON: toàn bộ dữ liệu, kể cả ảnh hóa đơn -> khôi phục 100%.
   - Xuất CSV : chỉ giao dịch, để mở bằng Excel.
   - Nhập lại : có xem trước và cảnh báo ghi đè.
   =========================================================== */

App.backup = (function () {
  'use strict';

  var u = App.util, D = App.dates, M = App.money, st = App.state;

  var FORMAT = 'qlct-backup';
  var FORMAT_VERSION = 1;

  /* ---------------- Xuất ---------------- */

  function collect() {
    return Promise.all(App.db.STORES.map(function (s) { return App.db.getAll(s); }))
      .then(function (res) {
        var data = {};
        App.db.STORES.forEach(function (s, i) { data[s] = res[i] || []; });
        return {
          format: FORMAT,
          formatVersion: FORMAT_VERSION,
          exportedAt: new Date().toISOString(),
          currency: st.S.settings.currency,
          data: data
        };
      });
  }

  function exportJSON(opts) {
    opts = opts || {};
    return collect().then(function (payload) {
      var name = 'sao-luu-chi-tieu-' + D.today() + '.json';
      download(name, JSON.stringify(payload), 'application/json');
      // Ghi mốc để tính lúc nào cần nhắc sao lưu lần sau.
      // Bỏ qua khi đây là bản sao lưu tự động trước lúc quy đổi tiền tệ.
      if (!opts.silent) return markBackedUp(payload).then(function () { return name; });
      return name;
    });
  }

  /** Ghi lại thời điểm và khối lượng dữ liệu của lần sao lưu gần nhất */
  function markBackedUp(payload) {
    var count = payload && payload.data && payload.data.transactions
      ? payload.data.transactions.length
      : 0;
    return st.setSetting('lastBackupAt', new Date().toISOString())
      .then(function () { return st.setSetting('lastBackupTxCount', count); });
  }

  /**
   * Có nên nhắc sao lưu không?
   * Trả về null nếu chưa cần, hoặc {reason, days, newCount, never}
   */
  function reminderStatus(totalTx) {
    var s = st.S.settings;
    var everyDays = s.backupReminderDays;
    if (!everyDays) return null;                 // người dùng đã tắt nhắc
    if (!totalTx) return null;                   // chưa có gì để mất

    if (!s.lastBackupAt) {
      return { never: true, newCount: totalTx, days: 0 };
    }

    var days = Math.floor((Date.now() - new Date(s.lastBackupAt).getTime()) / 86400000);
    var newCount = Math.max(0, totalTx - (s.lastBackupTxCount || 0));
    if (days >= everyDays && newCount > 0) {
      return { never: false, days: days, newCount: newCount };
    }
    return null;
  }

  function exportCSV() {
    return App.db.getAll('transactions').then(function (list) {
      var cur = M.currency();
      var head = ['Ngay', 'Loai', 'Hang muc', 'So tien (' + cur.code + ')',
                  'Phuong thuc', 'Ghi chu'];
      var rows = list
        .sort(function (a, b) { return a.date < b.date ? -1 : 1; })
        .map(function (t) {
          var p = st.pay(t.paymentId);
          return [
            t.date,
            t.type === 'income' ? 'Thu' : 'Chi',
            st.cat(t.categoryId).name,
            String(M.toMajor(t.amount, cur)).replace('.', ','),
            p ? p.name : '',
            t.note || ''
          ];
        });

      // BOM để Excel trên Windows đọc đúng tiếng Việt
      var csv = '﻿' + [head].concat(rows).map(function (r) {
        return r.map(csvCell).join(';');
      }).join('\r\n');

      var name = 'giao-dich-' + D.today() + '.csv';
      download(name, csv, 'text/csv;charset=utf-8');
      return { name: name, count: rows.length };
    });
  }

  function csvCell(v) {
    var s = String(v === null || v === undefined ? '' : v);
    return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  }

  /* ---------------- Nhập ---------------- */

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('Không đọc được tệp')); };
      fr.onload = function () {
        try { resolve(JSON.parse(fr.result)); }
        catch (e) { reject(new Error('Tệp không phải bản sao lưu hợp lệ (lỗi JSON)')); }
      };
      fr.readAsText(file);
    });
  }

  function validate(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('Tệp rỗng hoặc sai định dạng');
    if (payload.format !== FORMAT) throw new Error('Đây không phải bản sao lưu của app này');
    if (!payload.data || typeof payload.data !== 'object') throw new Error('Bản sao lưu thiếu phần dữ liệu');
    return payload;
  }

  function summarize(payload) {
    var d = payload.data;
    return {
      transactions: (d.transactions || []).length,
      categories: (d.categories || []).length,
      tasks: (d.tasks || []).length,
      recurring: (d.recurring || []).length,
      goals: (d.goals || []).length,
      budgets: (d.budgets || []).length,
      photos: (d.transactions || []).filter(function (t) { return t.photo; }).length,
      currency: payload.currency || '?',
      exportedAt: payload.exportedAt
    };
  }

  /** Ghi đè toàn bộ dữ liệu hiện tại bằng nội dung bản sao lưu */
  function restore(payload) {
    validate(payload);
    return App.db.wipe().then(function () {
      var chain = Promise.resolve();
      App.db.STORES.forEach(function (s) {
        var rows = payload.data[s];
        if (rows && rows.length) {
          chain = chain.then(function () { return App.db.bulkPut(s, rows); });
        }
      });
      return chain;
    }).then(function () { return st.load(); });
  }

  /** Mở hộp chọn tệp -> xem trước -> hỏi xác nhận -> khôi phục */
  function openImportDialog(onDone) {
    var input = u.el('input', { type: 'file', accept: '.json,application/json', class: 'sr-only' });
    document.body.appendChild(input);

    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      document.body.removeChild(input);
      if (!f) return;

      readFile(f)
        .then(validate)
        .then(function (payload) {
          var s = summarize(payload);
          var box = u.el('div');
          box.appendChild(u.el('p', { class: 'dialog__text', text: 'Nội dung bản sao lưu:' }));
          var ul = u.el('ul', { style: 'margin:10px 0;padding-left:18px' });
          [
            s.transactions + ' giao dịch (' + s.photos + ' có ảnh)',
            s.categories + ' hạng mục',
            s.tasks + ' công việc',
            s.recurring + ' khoản định kỳ',
            s.goals + ' mục tiêu',
            'Đơn vị tiền: ' + s.currency,
            'Sao lưu lúc: ' + (s.exportedAt ? new Date(s.exportedAt).toLocaleString('vi-VN') : 'không rõ')
          ].forEach(function (line) {
            ul.appendChild(u.el('li', { class: 'dialog__text', text: line }));
          });
          box.appendChild(ul);
          box.appendChild(u.el('p', {
            class: 'dialog__text',
            style: 'color:var(--danger);font-weight:700',
            text: '⚠️ Toàn bộ dữ liệu hiện tại trong máy sẽ bị XÓA và thay bằng nội dung trên.'
          }));

          return u.confirm({
            title: 'Khôi phục dữ liệu?',
            text: box, okLabel: 'Ghi đè và khôi phục', cancelLabel: 'Hủy', danger: true
          }).then(function (ok) {
            if (!ok) return;
            return restore(payload).then(function () {
              u.toast('Đã khôi phục ' + s.transactions + ' giao dịch', 'ok');
              if (onDone) onDone();
            });
          });
        })
        .catch(function (e) {
          u.alert('Không nhập được', e.message || String(e));
        });
    });

    input.click();
  }

  /* ---------------- Xóa sạch ---------------- */

  function wipeWithConfirm(onDone) {
    u.confirm({
      title: 'Xóa toàn bộ dữ liệu?',
      text: 'Mọi giao dịch, công việc, hạn mức và mục tiêu sẽ bị xóa vĩnh viễn khỏi máy. ' +
        'Hãy xuất file sao lưu trước nếu bạn còn cần dùng lại.',
      okLabel: 'Tôi hiểu, xóa hết', cancelLabel: 'Hủy', danger: true
    }).then(function (ok) {
      if (!ok) return;
      return u.confirm({
        title: 'Chắc chắn chưa?',
        text: 'Đây là bước xác nhận cuối cùng. Sau bước này không khôi phục lại được.',
        okLabel: 'Xóa hết', cancelLabel: 'Thôi', danger: true
      });
    }).then(function (ok) {
      if (!ok) return;
      return App.db.wipe().then(function () { return st.load(); }).then(function () {
        u.toast('Đã xóa toàn bộ dữ liệu');
        if (onDone) onDone();
      });
    });
  }

  return {
    collect: collect, exportJSON: exportJSON, exportCSV: exportCSV,
    openImportDialog: openImportDialog, restore: restore,
    wipeWithConfirm: wipeWithConfirm, summarize: summarize, validate: validate,
    reminderStatus: reminderStatus, markBackedUp: markBackedUp
  };
})();

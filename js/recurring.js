/* ===========================================================
   recurring.js — Khoản thu/chi lặp lại (tiền nhà, internet, lương...).

   App KHÔNG tự ghi ngầm vào sổ. Mỗi lần mở app, những khoản đã đến
   hạn sẽ được liệt kê ra để bạn xác nhận -> tránh sổ sách sai mà
   không biết vì sao.
   =========================================================== */

App.recurring = (function () {
  'use strict';

  var u = App.util, D = App.dates, M = App.money, st = App.state;

  var FREQS = [
    { v: 'monthly', label: 'Hằng tháng' },
    { v: 'weekly', label: 'Hằng tuần' }
  ];

  var MAX_LOOKBACK_DAYS = 90;

  /* ---------------- Tính các lần đến hạn ---------------- */

  /** Danh sách ngày đến hạn của 1 khoản, từ sau lastPosted đến hôm nay */
  function dueDatesFor(rec, todayISO) {
    var today = todayISO || D.today();
    var floor = D.addDays(today, -MAX_LOOKBACK_DAYS);
    var from = rec.lastPosted ? D.addDays(rec.lastPosted, 1) : (rec.startDate || floor);
    if (from < floor) from = floor;
    if (from > today) return [];

    var out = [];
    if (rec.freq === 'weekly') {
      var wd = typeof rec.weekday === 'number' ? rec.weekday : 1;
      var cur = from;
      var guard = 0;
      while (cur <= today && guard++ < 200) {
        if (D.fromISO(cur).getDay() === wd) out.push(cur);
        cur = D.addDays(cur, 1);
      }
    } else {
      var dom = u.clamp(rec.dayOfMonth || 1, 1, 31);
      // Duyệt từng tháng trong khoảng
      var cursor = D.startOfMonth(from);
      var guard2 = 0;
      while (cursor <= today && guard2++ < 12) {
        var dt = D.fromISO(cursor);
        var maxDay = D.daysInMonth(dt.getFullYear(), dt.getMonth());
        var day = Math.min(dom, maxDay);   // 31 -> ngày cuối tháng ngắn
        var iso = cursor.slice(0, 8) + D.pad(day);
        if (iso >= from && iso <= today) out.push(iso);
        cursor = D.addMonths(cursor, 1);
      }
    }
    return out;
  }

  /** Toàn bộ khoản đến hạn chưa ghi -> Promise<[{rec, date}]> */
  function pending() {
    return st.allRecurring().then(function (list) {
      var out = [];
      list.filter(function (r) { return r.active !== false; }).forEach(function (r) {
        dueDatesFor(r).forEach(function (d) { out.push({ rec: r, date: d }); });
      });
      return out.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    });
  }

  /** Ghi các khoản đã chọn vào sổ và cập nhật lastPosted */
  function post(items) {
    if (!items.length) return Promise.resolve(0);
    var byRec = {};
    var chain = Promise.resolve();

    items.forEach(function (it) {
      chain = chain.then(function () {
        return st.saveTx({
          type: it.rec.type, amount: it.rec.amount,
          categoryId: it.rec.categoryId, date: it.date,
          note: it.rec.label ? it.rec.label + ' (định kỳ)' : 'Khoản định kỳ',
          photo: null, fromRecurring: it.rec.id
        });
      });
      if (!byRec[it.rec.id] || byRec[it.rec.id].date < it.date) byRec[it.rec.id] = it;
    });

    return chain.then(function () {
      return Promise.all(Object.keys(byRec).map(function (id) {
        var r = byRec[id].rec;
        r.lastPosted = byRec[id].date;
        return st.saveRecurring(r);
      }));
    }).then(function () { return items.length; });
  }

  /** Bỏ qua: chỉ dời mốc lastPosted, không ghi vào sổ */
  function skip(items) {
    var byRec = {};
    items.forEach(function (it) {
      if (!byRec[it.rec.id] || byRec[it.rec.id].date < it.date) byRec[it.rec.id] = it;
    });
    return Promise.all(Object.keys(byRec).map(function (id) {
      var r = byRec[id].rec;
      r.lastPosted = byRec[id].date;
      return st.saveRecurring(r);
    }));
  }

  /* ---------------- Bảng xác nhận khi mở app ---------------- */

  function promptIfDue() {
    return pending().then(function (items) {
      if (!items.length) return 0;
      openConfirmSheet(items);
      return items.length;
    });
  }

  function openConfirmSheet(items) {
    var chosen = {};
    items.forEach(function (it, i) { chosen[i] = true; });

    var body = u.el('div');
    body.appendChild(u.el('div', { class: 'alert alert--info' }, [
      u.el('span', { class: 'ico', text: '🔁' }),
      u.el('div', { class: 'alert__body' }, [
        u.el('div', { class: 'alert__title', text: 'Có ' + items.length + ' khoản định kỳ đến hạn' }),
        u.el('div', { text: 'Bỏ chọn những khoản bạn chưa thực sự chi/thu.' })
      ])
    ]));

    var listBox = u.el('div', { class: 'card card--pad0' });
    items.forEach(function (it, i) {
      var c = st.cat(it.rec.categoryId);
      var cb = u.el('input', {
        type: 'checkbox', checked: true, id: 'rec' + i,
        style: 'width:22px;height:22px;flex:none'
      });
      cb.addEventListener('change', function () { chosen[i] = cb.checked; });
      listBox.appendChild(u.el('label', { class: 'row', for: 'rec' + i, style: 'cursor:pointer' }, [
        cb,
        u.el('span', { class: 'row__ico', text: c.emoji }),
        u.el('span', { class: 'row__body' }, [
          u.el('span', { class: 'row__title', text: it.rec.label || c.name }),
          u.el('span', { class: 'row__sub', text: D.fmt(it.date) + ' · ' + c.name })
        ]),
        u.el('span', {
          class: 'amt ' + (it.rec.type === 'income' ? 'amt--inc' : ''),
          text: (it.rec.type === 'income' ? '+' : '−') + M.format(it.rec.amount)
        })
      ]));
    });
    body.appendChild(listBox);

    var handle = u.sheet({
      title: 'Khoản định kỳ đến hạn',
      body: body,
      dismissable: false,
      actions: [
        {
          label: 'Để sau', onClick: function () { /* không đổi gì, lần sau hỏi lại */ }
        },
        {
          label: 'Ghi vào sổ', kind: 'primary', keepOpen: true,
          onClick: function () {
            var take = items.filter(function (_, i) { return chosen[i]; });
            var drop = items.filter(function (_, i) { return !chosen[i]; });
            post(take)
              .then(function () { return skip(drop); })
              .then(function () {
                u.toast(take.length ? 'Đã ghi ' + take.length + ' khoản định kỳ' : 'Đã bỏ qua', 'ok');
                handle.close();
                App.router.refresh();
              })
              .catch(function (e) { u.toast(e.message || 'Ghi thất bại', 'danger'); });
            return false;
          }
        }
      ]
    });
  }

  /* ---------------- Quản lý danh sách ---------------- */

  function openList() {
    var body = u.el('div');
    var listBox = u.el('div');
    body.appendChild(listBox);
    body.appendChild(u.el('button', {
      class: 'btn btn--primary btn--block mt3', type: 'button', text: '＋  Thêm khoản định kỳ',
      onclick: function () { openEditor(null, redraw); }
    }));

    function redraw() {
      st.allRecurring().then(function (list) {
        u.clear(listBox);
        if (!list.length) {
          listBox.appendChild(u.el('div', { class: 'empty' }, [
            u.el('span', { class: 'ico', text: '🔁' }),
            u.el('div', { class: 'empty__title', text: 'Chưa có khoản định kỳ' }),
            u.el('p', { text: 'VD: tiền nhà mỗi ngày 5, internet mỗi ngày 20, lương mỗi ngày 25.' })
          ]));
          return;
        }
        var card = u.el('div', { class: 'card card--pad0' });
        list.forEach(function (r) {
          var c = st.cat(r.categoryId);
          card.appendChild(u.el('button', {
            class: 'row', type: 'button',
            style: r.active === false ? 'opacity:.5' : null,
            onclick: function () { openEditor(r, redraw); }
          }, [
            u.el('span', { class: 'row__ico', text: c.emoji }),
            u.el('span', { class: 'row__body' }, [
              u.el('span', { class: 'row__title', text: r.label || c.name }),
              u.el('span', { class: 'row__sub', text: describe(r) + (r.active === false ? ' · đang tắt' : '') })
            ]),
            u.el('span', {
              class: 'amt ' + (r.type === 'income' ? 'amt--inc' : ''),
              text: (r.type === 'income' ? '+' : '−') + M.format(r.amount)
            })
          ]));
        });
        listBox.appendChild(card);
      });
    }
    redraw();

    u.sheet({ title: 'Khoản thu/chi định kỳ', body: body, actions: [{ label: 'Xong', kind: 'primary' }] });
  }

  function describe(r) {
    if (r.freq === 'weekly') {
      return 'Mỗi tuần vào ' + D.DOW_LONG[typeof r.weekday === 'number' ? r.weekday : 1].toLowerCase();
    }
    return 'Mỗi tháng vào ngày ' + (r.dayOfMonth || 1);
  }

  function openEditor(rec, onChange) {
    var isEdit = !!(rec && rec.id);
    var m = {
      id: isEdit ? rec.id : null,
      type: (rec && rec.type) || 'expense',
      amount: (rec && rec.amount) || 0,
      categoryId: (rec && rec.categoryId) || null,
      label: (rec && rec.label) || '',
      freq: (rec && rec.freq) || 'monthly',
      dayOfMonth: (rec && rec.dayOfMonth) || 1,
      weekday: (rec && typeof rec.weekday === 'number') ? rec.weekday : 1,
      active: rec ? rec.active !== false : true,
      lastPosted: rec && rec.lastPosted,
      startDate: (rec && rec.startDate) || D.today()
    };

    var body = u.el('div');

    var typeSel = u.el('select', { class: 'select', id: 'rcType' }, [
      u.el('option', { value: 'expense', text: 'Khoản chi', selected: m.type === 'expense' }),
      u.el('option', { value: 'income', text: 'Khoản thu', selected: m.type === 'income' })
    ]);
    typeSel.addEventListener('change', function () { m.type = typeSel.value; fillCats(); });
    body.appendChild(field('Loại', typeSel, 'rcType'));

    var labelInput = u.el('input', {
      class: 'input', type: 'text', id: 'rcLabel', maxlength: '80',
      value: m.label, placeholder: 'VD: Tiền nhà tháng'
    });
    body.appendChild(field('Tên gọi', labelInput, 'rcLabel'));

    var amtInput = u.el('input', {
      class: 'input', type: 'text', inputmode: 'decimal', id: 'rcAmt',
      value: m.amount ? M.toInput(m.amount) : '', placeholder: '0'
    });
    body.appendChild(field('Số tiền (' + M.currency().code + ')', amtInput, 'rcAmt'));

    var catSel = u.el('select', { class: 'select', id: 'rcCat' });
    function fillCats() {
      u.clear(catSel);
      st.cats(m.type).forEach(function (c) {
        catSel.appendChild(u.el('option', {
          value: c.id, text: c.emoji + ' ' + App.i18n.t(c.name), selected: m.categoryId === c.id
        }));
      });
    }
    fillCats();
    body.appendChild(field('Hạng mục', catSel, 'rcCat'));

    var freqSel = u.el('select', { class: 'select', id: 'rcFreq' });
    FREQS.forEach(function (f) {
      freqSel.appendChild(u.el('option', { value: f.v, text: f.label, selected: m.freq === f.v }));
    });
    body.appendChild(field('Tần suất', freqSel, 'rcFreq'));

    var whenWrap = u.el('div');
    var domInput = u.el('input', {
      class: 'input', type: 'number', min: '1', max: '31', id: 'rcDom', value: m.dayOfMonth
    });
    var wdSel = u.el('select', { class: 'select', id: 'rcWd' });
    D.DOW_LONG.forEach(function (n, i) {
      wdSel.appendChild(u.el('option', { value: i, text: n, selected: m.weekday === i }));
    });

    function renderWhen() {
      u.clear(whenWrap);
      if (freqSel.value === 'weekly') {
        whenWrap.appendChild(field('Vào thứ', wdSel, 'rcWd'));
      } else {
        whenWrap.appendChild(field('Vào ngày trong tháng', domInput, 'rcDom',
          'Nhập 31 nếu muốn luôn rơi vào ngày cuối tháng.'));
      }
    }
    freqSel.addEventListener('change', renderWhen);
    renderWhen();
    body.appendChild(whenWrap);

    var activeCb = u.el('input', { type: 'checkbox', checked: m.active, id: 'rcActive', style: 'width:22px;height:22px' });
    body.appendChild(u.el('label', { class: 'switch-row', for: 'rcActive' }, [
      u.el('span', { class: 'switch-row__body' }, [
        u.el('span', { class: 'switch-row__title', text: 'Đang bật' }),
        u.el('span', { class: 'switch-row__sub', text: 'Tắt để tạm dừng mà không xóa' })
      ]),
      activeCb
    ]));

    if (isEdit) {
      body.appendChild(u.el('button', {
        class: 'btn btn--block mt3', type: 'button',
        style: 'color:var(--danger);border-color:var(--danger)',
        text: '🗑  Xóa khoản định kỳ',
        onclick: function () {
          u.confirm({ title: 'Xóa khoản định kỳ?', text: m.label || '', okLabel: 'Xóa', danger: true })
            .then(function (ok) {
              if (!ok) return;
              st.delRecurring(m.id).then(function () {
                u.toast('Đã xóa'); handle.close(); if (onChange) onChange();
              });
            });
        }
      }));
    }

    var handle = u.sheet({
      title: isEdit ? 'Sửa khoản định kỳ' : 'Thêm khoản định kỳ',
      body: body, autofocus: false,
      actions: [
        { label: 'Hủy' },
        {
          label: 'Lưu', kind: 'primary', keepOpen: true,
          onClick: function () {
            var amt = M.parse(amtInput.value);
            if (!amt || amt <= 0) { u.toast('Hãy nhập số tiền', 'danger'); return false; }
            if (!catSel.value) { u.toast('Hãy chọn hạng mục', 'danger'); return false; }
            st.saveRecurring({
              id: m.id, type: typeSel.value, amount: amt,
              categoryId: catSel.value, label: labelInput.value.trim(),
              freq: freqSel.value,
              dayOfMonth: u.clamp(parseInt(domInput.value, 10) || 1, 1, 31),
              weekday: parseInt(wdSel.value, 10),
              active: activeCb.checked,
              lastPosted: m.lastPosted, startDate: m.startDate
            }).then(function () {
              u.toast('Đã lưu khoản định kỳ', 'ok');
              handle.close();
              if (onChange) onChange();
            });
            return false;
          }
        }
      ]
    });
  }

  function field(label, control, id, hint) {
    return u.el('div', { class: 'field' }, [
      u.el('label', { class: 'field__label', for: id, text: label }),
      control,
      hint ? u.el('div', { class: 'field__hint', text: hint }) : null
    ]);
  }

  return {
    dueDatesFor: dueDatesFor, pending: pending, post: post, skip: skip,
    promptIfDue: promptIfDue, openList: openList, openEditor: openEditor,
    describe: describe
  };
})();

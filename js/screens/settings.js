/* ===========================================================
   screens/settings.js — Cài đặt: hạn mức, tiền tệ, hạng mục,
   định kỳ, mục tiêu, giao diện, sao lưu dữ liệu.
   =========================================================== */

(function () {
  'use strict';

  var u = App.util, D = App.dates, M = App.money, st = App.state, C = App.charts;

  App.screens = App.screens || {};

  /* =========================================================
     HẠN MỨC NGÀY / TUẦN / THÁNG
     ========================================================= */

  function openLimits() {
    var body = u.el('div');
    body.appendChild(u.el('p', {
      class: 'small muted',
      text: 'Để trống hoặc nhập 0 nghĩa là không giới hạn. App sẽ cảnh báo khi bạn tiêu tới ' +
        (st.S.settings.warnThreshold || 80) + '% hạn mức.'
    }));

    var inputs = {};
    [
      ['daily', 'Hạn mức mỗi NGÀY', 'Tổng chi trong 1 ngày'],
      ['weekly', 'Hạn mức mỗi TUẦN', 'Tính theo tuần bắt đầu từ ' +
        (st.S.settings.weekStart === 0 ? 'Chủ nhật' : 'Thứ hai')],
      ['monthly', 'Hạn mức mỗi THÁNG', 'Tính theo tháng dương lịch']
    ].forEach(function (row) {
      var cur = st.getBudget(row[0]);
      var inp = u.el('input', {
        class: 'input', type: 'text', inputmode: 'decimal', id: 'lim_' + row[0],
        value: cur ? M.toInput(cur) : '', placeholder: '0'
      });
      inputs[row[0]] = inp;
      body.appendChild(u.el('div', { class: 'field' }, [
        u.el('label', { class: 'field__label', for: 'lim_' + row[0], text: row[1] + ' (' + M.currency().code + ')' }),
        u.el('div', { class: 'input-group' }, [
          inp, u.el('div', { class: 'input-group__unit', text: M.currency().symbol })
        ]),
        u.el('div', { class: 'field__hint', text: row[2] })
      ]));
    });

    // Gợi ý: từ hạn mức tháng suy ra ngày/tuần
    body.appendChild(u.el('button', {
      class: 'btn btn--block', type: 'button', text: '🧮  Tính ngày & tuần từ hạn mức tháng',
      onclick: function () {
        var m = M.parse(inputs.monthly.value);
        if (!m) { u.toast('Hãy nhập hạn mức tháng trước', 'danger'); return; }
        var daysInMonth = D.daysInMonth(D.fromISO(D.today()).getFullYear(), D.fromISO(D.today()).getMonth());
        inputs.daily.value = M.toInput(Math.floor(m / daysInMonth));
        inputs.weekly.value = M.toInput(Math.floor(m / daysInMonth * 7));
        u.toast('Đã điền gợi ý, bạn có thể sửa lại');
      }
    }));

    var handle = u.sheet({
      title: 'Đặt hạn mức chi tiêu',
      body: body, autofocus: false,
      actions: [
        { label: 'Hủy' },
        {
          label: 'Lưu', kind: 'primary', keepOpen: true,
          onClick: function () {
            Promise.all(Object.keys(inputs).map(function (k) {
              return st.setBudget(k, M.parse(inputs[k].value) || 0);
            })).then(function () {
              u.toast('Đã lưu hạn mức', 'ok');
              handle.close();
              App.router.refresh();
            });
            return false;
          }
        }
      ]
    });
  }

  /* =========================================================
     HẠN MỨC RIÊNG THEO HẠNG MỤC (theo tháng)
     ========================================================= */

  function openCategoryLimits() {
    var body = u.el('div');
    body.appendChild(u.el('p', {
      class: 'small muted',
      text: 'Đặt trần chi tiêu hằng tháng cho từng hạng mục. Để trống nghĩa là không giới hạn.'
    }));

    var inputs = {};
    st.cats('expense').forEach(function (c) {
      var key = st.catBudgetKey(c.id);
      var cur = st.getBudget(key);
      var inp = u.el('input', {
        class: 'input', type: 'text', inputmode: 'decimal', id: 'cl_' + c.id,
        value: cur ? M.toInput(cur) : '', placeholder: 'không giới hạn'
      });
      inputs[key] = inp;
      body.appendChild(u.el('div', { class: 'field' }, [
        u.el('label', { class: 'field__label', for: 'cl_' + c.id, text: c.emoji + '  ' + c.name }),
        inp
      ]));
    });

    var handle = u.sheet({
      title: 'Hạn mức theo hạng mục',
      body: body, autofocus: false,
      actions: [
        { label: 'Hủy' },
        {
          label: 'Lưu', kind: 'primary', keepOpen: true,
          onClick: function () {
            Promise.all(Object.keys(inputs).map(function (k) {
              return st.setBudget(k, M.parse(inputs[k].value) || 0);
            })).then(function () {
              u.toast('Đã lưu', 'ok');
              handle.close();
              App.router.refresh();
            });
            return false;
          }
        }
      ]
    });
  }

  /* =========================================================
     ĐƠN VỊ TIỀN TỆ
     ========================================================= */

  function openCurrency() {
    var oldCode = st.S.settings.currency;
    var body = u.el('div');

    var sel = u.el('select', { class: 'select', id: 'curSel' });
    M.LIST.forEach(function (c) {
      sel.appendChild(u.el('option', {
        value: c.code, selected: c.code === oldCode,
        text: c.symbol + '  ' + c.code + ' — ' + c.name
      }));
    });
    body.appendChild(u.el('div', { class: 'field' }, [
      u.el('label', { class: 'field__label', for: 'curSel', text: 'Đơn vị tiền tệ' }),
      sel
    ]));

    var modeBox = u.el('div');
    var rateWrap = u.el('div');
    var rateInput = u.el('input', {
      class: 'input', type: 'text', inputmode: 'decimal', id: 'rate', value: '1', placeholder: 'VD: 170'
    });
    var mode = 'display';

    function renderMode() {
      u.clear(modeBox);
      var newCode = sel.value;
      if (newCode === oldCode) {
        modeBox.appendChild(u.el('p', { class: 'small muted', text: 'Bạn đang dùng đơn vị này.' }));
        return;
      }

      modeBox.appendChild(u.el('p', { class: 'field__label', text: 'Cách xử lý số liệu đã có' }));

      [
        ['display', 'Chỉ đổi ký hiệu hiển thị',
          'Các con số giữ nguyên, chỉ đổi ' + M.get(oldCode).symbol + ' thành ' + M.get(newCode).symbol + '. An toàn nhất.'],
        ['convert', 'Quy đổi toàn bộ theo tỉ giá',
          'Nhân mọi số tiền với tỉ giá bạn nhập. App sẽ tự tải file sao lưu trước khi đổi.']
      ].forEach(function (o) {
        var id = 'mode_' + o[0];
        var radio = u.el('input', {
          type: 'radio', name: 'curmode', id: id, value: o[0],
          checked: mode === o[0], style: 'width:22px;height:22px;flex:none'
        });
        radio.addEventListener('change', function () {
          mode = o[0];
          rateWrap.classList.toggle('hidden', mode !== 'convert');
        });
        modeBox.appendChild(u.el('label', { class: 'switch-row', for: id }, [
          radio,
          u.el('span', { class: 'switch-row__body' }, [
            u.el('span', { class: 'switch-row__title', text: o[1] }),
            u.el('span', { class: 'switch-row__sub', text: o[2] })
          ])
        ]));
      });

      u.clear(rateWrap);
      rateWrap.appendChild(u.el('div', { class: 'field mt3' }, [
        u.el('label', {
          class: 'field__label', for: 'rate',
          text: 'Tỉ giá: 1 ' + oldCode + ' = ? ' + newCode
        }),
        rateInput,
        u.el('div', {
          class: 'field__hint',
          text: 'App chạy offline nên không tự lấy được tỉ giá. Bạn tra trên mạng rồi nhập vào đây. ' +
            'VD: 1 JPY ≈ 170 VND thì nhập 170.'
        })
      ]));
      rateWrap.classList.toggle('hidden', mode !== 'convert');
      modeBox.appendChild(rateWrap);
    }

    sel.addEventListener('change', renderMode);
    renderMode();
    body.appendChild(modeBox);

    var handle = u.sheet({
      title: 'Đơn vị tiền tệ',
      body: body, autofocus: false,
      actions: [
        { label: 'Hủy' },
        {
          label: 'Áp dụng', kind: 'primary', keepOpen: true,
          onClick: function () {
            var newCode = sel.value;
            if (newCode === oldCode) { handle.close(); return false; }

            if (mode === 'display') {
              st.setSetting('currency', newCode).then(function () {
                u.toast('Đã đổi sang ' + newCode, 'ok');
                handle.close();
                App.router.refresh();
              });
              return false;
            }

            var rate = parseFloat(String(rateInput.value).replace(/\s/g, '').replace(',', '.'));
            if (!isFinite(rate) || rate <= 0) {
              u.toast('Tỉ giá phải là số lớn hơn 0', 'danger');
              return false;
            }

            u.confirm({
              title: 'Quy đổi toàn bộ số liệu?',
              text: 'Mọi số tiền sẽ được nhân với ' + rate + ' và chuyển sang ' + newCode +
                '. App sẽ tải về một file sao lưu trước khi thực hiện.',
              okLabel: 'Sao lưu & quy đổi', danger: true
            }).then(function (ok) {
              if (!ok) return;
              return App.backup.exportJSON()
                .then(function () { return convertAll(oldCode, newCode, rate); })
                .then(function () { return st.setSetting('currency', newCode); })
                .then(function () { return st.load(); })
                .then(function () {
                  u.toast('Đã quy đổi sang ' + newCode, 'ok');
                  handle.close();
                  App.router.refresh();
                })
                .catch(function (e) {
                  u.alert('Quy đổi thất bại', e.message || String(e));
                });
            });
            return false;
          }
        }
      ]
    });
  }

  /** Nhân toàn bộ số tiền trong CSDL theo tỉ giá */
  function convertAll(oldCode, newCode, rate) {
    var from = M.get(oldCode), to = M.get(newCode);
    var conv = function (v) { return M.convert(v || 0, from, to, rate); };

    return Promise.all([
      App.db.getAll('transactions'),
      App.db.getAll('budgets'),
      App.db.getAll('goals'),
      App.db.getAll('recurring'),
      App.db.getAll('settings')
    ]).then(function (res) {
      var tx = res[0].map(function (t) { t.amount = conv(t.amount); return t; });
      var bd = res[1].map(function (b) { b.amount = conv(b.amount); return b; });
      var gl = res[2].map(function (g) {
        g.target = conv(g.target); g.saved = conv(g.saved); return g;
      });
      var rc = res[3].map(function (r) { r.amount = conv(r.amount); return r; });

      var qp = (res[4].filter(function (s) { return s.key === 'quickPicks'; })[0] || {}).value || [];
      qp = qp.map(function (p) {
        p.amount = conv(p.amount);
        p.key = p.categoryId + ':' + p.amount;
        return p;
      });

      return Promise.all([
        tx.length ? App.db.bulkPut('transactions', tx) : null,
        bd.length ? App.db.bulkPut('budgets', bd) : null,
        gl.length ? App.db.bulkPut('goals', gl) : null,
        rc.length ? App.db.bulkPut('recurring', rc) : null,
        App.db.put('settings', { key: 'quickPicks', value: qp })
      ]);
    });
  }

  /* =========================================================
     QUẢN LÝ HẠNG MỤC
     ========================================================= */

  function openCategories() {
    var body = u.el('div');
    var listBox = u.el('div');
    body.appendChild(listBox);

    function redraw() {
      u.clear(listBox);
      [['expense', 'Hạng mục CHI'], ['income', 'Hạng mục THU']].forEach(function (grp) {
        listBox.appendChild(u.el('div', { class: 'section-title', text: grp[1] }));
        var card = u.el('div', { class: 'card card--pad0' });
        var list = st.cats(grp[0]);
        list.forEach(function (c) {
          card.appendChild(u.el('button', {
            class: 'row', type: 'button',
            onclick: function () { openCatEditor(c, redraw); }
          }, [
            u.el('span', {
              class: 'row__ico', text: c.emoji,
              style: 'background:color-mix(in srgb, var(--' + c.color + ') 18%, transparent)'
            }),
            u.el('span', { class: 'row__body' }, [
              u.el('span', { class: 'row__title', text: c.name }),
              u.el('span', { class: 'row__sub', text: 'Chạm để sửa tên, biểu tượng, màu' })
            ]),
            u.el('span', { class: 'muted', text: '›' })
          ]));
        });
        card.appendChild(u.el('button', {
          class: 'row', type: 'button',
          style: 'color:var(--primary);font-weight:600',
          onclick: function () { openCatEditor({ type: grp[0] }, redraw); }
        }, [
          u.el('span', { class: 'row__ico', text: '＋' }),
          u.el('span', { class: 'row__body', text: 'Thêm hạng mục ' + (grp[0] === 'expense' ? 'chi' : 'thu') })
        ]));
        listBox.appendChild(card);
      });
    }
    redraw();

    u.sheet({
      title: 'Hạng mục',
      body: body,
      actions: [{ label: 'Xong', kind: 'primary', onClick: function () { App.router.refresh(); } }]
    });
  }

  var EMOJI_CHOICES = ['🛒', '🍜', '🏠', '🚗', '⛽', '💡', '💧', '🔥', '📱', '💻', '💊', '🏥',
    '👕', '👟', '🎮', '🎬', '📚', '✏️', '🧾', '🏦', '💸', '🎁', '✈️', '🐶', '👶', '💇', '🧹', '📦',
    '💰', '⏰', '📈', '🎯'];

  function openCatEditor(cat, onChange) {
    var isEdit = !!cat.id;
    var m = {
      id: cat.id || null,
      name: cat.name || '',
      emoji: cat.emoji || '📦',
      color: cat.color || 'c12',
      type: cat.type || 'expense',
      order: typeof cat.order === 'number' ? cat.order : 999
    };

    var nameInput = u.el('input', {
      class: 'input', type: 'text', id: 'cName', maxlength: '40',
      value: m.name, placeholder: 'VD: Cà phê'
    });

    var emojiBox = u.el('div', { class: 'chips', style: 'max-height:150px;overflow-y:auto' });
    EMOJI_CHOICES.forEach(function (e) {
      emojiBox.appendChild(u.el('button', {
        class: 'chip', type: 'button', text: e,
        style: 'font-size:20px;width:46px;padding:0;justify-content:center',
        'aria-pressed': String(m.emoji === e),
        onclick: function () {
          m.emoji = e;
          u.$$('button', emojiBox).forEach(function (b, i) {
            b.setAttribute('aria-pressed', String(EMOJI_CHOICES[i] === e));
          });
        }
      }));
    });

    var colorBox = u.el('div', { class: 'chips' });
    for (var i = 1; i <= 12; i++) {
      (function (n) {
        var key = 'c' + n;
        colorBox.appendChild(u.el('button', {
          class: 'chip', type: 'button', 'aria-label': 'Màu ' + n,
          'aria-pressed': String(m.color === key),
          style: 'width:44px;padding:0;justify-content:center',
          onclick: function () {
            m.color = key;
            u.$$('button', colorBox).forEach(function (b, k) {
              b.setAttribute('aria-pressed', String('c' + (k + 1) === key));
            });
          }
        }, [u.el('span', { style: 'width:20px;height:20px;border-radius:6px;display:block;background:var(--' + key + ')' })]));
      })(i);
    }

    var body = u.el('div', {}, [
      u.el('div', { class: 'field' }, [
        u.el('label', { class: 'field__label', for: 'cName', text: 'Tên hạng mục' }), nameInput
      ]),
      u.el('div', { class: 'field' }, [
        u.el('span', { class: 'field__label', text: 'Biểu tượng' }), emojiBox
      ]),
      u.el('div', { class: 'field' }, [
        u.el('span', { class: 'field__label', text: 'Màu' }), colorBox
      ])
    ]);

    if (isEdit) {
      body.appendChild(u.el('button', {
        class: 'btn btn--block mt3', type: 'button',
        style: 'color:var(--danger);border-color:var(--danger)',
        text: '🗑  Xóa hạng mục',
        onclick: function () { removeCategory(m, handle, onChange); }
      }));
    }

    var handle = u.sheet({
      title: isEdit ? 'Sửa hạng mục' : 'Thêm hạng mục',
      body: body, autofocus: false,
      actions: [
        { label: 'Hủy' },
        {
          label: 'Lưu', kind: 'primary', keepOpen: true,
          onClick: function () {
            var name = nameInput.value.trim();
            if (!name) { u.toast('Hãy nhập tên hạng mục', 'danger'); return false; }
            var rec = {
              id: m.id || ('c_' + u.uid()),
              name: name, emoji: m.emoji, color: m.color,
              type: m.type, order: m.order, archived: false
            };
            App.db.put('categories', rec)
              .then(function () { return App.db.getAll('categories'); })
              .then(function (all) {
                st.setCategories(all);
                u.toast('Đã lưu hạng mục', 'ok');
                handle.close();
                if (onChange) onChange();
              });
            return false;
          }
        }
      ]
    });
  }

  /** Xóa hạng mục: chỉ cho xóa hẳn khi không còn giao dịch nào dùng nó */
  function removeCategory(m, handle, onChange) {
    App.db.getAll('transactions').then(function (list) {
      var used = list.filter(function (t) { return t.categoryId === m.id; }).length;
      var text = used
        ? 'Có ' + used + ' giao dịch đang dùng hạng mục này. App sẽ ẨN hạng mục (không hiện khi nhập mới) ' +
          'nhưng giữ nguyên lịch sử để số liệu cũ không bị sai.'
        : 'Hạng mục này chưa có giao dịch nào, sẽ được xóa hẳn.';

      return u.confirm({
        title: used ? 'Ẩn hạng mục?' : 'Xóa hạng mục?',
        text: text, okLabel: used ? 'Ẩn đi' : 'Xóa', danger: true
      }).then(function (ok) {
        if (!ok) return;
        var op = used
          ? App.db.put('categories', {
              id: m.id, name: m.name, emoji: m.emoji, color: m.color,
              type: m.type, order: m.order, archived: true
            })
          : App.db.del('categories', m.id);

        return op
          .then(function () { return App.db.getAll('categories'); })
          .then(function (all) {
            st.setCategories(all);
            u.toast(used ? 'Đã ẩn hạng mục' : 'Đã xóa hạng mục');
            handle.close();
            if (onChange) onChange();
          });
      });
    });
  }

  /* =========================================================
     MÀN HÌNH CÀI ĐẶT
     ========================================================= */

  App.screens.settings = {
    title: 'Cài đặt',
    showPeriod: false,

    render: function (root) {
      u.clear(root);
      var s = st.S.settings;

      /* --- Tiền bạc --- */
      root.appendChild(u.el('div', { class: 'section-title', text: 'Tiền bạc' }));
      root.appendChild(u.el('div', { class: 'card card--pad0' }, [
        navRow('🎯', 'Hạn mức ngày / tuần / tháng', limitsSummary(), openLimits),
        navRow('🏷', 'Hạn mức theo hạng mục', catLimitsSummary(), openCategoryLimits),
        navRow('💱', 'Đơn vị tiền tệ',
          M.currency().symbol + ' ' + M.currency().code + ' — ' + M.currency().name, openCurrency),
        navRow('📂', 'Hạng mục thu / chi',
          st.cats('expense').length + ' hạng mục chi, ' + st.cats('income').length + ' hạng mục thu',
          openCategories),
        navRow('🔁', 'Khoản thu/chi định kỳ', 'Tiền nhà, internet, lương…', App.recurring.openList),
        navRow('🏆', 'Mục tiêu tiết kiệm', 'Đặt đích và theo dõi tiến độ', App.goalsUI.openList)
      ]));

      /* --- Giao diện & cảnh báo --- */
      root.appendChild(u.el('div', { class: 'section-title', text: 'Giao diện & cảnh báo' }));
      var uiCard = u.el('div', { class: 'card' });

      var themeSel = u.el('select', { class: 'select', id: 'setTheme' }, [
        u.el('option', { value: 'auto', text: 'Theo hệ thống', selected: s.theme === 'auto' }),
        u.el('option', { value: 'light', text: 'Luôn sáng', selected: s.theme === 'light' }),
        u.el('option', { value: 'dark', text: 'Luôn tối', selected: s.theme === 'dark' })
      ]);
      themeSel.addEventListener('change', function () {
        st.setSetting('theme', themeSel.value);
      });
      uiCard.appendChild(fieldRow('Chế độ màu', themeSel, 'setTheme'));

      var wsSel = u.el('select', { class: 'select', id: 'setWs' }, [
        u.el('option', { value: '1', text: 'Thứ hai', selected: s.weekStart !== 0 }),
        u.el('option', { value: '0', text: 'Chủ nhật', selected: s.weekStart === 0 })
      ]);
      wsSel.addEventListener('change', function () {
        st.setSetting('weekStart', parseInt(wsSel.value, 10)).then(App.router.refresh);
      });
      uiCard.appendChild(fieldRow('Tuần bắt đầu từ', wsSel, 'setWs'));

      var thSel = u.el('select', { class: 'select', id: 'setTh' });
      [60, 70, 75, 80, 85, 90, 95].forEach(function (v) {
        thSel.appendChild(u.el('option', { value: v, text: v + '%', selected: (s.warnThreshold || 80) === v }));
      });
      thSel.addEventListener('change', function () {
        st.setSetting('warnThreshold', parseInt(thSel.value, 10)).then(App.router.refresh);
      });
      uiCard.appendChild(fieldRow('Cảnh báo vàng khi đạt', thSel, 'setTh',
        'Thanh hạn mức chuyển vàng khi chi tiêu đạt mức này.'));

      uiCard.appendChild(toggleRow('Hỏi lại khi vượt hạn mức',
        'Hiện hộp xác nhận trước khi lưu khoản làm vượt mức.',
        s.confirmOverLimit !== false,
        function (on) { st.setSetting('confirmOverLimit', on); }));

      uiCard.appendChild(toggleRow('Thông báo hệ thống',
        'Nhắc bạn khi mở app nếu kỳ trước đã vượt hạn mức.',
        !!s.notifyEnabled,
        function (on, cb) {
          if (!on) { st.setSetting('notifyEnabled', false); return; }
          if (!('Notification' in window)) {
            u.toast('Trình duyệt này không hỗ trợ thông báo', 'danger');
            cb.checked = false;
            return;
          }
          Notification.requestPermission().then(function (p) {
            if (p === 'granted') {
              st.setSetting('notifyEnabled', true);
              u.toast('Đã bật thông báo', 'ok');
            } else {
              cb.checked = false;
              u.toast('Bạn đã từ chối quyền thông báo', 'danger');
            }
          });
        }));

      root.appendChild(uiCard);

      /* --- Dữ liệu --- */
      root.appendChild(u.el('div', { class: 'section-title', text: 'Dữ liệu của bạn' }));
      root.appendChild(u.el('div', { class: 'card card--pad0' }, [
        navRow('💾', 'Xuất file sao lưu (JSON)', 'Đủ mọi thứ, kể cả ảnh hóa đơn', function () {
          App.backup.exportJSON().then(function (n) { u.toast('Đã tải về ' + n, 'ok'); });
        }),
        navRow('📄', 'Xuất giao dịch ra CSV', 'Mở được bằng Excel', function () {
          App.backup.exportCSV().then(function (r) {
            u.toast('Đã tải về ' + r.count + ' dòng', 'ok');
          });
        }),
        navRow('📥', 'Nhập lại từ file sao lưu', 'Ghi đè toàn bộ dữ liệu hiện tại', function () {
          App.backup.openImportDialog(App.router.refresh);
        }),
        navRow('🗑', 'Xóa toàn bộ dữ liệu', 'Không khôi phục được', function () {
          App.backup.wipeWithConfirm(App.router.refresh);
        }, true)
      ]));

      root.appendChild(u.el('div', { class: 'alert alert--info mt3' }, [
        u.el('span', { class: 'ico', text: 'ℹ️' }),
        u.el('div', { class: 'alert__body' }, [
          u.el('div', { class: 'alert__title', text: 'Dữ liệu chỉ nằm trong máy bạn' }),
          u.el('div', {
            text: 'App không gửi gì lên mạng. Nếu bạn gỡ app hoặc xóa dữ liệu trình duyệt, ' +
              'dữ liệu sẽ mất — hãy xuất file sao lưu định kỳ.'
          })
        ])
      ]));

      /* --- Giới thiệu --- */
      root.appendChild(u.el('div', { class: 'section-title', text: 'Về ứng dụng' }));
      root.appendChild(u.el('div', { class: 'card' }, [
        u.el('div', { class: 'spread' }, [
          u.el('span', { class: 'small muted', text: 'Phiên bản' }),
          u.el('span', { class: 'small', text: App.VERSION || '1.0' })
        ]),
        u.el('div', { class: 'spread mt2' }, [
          u.el('span', { class: 'small muted', text: 'Nơi lưu dữ liệu' }),
          u.el('span', {
            class: 'small',
            text: App.db.backend() === 'idb' ? 'IndexedDB (tốt)' : 'localStorage (dự phòng)'
          })
        ]),
        u.el('div', { class: 'spread mt2' }, [
          u.el('span', { class: 'small muted', text: 'Chạy offline' }),
          u.el('span', {
            class: 'small',
            text: ('serviceWorker' in navigator && navigator.serviceWorker.controller) ? 'Đã bật ✓' : 'Chưa bật'
          })
        ]),
        u.el('button', {
          class: 'btn btn--block mt3', type: 'button', text: '📲  Cách cài vào màn hình chính',
          onclick: showInstallHelp
        })
      ]));

      if (App.db.backend() === 'ls') {
        root.appendChild(u.el('div', { class: 'alert alert--warn mt3' }, [
          u.el('span', { class: 'ico', text: '⚠️' }),
          u.el('div', { class: 'alert__body', text: 'Đang dùng bộ nhớ dự phòng (localStorage) — dung lượng hạn chế, ' +
            'nên hạn chế đính kèm ảnh và nhớ xuất sao lưu thường xuyên.' })
        ]));
      }
    }
  };

  function limitsSummary() {
    var parts = [];
    if (st.getBudget('daily')) parts.push('ngày ' + M.compact(st.getBudget('daily')));
    if (st.getBudget('weekly')) parts.push('tuần ' + M.compact(st.getBudget('weekly')));
    if (st.getBudget('monthly')) parts.push('tháng ' + M.compact(st.getBudget('monthly')));
    return parts.length ? parts.join(' · ') : 'Chưa đặt — chạm để thiết lập';
  }

  function catLimitsSummary() {
    var n = st.cats('expense').filter(function (c) { return st.getBudget(st.catBudgetKey(c.id)); }).length;
    return n ? n + ' hạng mục có hạn mức riêng' : 'Chưa đặt hạn mức riêng nào';
  }

  function navRow(emoji, title, sub, onClick, danger) {
    return u.el('button', {
      class: 'row', type: 'button', onclick: onClick,
      style: danger ? 'color:var(--danger)' : null
    }, [
      u.el('span', { class: 'row__ico', text: emoji }),
      u.el('span', { class: 'row__body' }, [
        u.el('span', { class: 'row__title', text: title }),
        u.el('span', { class: 'row__sub', text: sub })
      ]),
      u.el('span', { class: 'muted', text: '›' })
    ]);
  }

  function fieldRow(label, control, id, hint) {
    return u.el('div', { class: 'field' }, [
      u.el('label', { class: 'field__label', for: id, text: label }),
      control,
      hint ? u.el('div', { class: 'field__hint', text: hint }) : null
    ]);
  }

  function toggleRow(title, sub, checked, onChange) {
    var cb = u.el('input', {
      type: 'checkbox', checked: checked,
      style: 'width:24px;height:24px;flex:none'
    });
    cb.addEventListener('change', function () { onChange(cb.checked, cb); });
    var id = 'tg_' + u.uid();
    cb.id = id;
    return u.el('label', { class: 'switch-row', for: id }, [
      u.el('span', { class: 'switch-row__body' }, [
        u.el('span', { class: 'switch-row__title', text: title }),
        u.el('span', { class: 'switch-row__sub', text: sub })
      ]),
      cb
    ]);
  }

  function showInstallHelp() {
    var body = u.el('div');
    body.appendChild(u.el('p', { class: 'small', text: 'Cài app vào màn hình chính để mở nhanh và chạy toàn màn hình:' }));

    [
      ['📱 Android (Chrome)', '1. Chạm nút ⋮ ở góc trên bên phải\n2. Chọn "Thêm vào Màn hình chính" / "Cài đặt ứng dụng"\n3. Xác nhận'],
      ['🍎 iPhone (Safari)', '1. Chạm nút Chia sẻ (hình vuông có mũi tên) ở thanh dưới\n2. Kéo xuống chọn "Thêm vào MH chính"\n3. Chạm "Thêm"'],
      ['💻 Máy tính (Chrome/Edge)', 'Chạm biểu tượng cài đặt hình màn hình ở thanh địa chỉ, hoặc menu ⋮ → "Cài đặt ứng dụng"']
    ].forEach(function (g) {
      body.appendChild(u.el('div', { class: 'section-title', text: g[0] }));
      body.appendChild(u.el('p', { class: 'small muted', style: 'white-space:pre-line;margin:0', text: g[1] }));
    });

    body.appendChild(u.el('div', { class: 'alert alert--info mt4' }, [
      u.el('span', { class: 'ico', text: '💡' }),
      u.el('div', { class: 'alert__body', text: 'Nút cài đặt chỉ hiện khi bạn mở app qua địa chỉ https:// hoặc localhost.' })
    ]));

    u.sheet({ title: 'Cài vào màn hình chính', body: body, actions: [{ label: 'Đã hiểu', kind: 'primary' }] });
  }

  App.settingsUI = {
    openLimits: openLimits,
    openCategoryLimits: openCategoryLimits,
    openCurrency: openCurrency,
    openCategories: openCategories,
    showInstallHelp: showInstallHelp
  };
})();

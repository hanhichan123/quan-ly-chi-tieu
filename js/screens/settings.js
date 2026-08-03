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
        u.el('label', { class: 'field__label', for: 'cl_' + c.id, text: c.emoji + '  ' + App.i18n.t(c.name) }),
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
        text: c.symbol + '  ' + c.code + ' — ' + M.nameOf(c)
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
     PHƯƠNG THỨC THANH TOÁN
     ========================================================= */

  var PAY_EMOJIS = ['💴', '💳', '📱', '🅿️', '🚃', '💬', '🔵', '🟠', '🔴', '🏧',
    '🏦', '🔁', '🏪', '💰', '🎫', '📦'];

  function openPayments() {
    var body = u.el('div');
    var listBox = u.el('div');
    body.appendChild(u.el('p', {
      class: 'small muted',
      text: 'Danh sách mặc định theo các hình thức đang phổ biến ở Nhật. Bạn sửa hoặc thêm tùy ý.'
    }));
    body.appendChild(listBox);

    function redraw() {
      u.clear(listBox);
      var card = u.el('div', { class: 'card card--pad0' });
      st.pays().forEach(function (p) {
        card.appendChild(u.el('button', {
          class: 'row', type: 'button',
          onclick: function () { openPayEditor(p, redraw); }
        }, [
          u.el('span', {
            class: 'row__ico', text: p.emoji,
            style: 'background:color-mix(in srgb, var(--' + p.color + ') 18%, transparent)'
          }),
          u.el('span', { class: 'row__body' }, [
            u.el('span', { class: 'row__title', text: p.name }),
            u.el('span', { class: 'row__sub', text: p.jp || 'Chạm để sửa' })
          ]),
          u.el('span', { class: 'muted', text: '›' })
        ]));
      });
      card.appendChild(u.el('button', {
        class: 'row', type: 'button', style: 'color:var(--primary);font-weight:600',
        onclick: function () { openPayEditor(null, redraw); }
      }, [
        u.el('span', { class: 'row__ico', text: '＋' }),
        u.el('span', { class: 'row__body', text: 'Thêm phương thức thanh toán' })
      ]));
      listBox.appendChild(card);
    }
    redraw();

    u.sheet({
      title: 'Phương thức thanh toán', body: body,
      actions: [{ label: 'Xong', kind: 'primary', onClick: function () { App.router.refresh(); } }]
    });
  }

  function openPayEditor(p, onChange) {
    var isEdit = !!(p && p.id);
    var m = {
      id: isEdit ? p.id : null,
      name: (p && p.name) || '',
      jp: (p && p.jp) || '',
      emoji: (p && p.emoji) || '💳',
      color: (p && p.color) || 'c1',
      order: (p && typeof p.order === 'number') ? p.order : 999
    };

    var nameInput = u.el('input', {
      class: 'input', type: 'text', id: 'pName', maxlength: '40',
      value: m.name, placeholder: 'VD: PayPay'
    });
    var jpInput = u.el('input', {
      class: 'input', type: 'text', id: 'pJp', maxlength: '40',
      value: m.jp, placeholder: 'VD: ペイペイ'
    });

    var emojiBox = u.el('div', { class: 'chips' });
    PAY_EMOJIS.forEach(function (e) {
      emojiBox.appendChild(u.el('button', {
        class: 'chip', type: 'button', text: e,
        style: 'font-size:20px;width:46px;padding:0;justify-content:center',
        'aria-pressed': String(m.emoji === e),
        onclick: function () {
          m.emoji = e;
          u.$$('button', emojiBox).forEach(function (b, i) {
            b.setAttribute('aria-pressed', String(PAY_EMOJIS[i] === e));
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
        u.el('label', { class: 'field__label', for: 'pName', text: 'Tên phương thức' }), nameInput
      ]),
      u.el('div', { class: 'field' }, [
        u.el('label', { class: 'field__label', for: 'pJp', text: 'Tên tiếng Nhật (không bắt buộc)' }),
        jpInput,
        u.el('div', { class: 'field__hint', text: 'Ghi để dễ đối chiếu với hóa đơn và app ngân hàng.' })
      ]),
      u.el('div', { class: 'field' }, [u.el('span', { class: 'field__label', text: 'Biểu tượng' }), emojiBox]),
      u.el('div', { class: 'field' }, [u.el('span', { class: 'field__label', text: 'Màu' }), colorBox])
    ]);

    if (isEdit) {
      body.appendChild(u.el('button', {
        class: 'btn btn--block mt3', type: 'button',
        style: 'color:var(--danger);border-color:var(--danger)',
        text: '🗑  Xóa phương thức',
        onclick: function () { removePayment(m, handle, onChange); }
      }));
    }

    var handle = u.sheet({
      title: isEdit ? 'Sửa phương thức' : 'Thêm phương thức',
      body: body, autofocus: false,
      actions: [
        { label: 'Hủy' },
        {
          label: 'Lưu', kind: 'primary', keepOpen: true,
          onClick: function () {
            var name = nameInput.value.trim();
            if (!name) { u.toast('Hãy nhập tên phương thức', 'danger'); return false; }
            st.savePayment({
              id: m.id, name: name, jp: jpInput.value.trim(),
              emoji: m.emoji, color: m.color, order: m.order, archived: false
            }).then(function () {
              u.toast('Đã lưu phương thức', 'ok');
              handle.close();
              if (onChange) onChange();
            });
            return false;
          }
        }
      ]
    });
  }

  /** Xóa hẳn nếu chưa dùng, còn đang dùng thì chỉ ẩn để số liệu cũ không sai */
  function removePayment(m, handle, onChange) {
    App.db.getAll('transactions').then(function (list) {
      var used = list.filter(function (t) { return t.paymentId === m.id; }).length;
      var text = used
        ? 'Có ' + used + ' giao dịch đang dùng phương thức này. App sẽ ẨN nó khỏi danh sách chọn ' +
          'nhưng giữ nguyên lịch sử để thống kê cũ không bị sai.'
        : 'Phương thức này chưa có giao dịch nào, sẽ được xóa hẳn.';

      return u.confirm({
        title: used ? 'Ẩn phương thức?' : 'Xóa phương thức?',
        text: text, okLabel: used ? 'Ẩn đi' : 'Xóa', danger: true
      }).then(function (ok) {
        if (!ok) return;
        var op = used
          ? st.savePayment({
              id: m.id, name: m.name, jp: m.jp, emoji: m.emoji,
              color: m.color, order: m.order, archived: true
            })
          : st.delPayment(m.id);
        return op.then(function () {
          u.toast(used ? 'Đã ẩn phương thức' : 'Đã xóa phương thức');
          handle.close();
          if (onChange) onChange();
        });
      });
    });
  }

  /* =========================================================
     KHOÁ ỨNG DỤNG
     ========================================================= */

  /** Bảng đặt / đổi mã PIN — nhập 2 lần cho khớp */
  function openPinSetup(onDone) {
    var step = 1, first = '';

    var title = u.el('h3', { style: 'margin:0 0 6px;font-size:16px', text: 'Nhập mã PIN mới' });
    var hint = u.el('p', {
      class: 'small muted', style: 'margin:0 0 16px',
      text: 'Từ ' + App.lock.PIN_MIN + ' đến ' + App.lock.PIN_MAX + ' chữ số.'
    });
    var input = u.el('input', {
      class: 'input input--amount', type: 'password', inputmode: 'numeric',
      autocomplete: 'new-password', maxlength: String(App.lock.PIN_MAX),
      id: 'pinInput', placeholder: '••••'
    });
    input.addEventListener('input', function () {
      input.value = input.value.replace(/\D/g, '');
    });

    var body = u.el('div', {}, [
      title, hint,
      u.el('div', { class: 'field' }, [input]),
      u.el('div', { class: 'alert alert--info' }, [
        u.el('span', { class: 'ico', text: '⚠️' }),
        u.el('div', { class: 'alert__body' }, [
          u.el('div', { class: 'alert__title', text: 'Quên PIN là mất dữ liệu' }),
          u.el('div', {
            text: 'App không có máy chủ nên không ai đặt lại mã PIN hộ bạn được. ' +
              'Hãy xuất một file sao lưu trước khi bật khoá.'
          })
        ])
      ])
    ]);

    var handle = u.sheet({
      title: 'Đặt mã PIN',
      body: body, autofocus: false,
      actions: [
        { label: 'Hủy' },
        {
          label: 'Tiếp tục', kind: 'primary', keepOpen: true,
          onClick: function (h) {
            var v = input.value;
            if (step === 1) {
              if (v.length < App.lock.PIN_MIN) {
                u.toast('Mã PIN cần ít nhất ' + App.lock.PIN_MIN + ' chữ số', 'danger');
                return false;
              }
              first = v;
              step = 2;
              input.value = '';
              title.textContent = 'Nhập lại mã PIN';
              hint.textContent = 'Gõ lại đúng mã vừa rồi để xác nhận.';
              h.node.querySelectorAll('.sheet__foot .btn')[1].textContent = 'Bật khoá';
              input.focus();
              return false;
            }
            if (v !== first) {
              u.toast('Hai lần nhập không khớp, thử lại', 'danger');
              step = 1;
              first = '';
              input.value = '';
              title.textContent = 'Nhập mã PIN mới';
              h.node.querySelectorAll('.sheet__foot .btn')[1].textContent = 'Tiếp tục';
              return false;
            }
            App.lock.setPin(v).then(function () {
              u.toast('Đã bật khoá ứng dụng', 'ok');
              handle.close();
              if (onDone) onDone();
            }).catch(function (e) {
              u.alert('Không bật được khoá', e.message || String(e));
            });
            return false;
          }
        }
      ]
    });
    setTimeout(function () { input.focus(); }, 150);
  }

  function openLockSettings() {
    var body = u.el('div');

    function redraw() {
      u.clear(body);
      var s = st.S.settings;
      var on = App.lock.isEnabled();

      if (!App.lock.cryptoReady()) {
        body.appendChild(u.el('div', { class: 'alert alert--warn' }, [
          u.el('span', { class: 'ico', text: '⚠️' }),
          u.el('div', { class: 'alert__body', text: 'Trình duyệt này không cung cấp thư viện mã hoá cần thiết ' +
            '(thường do mở app bằng file:// thay vì https). Không dùng được tính năng khoá.' })
        ]));
        return;
      }

      body.appendChild(toggleRow('Khoá ứng dụng bằng mã PIN',
        on ? 'Đang bật' : 'Hỏi mã PIN mỗi khi mở app',
        on,
        function (want, cb) {
          if (want) {
            cb.checked = false;                     // chỉ bật khi đặt PIN xong
            openPinSetup(function () { redraw(); App.router.refresh(); });
          } else {
            u.confirm({
              title: 'Tắt khoá ứng dụng?',
              text: 'Ai cầm máy bạn cũng mở xem được toàn bộ chi tiêu.',
              okLabel: 'Tắt khoá', danger: true
            }).then(function (ok) {
              if (!ok) { cb.checked = true; return; }
              App.lock.disable().then(function () {
                u.toast('Đã tắt khoá');
                redraw();
                App.router.refresh();
              });
            });
          }
        }));

      if (!on) {
        body.appendChild(honestNote());
        return;
      }

      // Đổi PIN
      body.appendChild(u.el('button', {
        class: 'btn btn--block mt3', type: 'button', text: '🔑  Đổi mã PIN',
        onclick: function () { openPinSetup(redraw); }
      }));

      // Tự khoá sau bao lâu
      var autoSel = u.el('select', { class: 'select', id: 'lockAuto' });
      [[0, 'Ngay lập tức'], [1, 'Sau 1 phút'], [5, 'Sau 5 phút'], [15, 'Sau 15 phút'], [60, 'Sau 1 giờ']]
        .forEach(function (o) {
          autoSel.appendChild(u.el('option', {
            value: o[0], text: o[1], selected: (s.lockAutoMinutes || 0) === o[0]
          }));
        });
      autoSel.addEventListener('change', function () {
        st.setSetting('lockAutoMinutes', parseInt(autoSel.value, 10));
      });
      body.appendChild(u.el('div', { class: 'field mt4' }, [
        u.el('label', { class: 'field__label', for: 'lockAuto', text: 'Tự khoá lại khi rời app' }),
        autoSel
      ]));

      // Vân tay
      var bioWrap = u.el('div');
      body.appendChild(bioWrap);
      App.lock.biometricAvailable().then(function (avail) {
        u.clear(bioWrap);
        if (!avail) {
          bioWrap.appendChild(u.el('div', { class: 'field__hint' , text:
            'Thiết bị này chưa dùng được vân tay/khuôn mặt cho app web ' +
            '(cần mở qua https và máy có cảm biến đã cài sẵn).' }));
          return;
        }
        bioWrap.appendChild(toggleRow('Mở khoá bằng vân tay / khuôn mặt',
          'Vẫn giữ mã PIN làm phương án dự phòng',
          !!s.lockBiometric,
          function (want, cb) {
            if (want) {
              App.lock.registerBiometric().then(function () {
                u.toast('Đã bật mở khoá bằng vân tay', 'ok');
                redraw();
              }).catch(function (e) {
                cb.checked = false;
                u.alert('Không đăng ký được', e.message || 'Bạn đã huỷ hoặc thiết bị từ chối.');
              });
            } else {
              st.setSetting('lockBiometric', false)
                .then(function () { return st.setSetting('lockCredentialId', null); })
                .then(function () { u.toast('Đã tắt'); redraw(); });
            }
          }));
      });

      body.appendChild(honestNote());
    }

    function honestNote() {
      return u.el('div', { class: 'alert alert--info mt4' }, [
        u.el('span', { class: 'ico', text: 'ℹ️' }),
        u.el('div', { class: 'alert__body' }, [
          u.el('div', { class: 'alert__title', text: 'Đây là lớp che, không phải mã hoá' }),
          u.el('div', {
            text: 'Mã PIN chặn người khác cầm máy bạn mở app ra xem. Nhưng người biết kỹ thuật, ' +
              'có trong tay thiết bị đã mở khoá, vẫn đọc được dữ liệu qua công cụ của trình duyệt. ' +
              'Dữ liệu thật sự nhạy cảm thì nên đặt thêm khoá màn hình cho cả điện thoại.'
          })
        ])
      ]);
    }

    redraw();
    u.sheet({ title: 'Khoá ứng dụng', body: body, actions: [{ label: 'Xong', kind: 'primary' }] });
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
          M.currency().symbol + ' ' + M.currency().code + ' — ' + M.nameOf(M.currency()), openCurrency),
        navRow('📂', 'Hạng mục thu / chi',
          st.cats('expense').length + ' hạng mục chi, ' + st.cats('income').length + ' hạng mục thu',
          openCategories),
        navRow('💳', 'Phương thức thanh toán',
          st.pays().length + ' phương thức đang dùng', openPayments),
        navRow('🔁', 'Khoản thu/chi định kỳ', 'Tiền nhà, internet, lương…', App.recurring.openList),
        navRow('🏆', 'Mục tiêu tiết kiệm', 'Đặt đích và theo dõi tiến độ', App.goalsUI.openList)
      ]));

      /* --- Giao diện & cảnh báo --- */
      root.appendChild(u.el('div', { class: 'section-title', text: 'Giao diện & cảnh báo' }));
      var uiCard = u.el('div', { class: 'card' });

      // Mỗi ngôn ngữ hiển thị bằng chính nó — đây là quy ước chung
      var langSel = u.el('select', { class: 'select', id: 'setLang' }, [
        u.el('option', { value: 'vi', text: 'Tiếng Việt', selected: (s.lang || 'vi') === 'vi' }),
        u.el('option', { value: 'en', text: 'English', selected: s.lang === 'en' }),
        u.el('option', { value: 'ja', text: '日本語', selected: s.lang === 'ja' })
      ]);
      langSel.addEventListener('change', function () {
        // Tải lại trang là cách chắc chắn nhất: chiều Anh -> Việt không thể
        // dịch ngược từ chữ đã thay, mà phải dựng lại từ nguồn tiếng Việt.
        st.setSetting('lang', langSel.value).then(function () {
          location.reload();
        });
      });
      uiCard.appendChild(fieldRow('Ngôn ngữ', langSel, 'setLang'));

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

      /* --- Bảo mật --- */
      root.appendChild(u.el('div', { class: 'section-title', text: 'Bảo mật' }));
      root.appendChild(u.el('div', { class: 'card card--pad0' }, [
        navRow('🔒', 'Khoá ứng dụng',
          App.lock.isEnabled()
            ? 'Đang bật · ' + autoLockText(s.lockAutoMinutes) + (s.lockBiometric ? ' · có vân tay' : '')
            : 'Đặt mã PIN để người khác không xem được',
          openLockSettings)
      ]));

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

      // Nhắc sao lưu
      var bkCard = u.el('div', { class: 'card mt3' });
      var remSel = u.el('select', { class: 'select', id: 'setRem' });
      [[0, 'Không nhắc'], [7, 'Mỗi tuần'], [14, 'Mỗi 2 tuần'], [30, 'Mỗi tháng']].forEach(function (o) {
        remSel.appendChild(u.el('option', {
          value: o[0], text: o[1], selected: (s.backupReminderDays || 0) === o[0]
        }));
      });
      remSel.addEventListener('change', function () {
        st.setSetting('backupReminderDays', parseInt(remSel.value, 10)).then(App.router.refresh);
      });
      bkCard.appendChild(fieldRow('Nhắc sao lưu', remSel, 'setRem',
        'App sẽ nhắc ở màn Tổng quan khi đã lâu chưa sao lưu và có giao dịch mới.'));
      bkCard.appendChild(u.el('div', { class: 'spread' }, [
        u.el('span', { class: 'small muted', text: 'Sao lưu gần nhất' }),
        u.el('span', { class: 'small', text: lastBackupText() })
      ]));
      root.appendChild(bkCard);

      root.appendChild(u.el('div', { class: 'alert alert--info mt3' }, [
        u.el('span', { class: 'ico', text: 'ℹ️' }),
        u.el('div', { class: 'alert__body' }, [
          u.el('div', { class: 'alert__title', text: 'Dữ liệu chỉ nằm trong máy bạn' }),
          u.el('div', {
            text: 'App không gửi gì lên mạng. Nếu bạn gỡ app hoặc xóa dữ liệu trình duyệt, ' +
              'dữ liệu sẽ mất — hãy xuất file sao lưu định kỳ.'
          }),
          u.el('a', {
            class: 'card__link', href: 'privacy.html', target: '_blank', rel: 'noopener',
            style: 'display:inline-block;margin-top:8px', text: 'Đọc chính sách bảo mật →'
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

  function autoLockText(mins) {
    if (!mins) return 'khoá ngay khi rời app';
    if (mins >= 60) return 'khoá sau ' + (mins / 60) + ' giờ';
    return 'khoá sau ' + mins + ' phút';
  }

  function lastBackupText() {
    var at = st.S.settings.lastBackupAt;
    if (!at) return 'Chưa bao giờ';
    var days = Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
    var when = new Date(at).toLocaleDateString('vi-VN');
    if (days <= 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    return when + ' (' + days + ' ngày trước)';
  }

  function limitsSummary() {
    var parts = [];
    function add(key, vi, en, ja) {
      var v = st.getBudget(key);
      if (v) parts.push(App.i18n.pick(vi, en, ja) + ' ' + M.compact(v));
    }
    add('daily', 'ngày', 'daily', '日');
    add('weekly', 'tuần', 'weekly', '週');
    add('monthly', 'tháng', 'monthly', '月');
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
    openPayments: openPayments,
    openLockSettings: openLockSettings,
    showInstallHelp: showInstallHelp
  };
})();

/* ===========================================================
   screens/transactions.js
   - Màn hình "Chi tiêu": danh sách giao dịch theo kỳ, lọc, tìm kiếm.
   - Bảng nhập/sửa giao dịch (dùng chung cho nút "+" ở mọi màn hình).
   =========================================================== */

(function () {
  'use strict';

  var u = App.util, D = App.dates, M = App.money, st = App.state, B = App.budget;

  App.screens = App.screens || {};

  /* =========================================================
     BẢNG NHẬP / SỬA GIAO DỊCH
     ========================================================= */

  var txEditor = (function () {

    /**
     * open(tx, opts)
     * tx    : bản ghi cần sửa, hoặc null để tạo mới
     * opts  : {defaults:{type,categoryId,amount,date}, onSaved:fn}
     */
    function open(tx, opts) {
      opts = opts || {};
      var isEdit = !!(tx && tx.id);
      var d = opts.defaults || {};

      var model = {
        id: isEdit ? tx.id : null,
        type: (tx && tx.type) || d.type || 'expense',
        amount: (tx && tx.amount) || d.amount || 0,
        categoryId: (tx && tx.categoryId) || d.categoryId || null,
        date: (tx && tx.date) || d.date || D.today(),
        note: (tx && tx.note) || '',
        photo: (tx && tx.photo) || null,
        // Mặc định lấy phương thức dùng lần trước cho đỡ phải chọn lại
        paymentId: (tx && tx.paymentId) || d.paymentId || st.S.settings.lastPaymentId || 'cash',
        createdAt: tx && tx.createdAt
      };

      var body = u.el('div');

      /* --- Chuyển Chi / Thu --- */
      var typeSwitch = u.el('div', { class: 'typeswitch' });
      ['expense', 'income'].forEach(function (t) {
        typeSwitch.appendChild(u.el('button', {
          type: 'button', dataset: { type: t },
          'aria-pressed': String(model.type === t),
          text: t === 'expense' ? '− Khoản chi' : '+ Khoản thu',
          onclick: function () {
            if (model.type === t) return;
            model.type = t;
            model.categoryId = null;
            u.$$('button', typeSwitch).forEach(function (b) {
              b.setAttribute('aria-pressed', String(b.dataset.type === t));
            });
            renderCats();
          }
        }));
      });
      body.appendChild(typeSwitch);

      /* --- Số tiền --- */
      var amountInput = u.el('input', {
        class: 'input input--amount', type: 'text', inputmode: 'decimal',
        id: 'txAmount', placeholder: '0',
        value: model.amount ? M.toInput(model.amount) : '',
        'aria-label': 'Số tiền'
      });
      amountInput.addEventListener('blur', function () {
        var v = M.parse(amountInput.value);
        amountInput.value = v ? M.toInput(v) : '';
      });
      body.appendChild(u.el('div', { class: 'field' }, [
        u.el('label', { class: 'field__label', for: 'txAmount', text: 'Số tiền (' + M.currency().code + ')' }),
        u.el('div', { class: 'input-group' }, [
          amountInput,
          u.el('div', { class: 'input-group__unit', text: M.currency().symbol })
        ])
      ]));

      /* --- Hạng mục --- */
      var catBox = u.el('div', { class: 'catgrid' });

      function renderCats() {
        u.clear(catBox);
        var list = st.cats(model.type);
        if (!list.length) {
          catBox.appendChild(u.el('div', { class: 'small muted', text: 'Chưa có hạng mục. Thêm ở tab Cài đặt.' }));
          return;
        }
        list.forEach(function (c) {
          catBox.appendChild(u.el('button', {
            type: 'button', 'aria-pressed': String(model.categoryId === c.id),
            onclick: function () {
              model.categoryId = c.id;
              u.$$('button', catBox).forEach(function (b, i) {
                b.setAttribute('aria-pressed', String(list[i].id === c.id));
              });
            }
          }, [
            u.el('span', { class: 'ico', text: c.emoji }),
            u.el('span', { class: 'nm', text: c.name })
          ]));
        });
      }
      renderCats();
      body.appendChild(u.el('div', { class: 'field' }, [
        u.el('span', { class: 'field__label', text: 'Hạng mục' }),
        catBox
      ]));

      /* --- Phương thức thanh toán --- */
      var payBox = u.el('div', { class: 'chips chips--scroll' });
      var payList = st.pays();
      payList.forEach(function (p) {
        payBox.appendChild(u.el('button', {
          class: 'chip', type: 'button',
          'aria-pressed': String(model.paymentId === p.id),
          title: p.jp || p.name,
          onclick: function () {
            model.paymentId = p.id;
            u.$$('button', payBox).forEach(function (b, i) {
              b.setAttribute('aria-pressed', String(payList[i].id === p.id));
            });
          }
        }, [
          // Tên nằm riêng một nút để bộ dịch song ngữ tra được
          u.el('span', { text: p.emoji + ' ' }),
          u.el('span', { text: p.name })
        ]));
      });
      body.appendChild(u.el('div', { class: 'field' }, [
        u.el('span', { class: 'field__label', text: 'Thanh toán bằng' }),
        payBox
      ]));

      /* --- Ngày --- */
      var dateInput = u.el('input', { class: 'input', type: 'date', id: 'txDate', value: model.date });
      body.appendChild(u.el('div', { class: 'field' }, [
        u.el('label', { class: 'field__label', for: 'txDate', text: 'Ngày' }),
        dateInput,
        u.el('div', { class: 'chips mt2' }, [
          quickDate('Hôm nay', D.today()),
          quickDate('Hôm qua', D.addDays(D.today(), -1)),
          quickDate('Hôm kia', D.addDays(D.today(), -2))
        ])
      ]));

      function quickDate(label, iso) {
        return u.el('button', {
          class: 'chip', type: 'button', text: label,
          onclick: function () { dateInput.value = iso; }
        });
      }

      /* --- Ghi chú --- */
      var noteInput = u.el('input', {
        class: 'input', type: 'text', id: 'txNote', maxlength: '140',
        value: model.note, placeholder: 'VD: mua rau ở siêu thị'
      });
      body.appendChild(u.el('div', { class: 'field' }, [
        u.el('label', { class: 'field__label', for: 'txNote', text: 'Ghi chú (không bắt buộc)' }),
        noteInput
      ]));

      /* --- Ảnh hóa đơn --- */
      var photoBox = u.el('div');
      var fileInput = u.el('input', {
        type: 'file', accept: 'image/*', class: 'sr-only', id: 'txPhoto'
      });
      fileInput.addEventListener('change', function () {
        var f = fileInput.files && fileInput.files[0];
        if (!f) return;
        App.photo.fromFile(f).then(function (dataUrl) {
          model.photo = dataUrl;
          renderPhoto();
          u.toast('Đã đính kèm ảnh (' + App.photo.sizeText(dataUrl) + ')', 'ok');
        }).catch(function (e) {
          u.toast(e.message || 'Không xử lý được ảnh', 'danger');
        });
        fileInput.value = '';
      });

      function renderPhoto() {
        u.clear(photoBox);
        if (model.photo) {
          photoBox.appendChild(u.el('div', { class: 'spread' }, [
            u.el('img', {
              src: model.photo, alt: 'Ảnh hóa đơn đã đính kèm',
              style: 'width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--border)',
              onclick: function () { App.photo.view(model.photo); }
            }),
            u.el('span', { class: 'small muted', text: App.photo.sizeText(model.photo) }),
            u.el('button', {
              class: 'btn btn--sm', type: 'button', text: 'Gỡ ảnh',
              onclick: function () { model.photo = null; renderPhoto(); }
            })
          ]));
        } else {
          photoBox.appendChild(u.el('button', {
            class: 'btn btn--block', type: 'button', text: '📷  Đính kèm ảnh hóa đơn',
            onclick: function () { fileInput.click(); }
          }));
        }
      }
      renderPhoto();
      body.appendChild(u.el('div', { class: 'field' }, [fileInput, photoBox]));

      if (isEdit) {
        body.appendChild(u.el('button', {
          class: 'btn btn--block', type: 'button',
          style: 'color:var(--danger);border-color:var(--danger)',
          text: '🗑  Xóa giao dịch này',
          onclick: function () {
            u.confirm({
              title: 'Xóa giao dịch?',
              text: 'Giao dịch này sẽ bị xóa vĩnh viễn khỏi máy.',
              okLabel: 'Xóa', danger: true
            }).then(function (ok) {
              if (!ok) return;
              st.delTx(model.id).then(function () {
                u.toast('Đã xóa giao dịch');
                handle.close();
                if (opts.onSaved) opts.onSaved();
              });
            });
          }
        }));
      }

      /* --- Lưu --- */
      function doSave() {
        var amount = M.parse(amountInput.value);
        if (!amount || amount <= 0) {
          u.toast('Hãy nhập số tiền lớn hơn 0', 'danger');
          amountInput.focus();
          return false;
        }
        if (!model.categoryId) {
          u.toast('Hãy chọn một hạng mục', 'danger');
          return false;
        }
        if (!dateInput.value) {
          u.toast('Hãy chọn ngày', 'danger');
          return false;
        }

        var rec = {
          id: model.id, type: model.type, amount: amount,
          categoryId: model.categoryId, date: dateInput.value,
          note: noteInput.value.trim(), photo: model.photo,
          paymentId: model.paymentId,
          createdAt: model.createdAt
        };

        var check = st.S.settings.confirmOverLimit
          ? B.checkBeforeSave(rec)
          : Promise.resolve([]);

        check.then(function (hits) {
          if (!hits.length) return true;
          return u.confirm({
            title: '⚠️ Vượt hạn mức',
            text: buildOverText(hits),
            okLabel: 'Vẫn lưu', cancelLabel: 'Xem lại', danger: true
          });
        }).then(function (ok) {
          if (!ok) return;
          return st.saveTx(rec)
            .then(function (saved) { return st.rememberQuickPick(saved); })
            .then(function () { return st.setSetting('lastPaymentId', rec.paymentId); })
            .then(function () {
              u.toast(isEdit ? 'Đã cập nhật' : 'Đã lưu ' + M.format(amount), 'ok');
              handle.close();
              if (opts.onSaved) opts.onSaved();
            });
        }).catch(function (e) {
          console.error(e);
          u.toast(e.message || 'Lưu thất bại', 'danger');
        });
        return false; // giữ bảng mở cho tới khi lưu xong
      }

      var handle = u.sheet({
        title: isEdit ? 'Sửa giao dịch' : 'Thêm giao dịch',
        body: body,
        autofocus: false,
        actions: [
          { label: 'Hủy', onClick: function () { return true; } },
          { label: isEdit ? 'Lưu thay đổi' : 'Lưu', kind: 'primary', keepOpen: true, onClick: doSave }
        ]
      });

      if (!isEdit) setTimeout(function () { amountInput.focus(); }, 120);
      return handle;
    }

    function buildOverText(hits) {
      var box = u.el('div');
      box.appendChild(u.el('p', {
        class: 'dialog__text',
        text: 'Khoản này sẽ làm bạn vượt ' + (hits.length > 1 ? hits.length + ' hạn mức:' : hits[0].name + ':')
      }));
      var ul = u.el('ul', { style: 'margin:10px 0 0;padding-left:18px' });
      hits.forEach(function (h) {
        ul.appendChild(u.el('li', {
          class: 'dialog__text',
          style: 'margin-bottom:4px',
          text: (hits.length > 1 ? h.name.charAt(0).toUpperCase() + h.name.slice(1) + ': ' : '') +
            M.format(h.after) + ' / ' + M.format(h.limit) + '  (vượt ' + M.format(h.over) + ')'
        }));
      });
      box.appendChild(ul);
      return box;
    }

    return { open: open };
  })();

  App.txEditor = txEditor;

  /* =========================================================
     MÀN HÌNH DANH SÁCH CHI TIÊU
     ========================================================= */

  var filter = { type: 'all', categoryId: null, paymentId: null, q: '' };

  App.screens.tx = {
    title: 'Chi tiêu',
    showPeriod: true,

    actions: function () {
      return [{
        label: 'Tìm kiếm', icon: '🔍',
        onClick: function () { openFilterSheet(); }
      }];
    },

    render: function (root) {
      var r = st.currentRange();

      st.txInRange(r.start, r.end).then(function (list) {
        u.clear(root);

        var shown = list.filter(function (t) {
          if (filter.type !== 'all' && t.type !== filter.type) return false;
          if (filter.categoryId && t.categoryId !== filter.categoryId) return false;
          if (filter.paymentId && t.paymentId !== filter.paymentId) return false;
          if (filter.q) {
            var hay = (t.note || '') + ' ' + st.cat(t.categoryId).name;
            if (hay.toLowerCase().indexOf(filter.q.toLowerCase()) < 0) return false;
          }
          return true;
        });

        root.appendChild(summaryCard(list, r));
        root.appendChild(filterChips());

        if (!shown.length) {
          root.appendChild(u.el('div', { class: 'card empty' }, [
            u.el('span', { class: 'ico', text: list.length ? '🔍' : '🧾' }),
            u.el('div', { class: 'empty__title', text: list.length ? 'Không có kết quả phù hợp' : 'Chưa có giao dịch nào' }),
            u.el('p', { text: list.length ? 'Thử bỏ bớt bộ lọc.' : 'Nhấn nút + để ghi khoản đầu tiên của ' + D.periodName(r.period) + ' này.' })
          ]));
          return;
        }

        var byDate = u.groupBy(shown, function (t) { return t.date; });
        var dates = Object.keys(byDate).sort().reverse();
        var card = u.el('div', { class: 'card card--pad0' });

        dates.forEach(function (day) {
          var items = byDate[day];
          var exp = B.sumExpense(items), inc = B.sumIncome(items);
          card.appendChild(u.el('div', { class: 'daygroup' }, [
            u.el('span', { text: D.fmtDayHeading(day) }),
            u.el('span', { class: 'amt', text: (exp ? '−' + M.format(exp) : '') + (exp && inc ? '  ' : '') + (inc ? '+' + M.format(inc) : '') })
          ]));
          items.forEach(function (t) { card.appendChild(txRow(t)); });
        });
        root.appendChild(card);
        root.appendChild(u.el('p', {
          class: 'small muted center mt3',
          text: shown.length + ' giao dịch' + (shown.length !== list.length ? ' (lọc từ ' + list.length + ')' : '')
        }));
      });
    }
  };

  function summaryCard(list, r) {
    var exp = B.sumExpense(list), inc = B.sumIncome(list), bal = inc - exp;
    return u.el('div', { class: 'card' }, [
      u.el('div', { class: 'stats-grid' }, [
        u.el('div', { class: 'stat' }, [
          u.el('div', { class: 'stat__label', text: 'Chi ra' }),
          u.el('div', { class: 'stat__value', style: 'color:var(--danger)', text: M.compact(exp) })
        ]),
        u.el('div', { class: 'stat' }, [
          u.el('div', { class: 'stat__label', text: 'Thu vào' }),
          u.el('div', { class: 'stat__value', style: 'color:var(--income)', text: M.compact(inc) })
        ]),
        u.el('div', { class: 'stat' }, [
          u.el('div', { class: 'stat__label', text: 'Còn lại' }),
          u.el('div', {
            class: 'stat__value',
            style: 'color:' + (bal < 0 ? 'var(--danger)' : 'var(--text)'),
            text: (bal < 0 ? '−' : '') + M.compact(Math.abs(bal))
          })
        ])
      ])
    ]);
  }

  function filterChips() {
    var box = u.el('div', { class: 'chips chips--scroll mt3', style: 'margin-bottom:12px' });

    [['all', 'Tất cả'], ['expense', 'Chi'], ['income', 'Thu']].forEach(function (p) {
      box.appendChild(u.el('button', {
        class: 'chip', type: 'button', text: p[1],
        'aria-pressed': String(filter.type === p[0]),
        onclick: function () { filter.type = p[0]; App.router.refresh(); }
      }));
    });

    if (filter.categoryId) {
      var c = st.cat(filter.categoryId);
      box.appendChild(u.el('button', {
        class: 'chip', type: 'button', 'aria-pressed': 'true',
        text: c.emoji + ' ' + App.i18n.t(c.name) + '  ✕',
        onclick: function () { filter.categoryId = null; App.router.refresh(); }
      }));
    }
    if (filter.paymentId) {
      var p = st.pay(filter.paymentId);
      box.appendChild(u.el('button', {
        class: 'chip', type: 'button', 'aria-pressed': 'true',
        text: p.emoji + ' ' + App.i18n.t(p.name) + '  ✕',
        onclick: function () { filter.paymentId = null; App.router.refresh(); }
      }));
    }
    if (filter.q) {
      box.appendChild(u.el('button', {
        class: 'chip', type: 'button', 'aria-pressed': 'true',
        text: '🔍 "' + filter.q + '"  ✕',
        onclick: function () { filter.q = ''; App.router.refresh(); }
      }));
    }
    box.appendChild(u.el('button', {
      class: 'chip', type: 'button', text: '⚙️ Bộ lọc',
      onclick: openFilterSheet
    }));
    return box;
  }

  function openFilterSheet() {
    var body = u.el('div');

    var qInput = u.el('input', {
      class: 'input', type: 'search', value: filter.q,
      placeholder: 'Tìm trong ghi chú và tên hạng mục', id: 'fq'
    });
    body.appendChild(u.el('div', { class: 'field' }, [
      u.el('label', { class: 'field__label', for: 'fq', text: 'Tìm kiếm' }),
      qInput
    ]));

    var catSel = u.el('select', { class: 'select', id: 'fcat' });
    catSel.appendChild(u.el('option', { value: '', text: '— Tất cả hạng mục —' }));
    st.cats().forEach(function (c) {
      // Thẻ <option> không chứa được thẻ con nên phải dịch tên ngay tại đây
      catSel.appendChild(u.el('option', {
        value: c.id, text: c.emoji + ' ' + App.i18n.t(c.name),
        selected: filter.categoryId === c.id
      }));
    });
    body.appendChild(u.el('div', { class: 'field' }, [
      u.el('label', { class: 'field__label', for: 'fcat', text: 'Hạng mục' }),
      catSel
    ]));

    var paySel = u.el('select', { class: 'select', id: 'fpay' });
    paySel.appendChild(u.el('option', { value: '', text: '— Tất cả phương thức —' }));
    st.pays().forEach(function (p) {
      paySel.appendChild(u.el('option', {
        value: p.id, text: p.emoji + ' ' + App.i18n.t(p.name),
        selected: filter.paymentId === p.id
      }));
    });
    body.appendChild(u.el('div', { class: 'field' }, [
      u.el('label', { class: 'field__label', for: 'fpay', text: 'Thanh toán bằng' }),
      paySel
    ]));

    u.sheet({
      title: 'Lọc giao dịch',
      body: body,
      actions: [
        {
          label: 'Xóa lọc', onClick: function () {
            filter = { type: 'all', categoryId: null, paymentId: null, q: '' };
            App.router.refresh();
          }
        },
        {
          label: 'Áp dụng', kind: 'primary', onClick: function () {
            filter.q = qInput.value.trim();
            filter.categoryId = catSel.value || null;
            filter.paymentId = paySel.value || null;
            App.router.refresh();
          }
        }
      ]
    });
  }

  function txRow(t) {
    var c = st.cat(t.categoryId);
    var p = st.pay(t.paymentId);
    var isInc = t.type === 'income';
    // Mỗi mẩu chữ nằm trong một nút riêng để bộ dịch tra được từng phần;
    // gộp thành một chuỗi thì cả câu sẽ không khớp từ điển nào.
    var subParts = [];
    if (p) {
      subParts.push(u.el('span', { text: p.emoji + ' ' }));
      subParts.push(u.el('span', { text: p.name }));
      subParts.push(u.el('span', { text: ' · ' }));
    }
    subParts.push(u.el('span', { text: t.note || (isInc ? 'Khoản thu' : 'Khoản chi') }));
    return u.el('button', {
      class: 'row', type: 'button',
      onclick: function () { txEditor.open(t, { onSaved: App.router.refresh }); }
    }, [
      u.el('span', {
        class: 'row__ico',
        style: 'background:color-mix(in srgb, var(--' + c.color + ') 16%, transparent)',
        text: c.emoji
      }),
      u.el('span', { class: 'row__body' }, [
        u.el('span', { class: 'row__title', text: c.name }),
        u.el('span', { class: 'row__sub' }, subParts)
      ]),
      t.photo ? u.el('img', { class: 'row__thumb', src: t.photo, alt: 'Ảnh hóa đơn' }) : null,
      u.el('span', { class: 'row__end' }, [
        u.el('span', {
          class: 'amt ' + (isInc ? 'amt--inc' : 'amt--exp'),
          text: (isInc ? '+' : '−') + M.format(t.amount)
        })
      ])
    ]);
  }

  App.txRow = txRow;
})();

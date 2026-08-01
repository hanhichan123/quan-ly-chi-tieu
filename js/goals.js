/* ===========================================================
   goals.js — Mục tiêu tiết kiệm (mua xe, du lịch, quỹ dự phòng...).
   Số tiền đã để dành do bạn tự cộng vào, độc lập với sổ chi tiêu.
   =========================================================== */

App.goalsUI = (function () {
  'use strict';

  var u = App.util, D = App.dates, M = App.money, st = App.state, C = App.charts;

  var COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];

  function pct(g) {
    return g.target > 0 ? Math.min(100, g.saved / g.target * 100) : 0;
  }

  /** Một dòng mục tiêu (dùng ở Tổng quan và trong bảng quản lý) */
  function row(g, onChange) {
    var p = pct(g);
    var color = 'var(--' + (g.color || 'c1') + ')';
    var left = Math.max(0, g.target - g.saved);

    var sub = M.format(g.saved) + ' / ' + M.format(g.target);
    if (g.deadline) {
      var days = D.daysBetween(D.today(), g.deadline) - 1;
      if (left > 0 && days > 0) {
        sub += ' · cần ' + M.format(Math.ceil(left / days)) + '/ngày';
      } else if (left > 0 && days <= 0) {
        sub += ' · đã quá hạn';
      }
    }

    return u.el('div', { class: 'goal' }, [
      u.el('div', { class: 'goal__ring' }, [C.ring(p, { color: color, size: 52 })]),
      u.el('div', { class: 'goal__body' }, [
        u.el('div', { class: 'goal__name', text: g.name }),
        u.el('div', { class: 'goal__sub', text: sub }),
        left <= 0 ? u.el('div', { class: 'small', style: 'color:var(--ok);font-weight:700', text: '🎉 Đã hoàn thành!' }) : null
      ]),
      u.el('button', {
        class: 'btn btn--sm', type: 'button', text: '＋ Nạp',
        onclick: function () { openContribute(g, onChange); }
      })
    ]);
  }

  /* ---------------- Nạp thêm tiền vào mục tiêu ---------------- */

  function openContribute(g, onChange) {
    var input = u.el('input', {
      class: 'input input--amount', type: 'text', inputmode: 'decimal',
      id: 'gAmt', placeholder: '0'
    });
    var body = u.el('div', {}, [
      u.el('p', { class: 'small muted', text: g.name + ' — hiện có ' + M.format(g.saved) + ' / ' + M.format(g.target) }),
      u.el('div', { class: 'field' }, [
        u.el('label', { class: 'field__label', for: 'gAmt', text: 'Nạp thêm (' + M.currency().code + ')' }),
        u.el('div', { class: 'input-group' }, [
          input,
          u.el('div', { class: 'input-group__unit', text: M.currency().symbol })
        ])
      ]),
      u.el('div', { class: 'field__hint', text: 'Nhập số âm nếu bạn muốn rút bớt ra.' })
    ]);

    var handle = u.sheet({
      title: 'Nạp vào mục tiêu',
      body: body, autofocus: false,
      actions: [
        { label: 'Hủy' },
        {
          label: 'Nạp', kind: 'primary', keepOpen: true,
          onClick: function () {
            var v = M.parse(input.value);
            if (!v) { u.toast('Hãy nhập số tiền', 'danger'); return false; }
            g.saved = Math.max(0, (g.saved || 0) + v);
            st.saveGoal(g).then(function () {
              u.toast(v > 0 ? 'Đã nạp ' + M.format(v) : 'Đã rút ' + M.format(-v), 'ok');
              handle.close();
              (onChange || App.router.refresh)();
            });
            return false;
          }
        }
      ]
    });
    setTimeout(function () { input.focus(); }, 120);
  }

  /* ---------------- Bảng quản lý ---------------- */

  function openList() {
    var body = u.el('div');
    var listBox = u.el('div');
    body.appendChild(listBox);
    body.appendChild(u.el('button', {
      class: 'btn btn--primary btn--block mt3', type: 'button', text: '＋  Thêm mục tiêu',
      onclick: function () { openEditor(null, redraw); }
    }));

    function redraw() {
      st.allGoals().then(function (list) {
        u.clear(listBox);
        if (!list.length) {
          listBox.appendChild(u.el('div', { class: 'empty' }, [
            u.el('span', { class: 'ico', text: '🎯' }),
            u.el('div', { class: 'empty__title', text: 'Chưa có mục tiêu nào' }),
            u.el('p', { text: 'VD: Mua xe 500.000, Về Việt Nam ăn Tết 200.000.' })
          ]));
          return;
        }
        list.forEach(function (g) {
          var r = row(g, redraw);
          r.appendChild(u.el('button', {
            class: 'icon-btn', type: 'button', text: '✎', 'aria-label': 'Sửa mục tiêu',
            onclick: function () { openEditor(g, redraw); }
          }));
          listBox.appendChild(r);
        });
      });
    }
    redraw();

    u.sheet({
      title: 'Mục tiêu tiết kiệm', body: body,
      actions: [{ label: 'Xong', kind: 'primary', onClick: function () { App.router.refresh(); } }]
    });
  }

  function openEditor(goal, onChange) {
    var isEdit = !!(goal && goal.id);
    var m = {
      id: isEdit ? goal.id : null,
      name: (goal && goal.name) || '',
      target: (goal && goal.target) || 0,
      saved: (goal && goal.saved) || 0,
      deadline: (goal && goal.deadline) || '',
      color: (goal && goal.color) || COLORS[Math.floor(Math.random() * COLORS.length)],
      createdAt: goal && goal.createdAt
    };

    var nameInput = u.el('input', {
      class: 'input', type: 'text', id: 'goName', maxlength: '60',
      value: m.name, placeholder: 'VD: Mua xe máy'
    });
    var targetInput = u.el('input', {
      class: 'input', type: 'text', inputmode: 'decimal', id: 'goTarget',
      value: m.target ? M.toInput(m.target) : '', placeholder: '0'
    });
    var savedInput = u.el('input', {
      class: 'input', type: 'text', inputmode: 'decimal', id: 'goSaved',
      value: m.saved ? M.toInput(m.saved) : '', placeholder: '0'
    });
    var dlInput = u.el('input', { class: 'input', type: 'date', id: 'goDl', value: m.deadline });

    var colorBox = u.el('div', { class: 'chips' });
    COLORS.forEach(function (c) {
      colorBox.appendChild(u.el('button', {
        class: 'chip', type: 'button', 'aria-pressed': String(m.color === c),
        'aria-label': 'Màu ' + c,
        style: 'width:44px;padding:0;justify-content:center',
        onclick: function () {
          m.color = c;
          u.$$('button', colorBox).forEach(function (b, i) {
            b.setAttribute('aria-pressed', String(COLORS[i] === c));
          });
        }
      }, [
        u.el('span', { style: 'width:20px;height:20px;border-radius:6px;display:block;background:var(--' + c + ')' })
      ]));
    });

    var body = u.el('div', {}, [
      f('Tên mục tiêu', nameInput, 'goName'),
      f('Số tiền cần có (' + M.currency().code + ')', targetInput, 'goTarget'),
      f('Đã để dành được', savedInput, 'goSaved'),
      f('Hạn hoàn thành (không bắt buộc)', dlInput, 'goDl'),
      u.el('div', { class: 'field' }, [u.el('span', { class: 'field__label', text: 'Màu' }), colorBox])
    ]);

    if (isEdit) {
      body.appendChild(u.el('button', {
        class: 'btn btn--block mt3', type: 'button',
        style: 'color:var(--danger);border-color:var(--danger)',
        text: '🗑  Xóa mục tiêu',
        onclick: function () {
          u.confirm({ title: 'Xóa mục tiêu?', text: m.name, okLabel: 'Xóa', danger: true })
            .then(function (ok) {
              if (!ok) return;
              st.delGoal(m.id).then(function () {
                u.toast('Đã xóa'); handle.close(); if (onChange) onChange();
              });
            });
        }
      }));
    }

    var handle = u.sheet({
      title: isEdit ? 'Sửa mục tiêu' : 'Thêm mục tiêu',
      body: body, autofocus: false,
      actions: [
        { label: 'Hủy' },
        {
          label: 'Lưu', kind: 'primary', keepOpen: true,
          onClick: function () {
            var name = nameInput.value.trim();
            var target = M.parse(targetInput.value) || 0;
            if (!name) { u.toast('Hãy nhập tên mục tiêu', 'danger'); return false; }
            if (target <= 0) { u.toast('Số tiền cần có phải lớn hơn 0', 'danger'); return false; }
            st.saveGoal({
              id: m.id, name: name, target: target,
              saved: Math.max(0, M.parse(savedInput.value) || 0),
              deadline: dlInput.value || '', color: m.color, createdAt: m.createdAt
            }).then(function () {
              u.toast('Đã lưu mục tiêu', 'ok');
              handle.close();
              if (onChange) onChange();
            });
            return false;
          }
        }
      ]
    });

    function f(label, control, id) {
      return u.el('div', { class: 'field' }, [
        u.el('label', { class: 'field__label', for: id, text: label }),
        control
      ]);
    }
  }

  return { row: row, openList: openList, openEditor: openEditor, openContribute: openContribute, pct: pct };
})();

/* ===========================================================
   screens/tasks.js — Quản lý công việc theo ngày / tuần / tháng.
   =========================================================== */

(function () {
  'use strict';

  var u = App.util, D = App.dates, st = App.state;

  App.screens = App.screens || {};

  var PRIORITIES = [
    { v: 0, label: 'Thường', cls: 'pri--low' },
    { v: 1, label: 'Quan trọng', cls: 'pri--mid' },
    { v: 2, label: 'Gấp', cls: 'pri--high' }
  ];

  var REPEATS = [
    { v: 'none', label: 'Không lặp' },
    { v: 'daily', label: 'Hằng ngày' },
    { v: 'weekly', label: 'Hằng tuần' },
    { v: 'monthly', label: 'Hằng tháng' }
  ];

  var showDone = false;

  /* ---------------- Một dòng công việc ---------------- */

  function taskRow(t, onChange) {
    var pri = PRIORITIES[t.priority || 0];
    var late = !t.done && D.isOverdue(t.due);

    var row = u.el('div', { class: 'task' + (t.done ? ' task--done' : '') });

    row.appendChild(u.el('button', {
      class: 'task__check', type: 'button',
      'aria-label': t.done ? 'Bỏ đánh dấu hoàn thành' : 'Đánh dấu hoàn thành',
      'aria-pressed': String(!!t.done),
      text: '✓',
      onclick: function (e) {
        e.stopPropagation();
        toggleDone(t).then(onChange || App.router.refresh);
      }
    }));

    var meta = u.el('div', { class: 'task__meta' });
    if (t.due) {
      meta.appendChild(u.el('span', {
        class: late ? 'late' : '',
        text: (late ? '⏰ ' : '📅 ') + D.dueText(t.due)
      }));
    }
    if (t.priority) meta.appendChild(u.el('span', { class: 'pri ' + pri.cls, text: pri.label }));
    if (t.repeat && t.repeat !== 'none') {
      var rp = REPEATS.filter(function (r) { return r.v === t.repeat; })[0];
      // Nhãn để riêng một nút văn bản để bộ dịch tra được từ điển
      meta.appendChild(u.el('span', {}, [
        u.el('span', { text: '🔁 ' }),
        u.el('span', { text: rp ? rp.label.toLowerCase() : '' })
      ]));
    }
    if (t.note) meta.appendChild(u.el('span', { text: '📝 ' + t.note }));

    row.appendChild(u.el('button', {
      class: 'task__body', type: 'button',
      style: 'background:none;border:0;padding:0;text-align:left;font:inherit;color:inherit',
      onclick: function () { openEditor(t, onChange); }
    }, [
      u.el('div', { class: 'task__title', text: t.title }),
      meta
    ]));

    return row;
  }

  App.taskRow = taskRow;

  function toggleDone(t) {
    var now = !t.done;
    var chain = Promise.resolve();

    // Việc lặp lại: khi hoàn thành thì sinh lần kế tiếp
    if (now && t.repeat && t.repeat !== 'none' && t.due) {
      var next = nextDue(t.due, t.repeat);
      chain = st.saveTask({
        title: t.title, note: t.note, due: next,
        priority: t.priority, repeat: t.repeat, done: false
      }).then(function () {
        u.toast('Đã tạo lần kế tiếp: ' + D.fmt(next), 'ok');
      });
    }

    return chain.then(function () {
      t.done = now;
      t.doneAt = now ? new Date().toISOString() : null;
      return st.saveTask(t);
    });
  }

  function nextDue(due, repeat) {
    if (repeat === 'daily') return D.addDays(due, 1);
    if (repeat === 'weekly') return D.addDays(due, 7);
    if (repeat === 'monthly') return D.addMonths(due, 1);
    return due;
  }

  /* ---------------- Bảng thêm / sửa ---------------- */

  function openEditor(task, onChange) {
    var isEdit = !!(task && task.id);
    var t = {
      id: isEdit ? task.id : null,
      title: (task && task.title) || '',
      note: (task && task.note) || '',
      due: (task && task.due) || D.today(),
      priority: (task && task.priority) || 0,
      repeat: (task && task.repeat) || 'none',
      done: !!(task && task.done),
      createdAt: task && task.createdAt
    };

    var body = u.el('div');

    var titleInput = u.el('input', {
      class: 'input', type: 'text', id: 'tkTitle', maxlength: '120',
      value: t.title, placeholder: 'VD: Đóng tiền điện'
    });
    body.appendChild(u.el('div', { class: 'field' }, [
      u.el('label', { class: 'field__label', for: 'tkTitle', text: 'Tên công việc' }),
      titleInput
    ]));

    var dueInput = u.el('input', { class: 'input', type: 'date', id: 'tkDue', value: t.due });
    body.appendChild(u.el('div', { class: 'field' }, [
      u.el('label', { class: 'field__label', for: 'tkDue', text: 'Hạn hoàn thành' }),
      dueInput,
      u.el('div', { class: 'chips mt2' }, [
        qd('Hôm nay', D.today()),
        qd('Ngày mai', D.addDays(D.today(), 1)),
        qd('Cuối tuần', D.endOfWeek(D.today(), st.S.settings.weekStart)),
        qd('Cuối tháng', D.endOfMonth(D.today()))
      ])
    ]));

    function qd(label, iso) {
      return u.el('button', {
        class: 'chip', type: 'button', text: label,
        onclick: function () { dueInput.value = iso; }
      });
    }

    var priBox = u.el('div', { class: 'chips' });
    PRIORITIES.forEach(function (p) {
      priBox.appendChild(u.el('button', {
        class: 'chip', type: 'button', text: p.label,
        'aria-pressed': String(t.priority === p.v),
        onclick: function () {
          t.priority = p.v;
          u.$$('button', priBox).forEach(function (b, i) {
            b.setAttribute('aria-pressed', String(PRIORITIES[i].v === p.v));
          });
        }
      }));
    });
    body.appendChild(u.el('div', { class: 'field' }, [
      u.el('span', { class: 'field__label', text: 'Mức ưu tiên' }), priBox
    ]));

    var repSel = u.el('select', { class: 'select', id: 'tkRep' });
    REPEATS.forEach(function (r) {
      repSel.appendChild(u.el('option', { value: r.v, text: r.label, selected: t.repeat === r.v }));
    });
    body.appendChild(u.el('div', { class: 'field' }, [
      u.el('label', { class: 'field__label', for: 'tkRep', text: 'Lặp lại' }),
      repSel,
      u.el('div', { class: 'field__hint', text: 'Khi bạn tích hoàn thành, app sẽ tự tạo lần kế tiếp.' })
    ]));

    var noteInput = u.el('input', {
      class: 'input', type: 'text', id: 'tkNote', maxlength: '160',
      value: t.note, placeholder: 'Chi tiết thêm'
    });
    body.appendChild(u.el('div', { class: 'field' }, [
      u.el('label', { class: 'field__label', for: 'tkNote', text: 'Ghi chú (không bắt buộc)' }),
      noteInput
    ]));

    if (isEdit) {
      body.appendChild(u.el('button', {
        class: 'btn btn--block', type: 'button',
        style: 'color:var(--danger);border-color:var(--danger)',
        text: '🗑  Xóa công việc',
        onclick: function () {
          u.confirm({ title: 'Xóa công việc?', text: t.title, okLabel: 'Xóa', danger: true })
            .then(function (ok) {
              if (!ok) return;
              st.delTask(t.id).then(function () {
                u.toast('Đã xóa');
                handle.close();
                (onChange || App.router.refresh)();
              });
            });
        }
      }));
    }

    var handle = u.sheet({
      title: isEdit ? 'Sửa công việc' : 'Thêm công việc',
      body: body,
      autofocus: false,
      actions: [
        { label: 'Hủy' },
        {
          label: 'Lưu', kind: 'primary', keepOpen: true,
          onClick: function () {
            var title = titleInput.value.trim();
            if (!title) { u.toast('Hãy nhập tên công việc', 'danger'); titleInput.focus(); return false; }
            st.saveTask({
              id: t.id, title: title, note: noteInput.value.trim(),
              due: dueInput.value || null, priority: t.priority,
              repeat: repSel.value, done: t.done, createdAt: t.createdAt
            }).then(function () {
              u.toast(isEdit ? 'Đã cập nhật' : 'Đã thêm công việc', 'ok');
              handle.close();
              (onChange || App.router.refresh)();
            });
            return false;
          }
        }
      ]
    });

    if (!isEdit) setTimeout(function () { titleInput.focus(); }, 120);
  }

  App.taskEditor = { open: openEditor };

  /* ---------------- Màn hình ---------------- */

  App.screens.tasks = {
    title: 'Công việc',
    showPeriod: false,

    actions: function () {
      return [{
        label: 'Thêm công việc', icon: '＋',
        onClick: function () { openEditor(null); }
      }];
    },

    render: function (root) {
      st.allTasks().then(function (all) {
        u.clear(root);

        var today = D.today();
        var weekEnd = D.endOfWeek(today, st.S.settings.weekStart);
        var monthEnd = D.endOfMonth(today);

        var open = all.filter(function (t) { return !t.done; });
        var done = all.filter(function (t) { return t.done; });

        var groups = [
          { name: '⏰ Quá hạn', cls: 'danger', items: open.filter(function (t) { return t.due && t.due < today; }) },
          { name: '📌 Hôm nay', items: open.filter(function (t) { return t.due === today; }) },
          { name: '🗓 Còn lại trong tuần', items: open.filter(function (t) { return t.due > today && t.due <= weekEnd; }) },
          { name: '📆 Còn lại trong tháng', items: open.filter(function (t) { return t.due > weekEnd && t.due <= monthEnd; }) },
          { name: '🔮 Sau này', items: open.filter(function (t) { return t.due && t.due > monthEnd; }) },
          { name: '📥 Không đặt hạn', items: open.filter(function (t) { return !t.due; }) }
        ];

        // Tóm tắt
        root.appendChild(u.el('div', { class: 'card' }, [
          u.el('div', { class: 'stats-grid' }, [
            s('Đang mở', String(open.length)),
            s('Quá hạn', String(groups[0].items.length), groups[0].items.length ? 'var(--danger)' : null),
            s('Đã xong', String(done.length), 'var(--ok)')
          ])
        ]));

        if (!all.length) {
          root.appendChild(u.el('div', { class: 'card empty' }, [
            u.el('span', { class: 'ico', text: '✅' }),
            u.el('div', { class: 'empty__title', text: 'Chưa có công việc nào' }),
            u.el('p', { text: 'Nhấn nút ＋ ở góc trên để thêm việc cần làm.' }),
            u.el('button', {
              class: 'btn btn--primary mt4', type: 'button', text: 'Thêm công việc đầu tiên',
              onclick: function () { openEditor(null); }
            })
          ]));
          return;
        }

        groups.forEach(function (g) {
          if (!g.items.length) return;
          // Tên nhóm và số đếm tách riêng để bộ dịch tra được tên
          root.appendChild(u.el('div', { class: 'section-title' }, [
            u.el('span', { text: g.name }),
            u.el('span', { text: ' (' + g.items.length + ')' })
          ]));
          var card = u.el('div', { class: 'card card--pad0' });
          g.items.forEach(function (t) { card.appendChild(taskRow(t)); });
          root.appendChild(card);
        });

        if (!open.length) {
          root.appendChild(u.el('div', { class: 'card empty' }, [
            u.el('span', { class: 'ico', text: '🎉' }),
            u.el('div', { class: 'empty__title', text: 'Xong hết việc rồi!' }),
            u.el('p', { text: 'Không còn công việc nào đang mở.' })
          ]));
        }

        if (done.length) {
          root.appendChild(u.el('button', {
            class: 'btn btn--block mt4', type: 'button',
            text: (showDone ? 'Ẩn' : 'Hiện') + ' ' + done.length + ' việc đã xong',
            onclick: function () { showDone = !showDone; App.router.refresh(); }
          }));
          if (showDone) {
            var dc = u.el('div', { class: 'card card--pad0 mt3' });
            done.slice(0, 60).forEach(function (t) { dc.appendChild(taskRow(t)); });
            root.appendChild(dc);
            root.appendChild(u.el('button', {
              class: 'btn btn--block mt3', type: 'button', text: '🗑 Xóa hết việc đã xong',
              style: 'color:var(--danger);border-color:var(--danger)',
              onclick: function () {
                u.confirm({
                  title: 'Xóa ' + done.length + ' việc đã xong?',
                  text: 'Thao tác này không hoàn tác được.', okLabel: 'Xóa hết', danger: true
                }).then(function (ok) {
                  if (!ok) return;
                  Promise.all(done.map(function (t) { return st.delTask(t.id); }))
                    .then(function () { u.toast('Đã dọn sạch'); App.router.refresh(); });
                });
              }
            }));
          }
        }
      });
    }
  };

  function s(label, value, color) {
    return u.el('div', { class: 'stat' }, [
      u.el('div', { class: 'stat__label', text: label }),
      u.el('div', { class: 'stat__value', style: color ? 'color:' + color : null, text: value })
    ]);
  }
})();

/* ===========================================================
   charts.js — Biểu đồ vẽ tay bằng SVG, không thư viện ngoài.

   Nguyên tắc áp dụng:
   - Nét mảnh, đầu dữ liệu bo 4px và neo vào đường nền.
   - Khe hở 2px giữa các mảng màu cạnh nhau.
   - Lưới và trục lùi về sau (màu nhạt), số liệu nổi lên trước.
   - Tối đa 8 lát màu; phần dư gộp vào "Khác".
   - Chú giải LUÔN ghi tên + số tiền -> không nhận diện bằng màu đơn thuần.
   =========================================================== */

App.charts = (function () {
  'use strict';

  var u = App.util;
  var M = App.money;
  var NS = 'http://www.w3.org/2000/svg';
  var MAX_SLICES = 8;

  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined) return;
      n.setAttribute(k, attrs[k]);
    });
    return n;
  }

  /** Gộp các mục nhỏ lại thành "Khác" để không quá 8 màu */
  function capItems(items, maxN) {
    var max = maxN || MAX_SLICES;
    if (items.length <= max) return items.slice();
    var head = items.slice(0, max - 1);
    var tail = items.slice(max - 1);
    head.push({
      label: 'Khác (' + tail.length + " mục)",
      value: u.sum(tail, function (x) { return x.value; }),
      color: 'var(--c12)',
      emoji: '📦'
    });
    return head;
  }

  /* ---------------------------------------------------------
     Biểu đồ tròn khuyết (donut)
     items: [{label, value, color, emoji}]
     --------------------------------------------------------- */
  function donut(items, opts) {
    opts = opts || {};
    var size = opts.size || 168;
    var stroke = opts.stroke || 26;
    var r = (size - stroke) / 2 - 2;
    var C = 2 * Math.PI * r;
    var cx = size / 2, cy = size / 2;

    var data = capItems(items).filter(function (x) { return x.value > 0; });
    var total = u.sum(data, function (x) { return x.value; });

    var wrap = u.el('div', { class: 'donut-wrap' });
    var svg = svgEl('svg', {
      class: 'chart', width: size, height: size,
      viewBox: '0 0 ' + size + ' ' + size, role: 'img',
      'aria-label': opts.ariaLabel || 'Biểu đồ tỉ trọng theo hạng mục'
    });
    svg.style.width = size + 'px';
    svg.style.height = size + 'px';

    // Vòng nền
    svg.appendChild(svgEl('circle', {
      cx: cx, cy: cy, r: r, fill: 'none',
      stroke: 'var(--surface-2)', 'stroke-width': stroke
    }));

    if (total > 0) {
      var g = svgEl('g', { transform: 'rotate(-90 ' + cx + ' ' + cy + ')' });
      var offset = 0;
      data.forEach(function (it) {
        var len = it.value / total * C;
        // Khe hở 2px giữa các lát, nhưng không làm mất lát quá nhỏ
        var gap = len > 6 ? 2 : 0;
        var arc = svgEl('circle', {
          cx: cx, cy: cy, r: r, fill: 'none',
          stroke: it.color, 'stroke-width': stroke,
          'stroke-dasharray': Math.max(0.5, len - gap) + ' ' + (C - Math.max(0.5, len - gap)),
          'stroke-dashoffset': -offset
        });
        arc.appendChild(svgEl('title', {}));
        // <title> là một chuỗi ghép nên bộ dịch DOM không tra được cả câu;
        // dịch riêng phần tên trước khi ghép.
        arc.lastChild.textContent = App.i18n.t(it.label) + ': ' + M.format(it.value) +
          ' (' + Math.round(it.value / total * 100) + '%)';
        g.appendChild(arc);
        offset += len;
      });
      svg.appendChild(g);
    }

    wrap.appendChild(svg);
    wrap.appendChild(u.el('div', { class: 'donut-center' }, [
      u.el('div', { class: 'donut-center__label', text: opts.centerLabel || 'Tổng chi' }),
      u.el('div', { class: 'donut-center__value', text: M.compact(total) })
    ]));
    return wrap;
  }

  /* ---------------------------------------------------------
     Chú giải — luôn có tên + số tiền + %
     --------------------------------------------------------- */
  function legend(items, opts) {
    opts = opts || {};
    var data = capItems(items).filter(function (x) { return x.value > 0; });
    var total = u.sum(data, function (x) { return x.value; });
    var box = u.el('div', { class: 'legend' });

    data.forEach(function (it) {
      box.appendChild(u.el('div', { class: 'legend__item' }, [
        u.el('span', { class: 'legend__dot', style: 'background:' + it.color }),
        // Tên để riêng một nút văn bản để bộ dịch tra được
        u.el('span', { class: 'legend__name' }, [
          it.emoji ? u.el('span', { text: it.emoji + ' ' }) : null,
          u.el('span', { text: it.label })
        ]),
        u.el('span', { class: 'legend__val amt', text: M.format(it.value) }),
        u.el('span', { class: 'legend__pct', text: total ? Math.round(it.value / total * 100) + '%' : '0%' })
      ]));
    });
    if (!data.length) box.appendChild(u.el('div', { class: 'small muted center', text: 'Chưa có dữ liệu' }));
    return box;
  }

  /* ---------------------------------------------------------
     Biểu đồ cột — data: [{label, value, sub, highlight}]
     Chạm/di vào cột để xem số chính xác.
     --------------------------------------------------------- */
  function bars(data, opts) {
    opts = opts || {};
    var h = opts.height || 150;
    var padTop = 18, padBottom = 22;
    var plotH = h - padTop - padBottom;
    var n = Math.max(1, data.length);
    var gap = n > 20 ? 1 : n > 12 ? 2 : 4;
    var W = 320;                                 // toạ độ ảo, SVG tự co giãn
    var bw = Math.max(2, (W - gap * (n - 1)) / n);
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    var limit = opts.limit || 0;

    var wrap = u.el('div');
    var svg = svgEl('svg', {
      class: 'chart', viewBox: '0 0 ' + W + ' ' + h,
      preserveAspectRatio: 'none', role: 'img',
      'aria-label': opts.ariaLabel || 'Biểu đồ cột chi tiêu'
    });
    svg.style.height = h + 'px';
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Đường nền
    svg.appendChild(svgEl('line', {
      x1: 0, y1: padTop + plotH, x2: W, y2: padTop + plotH,
      stroke: 'var(--border)', 'stroke-width': 1
    }));

    // Đường hạn mức (nếu có)
    if (limit > 0 && limit <= max * 1.6) {
      var ly = padTop + plotH - (limit / max) * plotH;
      svg.appendChild(svgEl('line', {
        x1: 0, y1: ly, x2: W, y2: ly,
        stroke: 'var(--danger)', 'stroke-width': 1.5, 'stroke-dasharray': '5 4', opacity: '0.85'
      }));
    }

    var readout = u.el('div', {
      class: 'small muted center', style: 'min-height:20px;margin-top:2px'
    }, opts.readoutHint || ' ');

    data.forEach(function (d, i) {
      var bh = max > 0 ? (d.value / max) * plotH : 0;
      var x = i * (bw + gap);
      var y = padTop + plotH - bh;
      var over = limit > 0 && d.value > limit;
      var color = d.color || (over ? 'var(--danger)' : d.highlight ? 'var(--primary)' : 'var(--c1)');

      if (d.value > 0) {
        var path = svgEl('path', {
          d: roundedTop(x, y, bw, Math.max(bh, 2), Math.min(4, bw / 2)),
          fill: color
        });
        path.style.cursor = 'pointer';
        var ttl = svgEl('title', {});
        ttl.textContent = (d.full || d.label) + ': ' + M.format(d.value);
        path.appendChild(ttl);
        bindReadout(path, readout, (d.full || d.label) + ' · ' + M.format(d.value));
        svg.appendChild(path);
      } else {
        svg.appendChild(svgEl('rect', {
          x: x, y: padTop + plotH - 2, width: bw, height: 2,
          fill: 'var(--border)', rx: 1
        }));
      }

      // Nhãn trục: chỉ hiện chọn lọc để không chồng chữ
      var every = n <= 8 ? 1 : n <= 16 ? 2 : n <= 24 ? 4 : 7;
      if (i % every === 0 || i === n - 1) {
        var t = svgEl('text', {
          x: x + bw / 2, y: h - 7, 'text-anchor': 'middle', 'font-size': 10
        });
        t.textContent = d.label;
        svg.appendChild(t);
      }
    });

    wrap.appendChild(svg);
    wrap.appendChild(readout);
    return wrap;
  }

  function roundedTop(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return 'M' + x + ',' + (y + h) +
      'L' + x + ',' + (y + r) +
      'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      'L' + (x + w - r) + ',' + y +
      'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
      'L' + (x + w) + ',' + (y + h) + 'Z';
  }

  function bindReadout(node, readout, text) {
    function show() { readout.textContent = text; }
    node.addEventListener('pointerenter', show);
    node.addEventListener('pointerdown', show);
  }

  /* ---------------------------------------------------------
     Biểu đồ đường — points: [{label, value}]
     --------------------------------------------------------- */
  function line(points, opts) {
    opts = opts || {};
    var h = opts.height || 140;
    var W = 320, padTop = 14, padBottom = 22, padX = 6;
    var plotH = h - padTop - padBottom;
    var max = Math.max.apply(null, points.map(function (p) { return p.value; }).concat([1]));
    var n = Math.max(1, points.length);
    var step = n > 1 ? (W - padX * 2) / (n - 1) : 0;

    var wrap = u.el('div');
    var svg = svgEl('svg', {
      class: 'chart', viewBox: '0 0 ' + W + ' ' + h, role: 'img',
      'aria-label': opts.ariaLabel || 'Biểu đồ xu hướng'
    });
    svg.style.height = h + 'px';

    svg.appendChild(svgEl('line', {
      x1: 0, y1: padTop + plotH, x2: W, y2: padTop + plotH,
      stroke: 'var(--border)', 'stroke-width': 1
    }));

    var coords = points.map(function (p, i) {
      return [padX + i * step, padTop + plotH - (max > 0 ? p.value / max * plotH : 0)];
    });

    if (coords.length > 1) {
      // Vùng nền mờ dưới đường
      var area = 'M' + coords[0][0] + ',' + (padTop + plotH) +
        coords.map(function (c) { return 'L' + c[0] + ',' + c[1]; }).join('') +
        'L' + coords[coords.length - 1][0] + ',' + (padTop + plotH) + 'Z';
      svg.appendChild(svgEl('path', { d: area, fill: 'var(--primary)', opacity: '0.10' }));

      svg.appendChild(svgEl('polyline', {
        points: coords.map(function (c) { return c[0] + ',' + c[1]; }).join(' '),
        fill: 'none', stroke: 'var(--primary)', 'stroke-width': 2,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round'
      }));
    }

    var readout = u.el('div', { class: 'small muted center', style: 'min-height:20px;margin-top:2px' }, ' ');

    coords.forEach(function (c, i) {
      var isLast = i === coords.length - 1;
      var dot = svgEl('circle', {
        cx: c[0], cy: c[1], r: isLast ? 5 : 4,
        fill: 'var(--primary)', stroke: 'var(--surface)', 'stroke-width': 2
      });
      dot.style.cursor = 'pointer';
      var ttl = svgEl('title', {});
      ttl.textContent = points[i].label + ': ' + M.format(points[i].value);
      dot.appendChild(ttl);
      bindReadout(dot, readout, points[i].label + ' · ' + M.format(points[i].value));
      svg.appendChild(dot);

      var t = svgEl('text', { x: c[0], y: h - 7, 'text-anchor': 'middle', 'font-size': 10 });
      t.textContent = points[i].label;
      svg.appendChild(t);
    });

    wrap.appendChild(svg);
    wrap.appendChild(readout);
    return wrap;
  }

  /* ---------------------------------------------------------
     Vòng tiến độ (mục tiêu tiết kiệm)
     --------------------------------------------------------- */
  function ring(pct, opts) {
    opts = opts || {};
    var size = opts.size || 54;
    var stroke = opts.stroke || 6;
    var r = (size - stroke) / 2;
    var C = 2 * Math.PI * r;
    var p = u.clamp(pct, 0, 100);

    var svg = svgEl('svg', {
      width: size, height: size, viewBox: '0 0 ' + size + ' ' + size,
      role: 'img', 'aria-label': 'Tiến độ ' + Math.round(p) + '%'
    });
    svg.appendChild(svgEl('circle', {
      cx: size / 2, cy: size / 2, r: r, fill: 'none',
      stroke: 'var(--surface-2)', 'stroke-width': stroke
    }));
    svg.appendChild(svgEl('circle', {
      cx: size / 2, cy: size / 2, r: r, fill: 'none',
      stroke: opts.color || 'var(--ok)', 'stroke-width': stroke, 'stroke-linecap': 'round',
      'stroke-dasharray': (p / 100 * C) + ' ' + C,
      transform: 'rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')'
    }));
    var t = svgEl('text', {
      x: size / 2, y: size / 2 + 4, 'text-anchor': 'middle',
      'font-size': 12, 'font-weight': 700, fill: 'var(--text)'
    });
    t.textContent = Math.round(p) + '%';
    svg.appendChild(t);
    return svg;
  }

  /* ---------------------------------------------------------
     Thanh hạn mức (thành phần dùng lại ở nhiều màn hình)
     s: kết quả của App.budget.stat()
     --------------------------------------------------------- */
  function limitBar(s, opts) {
    opts = opts || {};
    var wrap = u.el('div', { class: 'limit is-' + s.level });
    var pctText = s.limit ? Math.round(s.pct) + '%' : '—';

    wrap.appendChild(u.el('div', { class: 'limit__top' }, [
      u.el('span', { class: 'limit__name', text: s.name }),
      u.el('span', { class: 'limit__nums amt', text: M.format(s.spent) + (s.limit ? ' / ' + M.format(s.limit) : '') }),
      u.el('span', { class: 'limit__pct', text: pctText })
    ]));

    wrap.appendChild(u.el('div', {
      class: 'bar', role: 'progressbar',
      'aria-valuenow': Math.round(s.pct), 'aria-valuemin': 0, 'aria-valuemax': 100,
      'aria-label': s.name
    }, [
      u.el('div', { class: 'bar__fill', style: 'width:' + u.clamp(s.pct, s.spent > 0 ? 2 : 0, 100) + '%' })
    ]));

    var note;
    if (!s.limit) {
      note = opts.onSetLimit ? null : 'Chưa đặt hạn mức';
    } else if (s.level === 'over') {
      note = '⚠️ Vượt ' + M.format(s.over);
    } else if (s.level === 'warn') {
      note = '⚠️ Sắp hết, còn ' + M.format(s.remaining);
    } else {
      note = 'Còn lại ' + M.format(s.remaining);
    }
    if (note) wrap.appendChild(u.el('div', { class: 'limit__note', text: note }));

    if (!s.limit && opts.onSetLimit) {
      wrap.appendChild(u.el('button', {
        class: 'card__link', type: 'button', text: 'Đặt hạn mức →',
        style: 'margin-top:6px', onclick: opts.onSetLimit
      }));
    }
    return wrap;
  }

  return {
    donut: donut, legend: legend, bars: bars, line: line,
    ring: ring, limitBar: limitBar, capItems: capItems
  };
})();

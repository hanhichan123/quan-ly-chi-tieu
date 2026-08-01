/* ===========================================================
   util.js — Tiện ích chung: DOM, escape, toast, sheet, dialog
   Không dùng thư viện ngoài. Gắn vào biến toàn cục App.
   =========================================================== */

var App = window.App || {};
window.App = App;

App.util = (function () {
  'use strict';

  /* ---------- DOM ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /** Tạo phần tử: el('div', {class:'x', onclick:fn}, [con, 'chữ']) */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, v);
      });
    }
    append(node, children);
    return node;
  }

  function append(parent, children) {
    if (children === null || children === undefined) return parent;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      parent.appendChild(typeof c === 'object' && c.nodeType ? c : document.createTextNode(String(c)));
    });
    return parent;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  /** Chống chèn HTML khi buộc phải dùng innerHTML */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- Chung ---------- */

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var self = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 250);
    };
  }

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function sum(arr, pick) {
    return arr.reduce(function (a, x) { return a + (pick ? pick(x) : x); }, 0);
  }

  /** Gom mảng thành object theo khóa */
  function groupBy(arr, keyFn) {
    var out = {};
    arr.forEach(function (x) {
      var k = keyFn(x);
      (out[k] = out[k] || []).push(x);
    });
    return out;
  }

  /* ---------- Thông báo nhanh ---------- */

  function toast(msg, kind, ms) {
    var wrap = $('#toastWrap');
    if (!wrap) return;
    var t = el('div', { class: 'toast' + (kind ? ' toast--' + kind : ''), role: 'status', text: msg });
    wrap.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .2s';
      t.style.opacity = '0';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
    }, ms || 2600);
  }

  /* ---------- Lớp phủ: sheet & dialog ---------- */

  var openLayers = [];

  function closeTop() {
    var top = openLayers.pop();
    if (!top) return false;
    if (top.scrim && top.scrim.parentNode) top.scrim.parentNode.removeChild(top.scrim);
    if (top.node && top.node.parentNode) top.node.parentNode.removeChild(top.node);
    if (top.onClose) top.onClose();
    return true;
  }

  function closeAll() { while (closeTop()) { /* lặp */ } }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openLayers.length) { e.preventDefault(); closeTop(); }
  });

  /**
   * Mở bảng trượt lên.
   * opts: {title, body(Node), actions:[{label,kind,onClick,keepOpen}], onClose, dismissable}
   * Trả về đối tượng có .close()
   */
  function sheet(opts) {
    var root = $('#modalRoot');
    var dismissable = opts.dismissable !== false;

    var scrim = el('div', { class: 'scrim' });
    var node = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title || '' });

    var handle = {
      close: function () {
        var i = openLayers.indexOf(layer);
        if (i >= 0) { openLayers.splice(i, 1); }
        if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
        if (node.parentNode) node.parentNode.removeChild(node);
        if (opts.onClose) opts.onClose();
      },
      node: node
    };
    var layer = { scrim: scrim, node: node, onClose: opts.onClose };

    var head = el('div', { class: 'sheet__head' }, [
      el('h2', { class: 'sheet__title', text: opts.title || '' }),
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Đóng', text: '✕', onclick: handle.close })
    ]);
    var body = el('div', { class: 'sheet__body' }, opts.body);
    node.appendChild(head);
    node.appendChild(body);

    if (opts.actions && opts.actions.length) {
      var foot = el('div', { class: 'sheet__foot' });
      opts.actions.forEach(function (a) {
        foot.appendChild(el('button', {
          type: 'button',
          class: 'btn' + (a.kind ? ' btn--' + a.kind : ''),
          text: a.label,
          onclick: function () {
            var r = a.onClick ? a.onClick(handle) : undefined;
            if (!a.keepOpen && r !== false) handle.close();
          }
        }));
      });
      node.appendChild(foot);
    }

    if (dismissable) scrim.addEventListener('click', handle.close);
    root.appendChild(scrim);
    root.appendChild(node);
    openLayers.push(layer);

    var first = node.querySelector('input, select, textarea, button');
    if (first && opts.autofocus !== false) setTimeout(function () { first.focus(); }, 60);
    return handle;
  }

  /**
   * Hộp thoại xác nhận. Trả về Promise<boolean>.
   * opts: {title, text(chuỗi hoặc Node), okLabel, cancelLabel, danger}
   */
  function confirm(opts) {
    return new Promise(function (resolve) {
      var root = $('#modalRoot');
      var scrim = el('div', { class: 'scrim' });
      var node = el('div', { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true' });
      var layer = { scrim: scrim, node: node };
      var done = false;

      function finish(val) {
        if (done) return;
        done = true;
        var i = openLayers.indexOf(layer);
        if (i >= 0) openLayers.splice(i, 1);
        if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
        if (node.parentNode) node.parentNode.removeChild(node);
        resolve(val);
      }
      layer.onClose = function () { finish(false); };

      var textNode = (opts.text && opts.text.nodeType)
        ? opts.text
        : el('p', { class: 'dialog__text', text: opts.text || '' });

      node.appendChild(el('div', { class: 'dialog__body' }, [
        el('h2', { class: 'dialog__title', text: opts.title || 'Xác nhận' }),
        textNode
      ]));
      node.appendChild(el('div', { class: 'dialog__foot' }, [
        opts.cancelLabel === null ? null : el('button', {
          type: 'button', class: 'btn', text: opts.cancelLabel || 'Hủy',
          onclick: function () { finish(false); }
        }),
        el('button', {
          type: 'button',
          class: 'btn ' + (opts.danger ? 'btn--danger' : 'btn--primary'),
          text: opts.okLabel || 'Đồng ý',
          onclick: function () { finish(true); }
        })
      ]));

      scrim.addEventListener('click', function () { finish(false); });
      root.appendChild(scrim);
      root.appendChild(node);
      openLayers.push(layer);
      setTimeout(function () {
        var b = node.querySelectorAll('.dialog__foot .btn');
        if (b[1]) b[1].focus();
      }, 60);
    });
  }

  /** Thông báo 1 nút */
  function alert(title, text) {
    return confirm({ title: title, text: text, okLabel: 'Đã hiểu', cancelLabel: null })
      .then(function () { return true; });
  }

  return {
    $: $, $$: $$, el: el, append: append, clear: clear, esc: esc,
    uid: uid, debounce: debounce, clamp: clamp, sum: sum, groupBy: groupBy,
    toast: toast, sheet: sheet, confirm: confirm, alert: alert,
    closeAll: closeAll, closeTop: closeTop
  };
})();

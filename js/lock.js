/* ===========================================================
   lock.js — Khoá ứng dụng bằng mã PIN, kèm mở khoá bằng vân tay.

   NÓI RÕ CHO ĐÚNG SỰ THẬT:
   Đây là lớp che trước mắt người khác, KHÔNG PHẢI mã hoá dữ liệu.
   Người biết kỹ thuật, cầm thiết bị đã mở khoá, vẫn đọc được dữ liệu
   qua công cụ nhà phát triển của trình duyệt. Muốn an toàn thật thì
   phải đặt thêm khoá màn hình cho cả thiết bị.

   PIN không bao giờ được lưu ở dạng thô — chỉ lưu chuỗi băm PBKDF2
   kèm muối ngẫu nhiên.
   =========================================================== */

App.lock = (function () {
  'use strict';

  var u = App.util, st = App.state;

  var ITERATIONS = 200000;
  var PIN_MIN = 4;
  var PIN_MAX = 8;
  var MAX_ATTEMPTS = 5;          // sai quá số lần này thì bắt chờ
  var PENALTY_MS = 30000;

  var overlay = null;
  var unlockResolve = null;
  var hiddenAt = null;
  var attempts = 0;
  var penaltyUntil = 0;

  /* ---------------- Nền tảng có hỗ trợ không ---------------- */

  function cryptoReady() {
    return !!(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);
  }

  function biometricSupported() {
    return !!(window.PublicKeyCredential && navigator.credentials && location.protocol === 'https:');
  }

  function biometricAvailable() {
    if (!biometricSupported()) return Promise.resolve(false);
    try {
      return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(function (ok) { return !!ok; })
        .catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }

  /* ---------------- Băm PIN ---------------- */

  function toHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  function randomHex(bytes) {
    var a = new Uint8Array(bytes);
    crypto.getRandomValues(a);
    return toHex(a.buffer);
  }

  function derive(pin, saltHex) {
    var enc = new TextEncoder();
    var salt = new Uint8Array(saltHex.match(/.{2}/g).map(function (h) { return parseInt(h, 16); }));
    return crypto.subtle.importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits'])
      .then(function (key) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' },
          key, 256
        );
      })
      .then(toHex);
  }

  /** So sánh không phụ thuộc thời gian, tránh rò rỉ qua đo thời gian */
  function sameHash(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function setPin(pin) {
    if (!cryptoReady()) return Promise.reject(new Error('Trình duyệt này không hỗ trợ mã hoá cần thiết'));
    var salt = randomHex(16);
    return derive(pin, salt).then(function (hash) {
      return st.setSetting('lockSalt', salt)
        .then(function () { return st.setSetting('lockHash', hash); })
        // Lưu độ dài để màn khoá biết khi nào coi là gõ xong.
        // Chỉ là độ dài, không hé lộ gì về nội dung mã PIN.
        .then(function () { return st.setSetting('lockPinLength', pin.length); })
        .then(function () { return st.setSetting('lockEnabled', true); });
    });
  }

  function verifyPin(pin) {
    var s = st.S.settings;
    if (!s.lockSalt || !s.lockHash) return Promise.resolve(false);
    return derive(pin, s.lockSalt).then(function (h) { return sameHash(h, s.lockHash); });
  }

  function disable() {
    return st.setSetting('lockEnabled', false)
      .then(function () { return st.setSetting('lockHash', null); })
      .then(function () { return st.setSetting('lockSalt', null); })
      .then(function () { return st.setSetting('lockBiometric', false); })
      .then(function () { return st.setSetting('lockCredentialId', null); });
  }

  function isEnabled() {
    return !!(st.S.settings.lockEnabled && st.S.settings.lockHash);
  }

  /* ---------------- Vân tay / khuôn mặt (WebAuthn) ---------------- */

  function b64url(buf) {
    var s = btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
    return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromB64url(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }

  function registerBiometric() {
    if (!biometricSupported()) {
      return Promise.reject(new Error('Thiết bị hoặc trình duyệt này không hỗ trợ (cần mở app qua https)'));
    }
    var challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    var userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    return navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { name: 'Quản lý Chi tiêu', id: location.hostname },
        user: { id: userId, name: 'chu-may', displayName: 'Chủ máy' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      }
    }).then(function (cred) {
      if (!cred) throw new Error('Không đăng ký được');
      return st.setSetting('lockCredentialId', b64url(cred.rawId))
        .then(function () { return st.setSetting('lockBiometric', true); });
    });
  }

  function unlockBiometric() {
    var id = st.S.settings.lockCredentialId;
    if (!id || !biometricSupported()) return Promise.resolve(false);
    var challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    return navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        allowCredentials: [{ type: 'public-key', id: fromB64url(id) }],
        userVerification: 'required',
        timeout: 60000
      }
    }).then(function (a) { return !!a; })
      .catch(function () { return false; });
  }

  /* ---------------- Màn hình khoá ---------------- */

  var entered = '';

  function buildOverlay() {
    var dots = u.el('div', { class: 'lockpad__dots', id: 'lockDots' });
    var msg = u.el('div', { class: 'lockpad__msg', id: 'lockMsg', role: 'status' });

    var pinLen = st.S.settings.lockPinLength || PIN_MIN;

    function renderDots() {
      u.clear(dots);
      for (var i = 0; i < pinLen; i++) {
        dots.appendChild(u.el('span', { class: 'lockdot' + (i < entered.length ? ' is-on' : '') }));
      }
    }

    function setMsg(text, kind) {
      msg.textContent = text || '';
      msg.className = 'lockpad__msg' + (kind ? ' is-' + kind : '');
    }

    function press(d) {
      if (Date.now() < penaltyUntil) return;
      if (entered.length >= pinLen) return;
      entered += d;
      renderDots();
      setMsg('');
      if (entered.length === pinLen) setTimeout(tryUnlock, 90);  // kịp thấy chấm cuối sáng lên
    }

    function back() {
      entered = entered.slice(0, -1);
      renderDots();
      setMsg('');
    }

    function tryUnlock() {
      verifyPin(entered).then(function (ok) {
        if (ok) {
          attempts = 0;
          entered = '';
          succeed();
          return;
        }
        attempts++;
        entered = '';
        renderDots();
        if (attempts >= MAX_ATTEMPTS) {
          penaltyUntil = Date.now() + PENALTY_MS;
          countdown();
        } else {
          setMsg('Mã PIN không đúng (' + attempts + '/' + MAX_ATTEMPTS + ')', 'bad');
          var pad = overlay && overlay.querySelector('.lockpad');
          if (pad) {
            pad.classList.remove('shake');
            void pad.offsetWidth;
            pad.classList.add('shake');
          }
        }
      });
    }

    function countdown() {
      function tick() {
        var left = Math.ceil((penaltyUntil - Date.now()) / 1000);
        if (left <= 0) {
          clearInterval(t);
          attempts = 0;
          setMsg('');
        } else {
          setMsg('Sai quá nhiều lần. Chờ ' + left + ' giây rồi thử lại.', 'bad');
        }
      }
      var t = setInterval(tick, 500);
      tick();
    }

    var keys = u.el('div', { class: 'lockpad__keys' });
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(function (d) {
      keys.appendChild(u.el('button', { class: 'lockkey', type: 'button', text: d, onclick: function () { press(d); } }));
    });

    var bioBtn = u.el('button', {
      class: 'lockkey lockkey--alt', type: 'button', text: '👆',
      'aria-label': 'Mở khoá bằng vân tay',
      onclick: function () { doBiometric(setMsg); }
    });
    keys.appendChild(st.S.settings.lockBiometric ? bioBtn : u.el('span'));
    keys.appendChild(u.el('button', { class: 'lockkey', type: 'button', text: '0', onclick: function () { press('0'); } }));
    keys.appendChild(u.el('button', {
      class: 'lockkey lockkey--alt', type: 'button', text: '⌫',
      'aria-label': 'Xoá một chữ số', onclick: back
    }));

    var node = u.el('div', { class: 'lockscreen', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Màn hình khoá' }, [
      u.el('div', { class: 'lockpad' }, [
        u.el('img', { class: 'lockpad__logo', src: 'icons/icon-192.png', alt: '' }),
        u.el('h1', { class: 'lockpad__title', text: 'Nhập mã PIN' }),
        dots,
        msg,
        keys,
        u.el('button', {
          class: 'btn btn--ghost mt4', type: 'button', text: 'Quên mã PIN?',
          onclick: forgotPin
        })
      ])
    ]);

    renderDots();
    return node;
  }

  function doBiometric(setMsg) {
    if (setMsg) setMsg('Đang chờ xác thực…');
    unlockBiometric().then(function (ok) {
      if (ok) succeed();
      else if (setMsg) setMsg('Không nhận diện được, hãy nhập mã PIN.', 'bad');
    });
  }

  function forgotPin() {
    u.alert('Quên mã PIN',
      'Vì app không có máy chủ nào giữ dữ liệu của bạn nên không có cách đặt lại mã PIN. ' +
      'Cách duy nhất là xoá dữ liệu trình duyệt của trang này (hoặc gỡ app) rồi nhập lại từ file sao lưu. ' +
      'Đây chính là lý do bạn nên xuất file sao lưu định kỳ.');
  }

  function succeed() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    entered = '';
    document.body.classList.remove('is-locked');
    if (unlockResolve) { var r = unlockResolve; unlockResolve = null; r(); }
  }

  function showLockScreen() {
    if (overlay) return;
    entered = '';
    overlay = buildOverlay();
    document.body.appendChild(overlay);
    document.body.classList.add('is-locked');
    // Có vân tay thì mời xác thực luôn cho tiện
    if (st.S.settings.lockBiometric) {
      setTimeout(function () {
        doBiometric(function (t, k) {
          var m = overlay && overlay.querySelector('#lockMsg');
          if (m) { m.textContent = t || ''; m.className = 'lockpad__msg' + (k ? ' is-' + k : ''); }
        });
      }, 400);
    }
  }

  /**
   * Cổng chặn lúc khởi động: nếu đang bật khoá thì phải mở khoá xong
   * mới cho vẽ dữ liệu ra màn hình.
   */
  function gate() {
    if (!isEnabled()) return Promise.resolve();
    return new Promise(function (resolve) {
      unlockResolve = resolve;
      showLockScreen();
    });
  }

  /** Khoá lại ngay lập tức (dùng khi quay lại app sau khi rời đi lâu) */
  function relock() {
    if (!isEnabled() || overlay) return;
    showLockScreen();
  }

  /** Theo dõi việc rời khỏi app để tự khoá lại */
  function watchIdle() {
    document.addEventListener('visibilitychange', function () {
      if (!isEnabled()) return;
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (hiddenAt) {
        var mins = st.S.settings.lockAutoMinutes;
        var elapsed = Date.now() - hiddenAt;
        hiddenAt = null;
        if (mins === 0 || elapsed >= mins * 60000) relock();
      }
    });
  }

  return {
    cryptoReady: cryptoReady,
    biometricSupported: biometricSupported,
    biometricAvailable: biometricAvailable,
    setPin: setPin, verifyPin: verifyPin, disable: disable, isEnabled: isEnabled,
    registerBiometric: registerBiometric, unlockBiometric: unlockBiometric,
    gate: gate, relock: relock, watchIdle: watchIdle,
    PIN_MIN: PIN_MIN, PIN_MAX: PIN_MAX
  };
})();

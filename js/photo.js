/* ===========================================================
   photo.js — Ảnh hóa đơn.
   Thu nhỏ ảnh trước khi lưu để không phình bộ nhớ điện thoại.
   Kết quả là chuỗi data URL (JPEG) -> sao lưu/khôi phục dễ dàng.
   =========================================================== */

App.photo = (function () {
  'use strict';

  var MAX_EDGE = 1024;      // cạnh dài nhất sau khi thu nhỏ
  var QUALITY = 0.72;
  var MAX_BYTES = 900 * 1024;

  /**
   * Đọc File từ <input type="file"> -> Promise<dataURL đã thu nhỏ>
   */
  function fromFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('Chưa chọn ảnh'));
      if (!/^image\//.test(file.type)) return reject(new Error('Tệp này không phải ảnh'));

      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Không đọc được tệp ảnh')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('Ảnh bị lỗi hoặc không hỗ trợ')); };
        img.onload = function () {
          try { resolve(shrink(img)); }
          catch (e) { reject(e); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function shrink(img) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error('Ảnh không hợp lệ');

    var scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));

    var canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);

    var out = canvas.toDataURL('image/jpeg', QUALITY);
    // Nếu vẫn quá nặng thì hạ chất lượng thêm vài nấc
    var q = QUALITY;
    while (out.length > MAX_BYTES && q > 0.35) {
      q -= 0.12;
      out = canvas.toDataURL('image/jpeg', q);
    }
    return out;
  }

  /** Ước lượng dung lượng của chuỗi data URL, dạng chữ dễ đọc */
  function sizeText(dataUrl) {
    if (!dataUrl) return '';
    var bytes = Math.round(dataUrl.length * 0.75);
    if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  }

  /** Mở ảnh to để xem */
  function view(dataUrl) {
    App.util.sheet({
      title: 'Ảnh hóa đơn',
      body: App.util.el('img', {
        src: dataUrl, alt: 'Ảnh hóa đơn',
        style: 'width:100%;height:auto;border-radius:12px;display:block'
      })
    });
  }

  return { fromFile: fromFile, sizeText: sizeText, view: view, MAX_EDGE: MAX_EDGE };
})();

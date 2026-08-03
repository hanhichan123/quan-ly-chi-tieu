/* ===========================================================
   sw.js — Service Worker: cho phép app chạy khi không có mạng.

   Chiến lược:
   - Tài nguyên của app (HTML/CSS/JS/icon): cache-first, vì chúng
     được đóng gói theo phiên bản. Đổi CACHE_VERSION khi sửa code.
   - Điều hướng (mở app): thử mạng trước, hỏng thì trả bản cache.
   - Không đụng gì tới dữ liệu người dùng (nằm trong IndexedDB).
   =========================================================== */

var CACHE_VERSION = 'qlct-v1.1.0';

var APP_SHELL = [
  './',
  './index.html',
  './privacy.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/app.css',
  './js/util.js',
  './js/i18n.js',
  './js/dates.js',
  './js/money.js',
  './js/db.js',
  './js/seed.js',
  './js/state.js',
  './js/budget.js',
  './js/charts.js',
  './js/photo.js',
  './js/recurring.js',
  './js/goals.js',
  './js/backup.js',
  './js/lock.js',
  './js/screens/home.js',
  './js/screens/transactions.js',
  './js/screens/tasks.js',
  './js/screens/stats.js',
  './js/screens/settings.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      // addAll thất bại toàn bộ nếu 1 tệp lỗi -> nạp từng tệp cho chắc
      return Promise.all(APP_SHELL.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function (err) {
          console.warn('[sw] không cache được', url, err);
        });
      }));
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // không can thiệp tài nguyên ngoài

  // Mở app: ưu tiên bản mới, không có mạng thì lấy cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_VERSION).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (hit) {
          return hit || caches.match('./');
        });
      })
    );
    return;
  }

  // Tài nguyên tĩnh: cache trước, đồng thời cập nhật ngầm
  e.respondWith(
    caches.match(req).then(function (hit) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || network;
    })
  );
});

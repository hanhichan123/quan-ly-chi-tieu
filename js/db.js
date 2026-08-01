/* ===========================================================
   db.js — Lưu trữ dữ liệu trong máy.

   Ưu tiên IndexedDB. Nếu trình duyệt chặn (ví dụ mở bằng file://
   hoặc chế độ ẩn danh) thì tự chuyển sang localStorage để app
   vẫn dùng được, và báo cho người dùng biết.

   Mọi bản ghi đều có khóa chuỗi 'id' -> xuất/nhập dữ liệu đơn giản.
   Ảnh hóa đơn lưu dạng chuỗi data URL (không dùng Blob) để sao lưu
   và khôi phục được ở mọi backend.
   =========================================================== */

App.db = (function () {
  'use strict';

  var DB_NAME = 'qlct';
  var DB_VERSION = 1;
  var STORES = ['transactions', 'categories', 'budgets', 'tasks', 'recurring', 'goals', 'settings'];

  var backend = null;      // 'idb' | 'ls'
  var idb = null;
  var ready = null;

  /* =========================================================
     Backend 1: IndexedDB
     ========================================================= */

  function openIDB() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('Trình duyệt không có IndexedDB'));
      var req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); }
      catch (e) { return reject(e); }

      var settled = false;
      // Một số trình duyệt treo im lặng khi bị chặn -> đặt hạn 4 giây
      var timer = setTimeout(function () {
        if (!settled) { settled = true; reject(new Error('IndexedDB không phản hồi')); }
      }, 4000);

      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('transactions')) {
          var tx = db.createObjectStore('transactions', { keyPath: 'id' });
          tx.createIndex('date', 'date', { unique: false });
          tx.createIndex('categoryId', 'categoryId', { unique: false });
        }
        if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('budgets')) db.createObjectStore('budgets', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('tasks')) {
          var tk = db.createObjectStore('tasks', { keyPath: 'id' });
          tk.createIndex('due', 'due', { unique: false });
        }
        if (!db.objectStoreNames.contains('recurring')) db.createObjectStore('recurring', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('goals')) db.createObjectStore('goals', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      };
      req.onsuccess = function () {
        if (settled) { try { req.result.close(); } catch (e) {} return; }
        settled = true; clearTimeout(timer);
        idb = req.result;
        idb.onversionchange = function () { try { idb.close(); } catch (e) {} };
        resolve(idb);
      };
      req.onerror = function () {
        if (settled) return;
        settled = true; clearTimeout(timer);
        reject(req.error || new Error('Không mở được IndexedDB'));
      };
      req.onblocked = function () {
        if (settled) return;
        settled = true; clearTimeout(timer);
        reject(new Error('IndexedDB đang bị khóa bởi tab khác'));
      };
    });
  }

  function idbRun(storeName, mode, fn) {
    return new Promise(function (resolve, reject) {
      var t, store, result;
      try {
        t = idb.transaction(storeName, mode);
        store = t.objectStore(storeName);
      } catch (e) { return reject(e); }
      try { result = fn(store); } catch (e) { return reject(e); }
      t.oncomplete = function () {
        resolve(result && result.__req ? result.__req.result : result);
      };
      t.onerror = function () { reject(t.error); };
      t.onabort = function () { reject(t.error || new Error('Giao dịch CSDL bị hủy')); };
    });
  }

  function wrapReq(req) { return { __req: req }; }

  var idbBackend = {
    getAll: function (store) {
      return idbRun(store, 'readonly', function (s) { return wrapReq(s.getAll()); })
        .then(function (r) { return r || []; });
    },
    get: function (store, key) {
      return idbRun(store, 'readonly', function (s) { return wrapReq(s.get(key)); });
    },
    put: function (store, value) {
      return idbRun(store, 'readwrite', function (s) { s.put(value); return value; });
    },
    bulkPut: function (store, values) {
      return idbRun(store, 'readwrite', function (s) {
        values.forEach(function (v) { s.put(v); });
        return values.length;
      });
    },
    del: function (store, key) {
      return idbRun(store, 'readwrite', function (s) { s.delete(key); return true; });
    },
    clear: function (store) {
      return idbRun(store, 'readwrite', function (s) { s.clear(); return true; });
    },
    byDateRange: function (store, start, end) {
      return idbRun(store, 'readonly', function (s) {
        var idx = s.index('date');
        return wrapReq(idx.getAll(IDBKeyRange.bound(start, end)));
      }).then(function (r) { return r || []; });
    }
  };

  /* =========================================================
     Backend 2: localStorage (dự phòng)
     ========================================================= */

  var LS_PREFIX = 'qlct:';
  var lsCache = {};

  function lsLoad(store) {
    if (lsCache[store]) return lsCache[store];
    var raw = null;
    try { raw = localStorage.getItem(LS_PREFIX + store); } catch (e) { raw = null; }
    var arr = [];
    if (raw) { try { arr = JSON.parse(raw) || []; } catch (e) { arr = []; } }
    lsCache[store] = arr;
    return arr;
  }

  function lsSave(store) {
    try {
      localStorage.setItem(LS_PREFIX + store, JSON.stringify(lsCache[store] || []));
    } catch (e) {
      return Promise.reject(new Error('Hết dung lượng lưu trữ. Hãy xóa bớt ảnh hóa đơn hoặc xuất dữ liệu ra file.'));
    }
    return Promise.resolve(true);
  }

  function keyOf(store) { return store === 'settings' ? 'key' : 'id'; }

  var lsBackend = {
    getAll: function (store) { return Promise.resolve(lsLoad(store).slice()); },
    get: function (store, key) {
      var k = keyOf(store);
      var hit = lsLoad(store).filter(function (x) { return x[k] === key; })[0];
      return Promise.resolve(hit);
    },
    put: function (store, value) {
      var k = keyOf(store), arr = lsLoad(store);
      var i = arr.findIndex(function (x) { return x[k] === value[k]; });
      if (i >= 0) arr[i] = value; else arr.push(value);
      return lsSave(store).then(function () { return value; });
    },
    bulkPut: function (store, values) {
      var k = keyOf(store), arr = lsLoad(store);
      values.forEach(function (value) {
        var i = arr.findIndex(function (x) { return x[k] === value[k]; });
        if (i >= 0) arr[i] = value; else arr.push(value);
      });
      return lsSave(store).then(function () { return values.length; });
    },
    del: function (store, key) {
      var k = keyOf(store);
      lsCache[store] = lsLoad(store).filter(function (x) { return x[k] !== key; });
      return lsSave(store).then(function () { return true; });
    },
    clear: function (store) {
      lsCache[store] = [];
      return lsSave(store).then(function () { return true; });
    },
    byDateRange: function (store, start, end) {
      return Promise.resolve(lsLoad(store).filter(function (x) {
        return x.date >= start && x.date <= end;
      }));
    }
  };

  /* =========================================================
     API công khai
     ========================================================= */

  var impl = null;

  function init() {
    if (ready) return ready;
    ready = openIDB()
      .then(function () { backend = 'idb'; impl = idbBackend; return backend; })
      .catch(function (err) {
        backend = 'ls';
        impl = lsBackend;
        console.warn('[db] Dùng localStorage thay cho IndexedDB:', err && err.message);
        return backend;
      });
    return ready;
  }

  function api(name) {
    return function () {
      var args = arguments;
      return init().then(function () { return impl[name].apply(impl, args); });
    };
  }

  return {
    STORES: STORES,
    init: init,
    backend: function () { return backend; },
    getAll: api('getAll'),
    get: api('get'),
    put: api('put'),
    bulkPut: api('bulkPut'),
    del: api('del'),
    clear: api('clear'),
    /** Lấy giao dịch trong khoảng ngày (dùng index 'date') */
    txByDateRange: function (start, end) {
      return init().then(function () { return impl.byDateRange('transactions', start, end); });
    },
    /** Xóa sạch mọi store */
    wipe: function () {
      return init().then(function () {
        return Promise.all(STORES.map(function (s) { return impl.clear(s); }));
      });
    }
  };
})();

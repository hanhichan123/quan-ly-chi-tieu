# 💴 Quản lý Chi tiêu & Công việc

App điện thoại quản lý chi tiêu và công việc theo **ngày / tuần / tháng**, có hạn mức, biểu đồ và cảnh báo vượt mức.

**Chạy hoàn toàn offline. Dữ liệu chỉ nằm trong máy bạn, không gửi đi đâu cả.**

---

## Có gì trong app

| Tính năng | Chi tiết |
|---|---|
| 💸 **Ghi thu & chi** | Số tiền, hạng mục, ngày, ghi chú, đính kèm **ảnh hóa đơn** (tự thu nhỏ để đỡ tốn bộ nhớ) |
| 🎯 **Hạn mức** | Đặt riêng cho **ngày / tuần / tháng**, thêm hạn mức riêng cho từng hạng mục theo tháng |
| 🚨 **Cảnh báo vượt mức** | Thanh tiến độ đổi màu (xanh → vàng → đỏ) + băng cảnh báo + **hộp xác nhận ngay khi đang nhập** khoản làm vượt mức + thông báo hệ thống (tùy chọn) |
| 📊 **Biểu đồ** | Tròn khuyết theo hạng mục, cột theo ngày (có vạch hạn mức), đường xu hướng 6 tháng, so sánh với kỳ trước |
| 🏷 **Hạng mục** | 12 mục chi + 4 mục thu dựng sẵn (đi chợ, tiền nhà, xăng xe, điện nước ga…), tự thêm/sửa/xóa, chọn biểu tượng và màu |
| 💱 **Đơn vị tiền tệ** | 12 loại (JPY, VND, USD, EUR, KRW, CNY, THB…). Khi đổi, app hỏi rõ: *chỉ đổi ký hiệu* hay *quy đổi số liệu theo tỉ giá bạn nhập* |
| ✅ **Công việc** | Nhóm Quá hạn / Hôm nay / Trong tuần / Trong tháng, mức ưu tiên, **lặp lại** ngày–tuần–tháng |
| 🔁 **Khoản định kỳ** | Tiền nhà, internet, lương… Đến hạn thì app **liệt kê ra để bạn xác nhận**, không tự ghi ngầm |
| 🏆 **Mục tiêu tiết kiệm** | Đặt đích, theo dõi bằng vòng tiến độ, tự tính "cần để dành bao nhiêu mỗi ngày" |
| ⚡ **Nhập nhanh** | Nút 1 chạm cho các khoản hay dùng, tự học theo thói quen của bạn |
| 💾 **Sao lưu** | Xuất JSON (đầy đủ, kể cả ảnh) và CSV (mở bằng Excel); nhập lại có xem trước |
| 🌗 **Giao diện** | Sáng / tối / theo hệ thống. Thanh công cụ 5 tab cố định dưới màn hình |

---

## Cách dùng — 3 lựa chọn

### ⭐ Cách A — Cài lên điện thoại qua GitHub Pages (khuyến nghị)

Đây là cách duy nhất để app **cài được vào màn hình chính và chạy offline** trên điện thoại.

```bash
cd C:/Users/Administrator/quan-ly-chi-tieu && git init && git add -A && git commit -m "App quan ly chi tieu"
```

Sau đó tạo repo trên GitHub, đẩy code lên, vào **Settings → Pages → Source: Deploy from a branch → main / (root)**.
Vài phút sau bạn có link dạng `https://<tên-của-bạn>.github.io/<tên-repo>/`.

Mở link đó trên điện thoại rồi:

- **Android (Chrome)**: nút ⋮ → *Thêm vào Màn hình chính* / *Cài đặt ứng dụng*
- **iPhone (Safari)**: nút Chia sẻ → kéo xuống → *Thêm vào MH chính*

> ⚠️ Cách này **đăng mã nguồn lên mạng**. Dữ liệu chi tiêu của bạn **không** bị đẩy lên — nó chỉ nằm trong điện thoại. Nếu không muốn công khai mã nguồn, để repo ở chế độ private (GitHub Pages cho repo private cần gói trả phí).

### 🖥 Cách B — Chạy thử trên máy tính

Máy bạn đã có sẵn JDK 21, không cần cài thêm gì:

```bash
"C:/Users/Administrator/.jdks/ms-21.0.10/bin/jwebserver.exe" -p 8123 -b 127.0.0.1 -d "C:/Users/Administrator/quan-ly-chi-tieu"
```

Rồi mở `http://localhost:8123`. Nhấn **F12 → Toggle device toolbar** để xem ở kích thước điện thoại.

### 📁 Cách C — Chép thẳng vào điện thoại (hạn chế)

Copy cả thư mục qua USB rồi mở `index.html` bằng trình duyệt.

> ⚠️ Cách này **không khuyến khích**: mở bằng `file://` thì trình duyệt chặn Service Worker và thường chặn cả IndexedDB, nên app **không cài được vào màn hình chính và có thể không lưu được dữ liệu**. Chỉ dùng để xem thử giao diện.

### 📦 Muốn file `.apk` thật?

Đưa link GitHub Pages ở Cách A vào [PWABuilder.com](https://www.pwabuilder.com) để đóng gói thành APK — vẫn không cần cài Android Studio.

---

## Cấu trúc mã nguồn

```
quan-ly-chi-tieu/
├─ index.html              Khung app (SPA), nạp các script theo thứ tự
├─ manifest.webmanifest    Tên, icon, màu — để cài vào màn hình chính
├─ sw.js                   Service Worker: cache app để chạy offline
├─ css/
│  ├─ tokens.css           Biến màu/khoảng cách (có bản sáng và tối)
│  └─ app.css              Layout, thanh tab, thẻ, biểu mẫu, biểu đồ
├─ js/
│  ├─ util.js              DOM helper, toast, sheet, hộp xác nhận
│  ├─ dates.js             Ngày/tuần/tháng (chuỗi 'YYYY-MM-DD', không lệch múi giờ)
│  ├─ money.js             Tiền tệ, định dạng, đọc số, quy đổi
│  ├─ db.js                IndexedDB (tự lùi về localStorage nếu bị chặn)
│  ├─ seed.js              Hạng mục & cài đặt mặc định
│  ├─ state.js             Trạng thái chung + lớp truy cập dữ liệu
│  ├─ budget.js            Tính hạn mức, mức cảnh báo
│  ├─ charts.js            Biểu đồ SVG vẽ tay
│  ├─ photo.js             Thu nhỏ ảnh hóa đơn
│  ├─ recurring.js         Khoản định kỳ
│  ├─ goals.js             Mục tiêu tiết kiệm
│  ├─ backup.js            Xuất/nhập JSON & CSV
│  ├─ screens/             5 màn hình chính
│  └─ main.js              Khởi động, điều hướng, đăng ký Service Worker
├─ icons/                  Icon PWA (192, 512, maskable)
└─ tools/MakeIcons.java    Sinh lại icon: java tools/MakeIcons.java
```

**Không dùng thư viện ngoài, không có bước build.** Sửa file → F5 là thấy ngay.

---

## Vài điều cần biết

### Số tiền được lưu thế nào
Lưu dạng **số nguyên theo đơn vị nhỏ nhất** của tiền tệ (JPY/VND/KRW: 1 = 1 yên/đồng/won; USD/EUR: 1 = 1 xu). Nhờ vậy không bao giờ có sai số kiểu `0.1 + 0.2 = 0.30000000000000004`.

### Khi sửa mã nguồn
Nhớ **tăng `CACHE_VERSION` trong `sw.js`** (ví dụ `qlct-v1.0.1` → `qlct-v1.0.2`). Nếu quên, Service Worker sẽ tiếp tục phục vụ bản cũ trong cache và bạn không thấy thay đổi.

### Sao lưu
Dữ liệu nằm trong bộ nhớ trình duyệt. Nếu bạn gỡ app, đổi điện thoại, hoặc xóa dữ liệu duyệt web thì **mất hết**.
👉 Vào **Cài đặt → Xuất file sao lưu (JSON)** định kỳ và cất file đó vào Google Drive / iCloud.

---

## Đã kiểm thử

| Hạng mục | Kết quả |
|---|---|
| Ghi giao dịch → cập nhật tổng quan & biểu đồ | ✅ |
| Hạn mức ngày ¥3.000: chi ¥2.500 → vàng (83%); thêm ¥1.000 → hộp xác nhận "vượt ¥500", thanh đỏ (117%) | ✅ |
| Đọc số tiền: `1.500` `1,500` `1 500` `¥1500` `15000đ` → đều ra đúng; `abc` → từ chối | ✅ |
| Định dạng đa tiền tệ: `$1.234,56` · `€99,50` · `¥3.500` · `₫1.500.000` | ✅ |
| Quy đổi tiền tệ theo tỉ giá (JPY→VND, USD→JPY) | ✅ |
| Xuất JSON → xóa sạch → nhập lại: khớp 100%, **ảnh hóa đơn còn nguyên** | ✅ |
| Việc lặp hằng tháng: tích xong ngày 30/7 → tự tạo lần kế tiếp 30/8 | ✅ |
| Khoản định kỳ ngày 31 → tháng 2 tự lùi về 28 | ✅ |
| Tuần bắt đầu Thứ hai, cộng tháng có kẹp ngày (31/1 + 1 tháng = 28/2) | ✅ |
| Service Worker `activated`, 26 tệp trong cache, manifest hợp lệ | ✅ |
| **Tắt hẳn server → tải lại trang → app vẫn chạy đủ, dữ liệu còn nguyên** | ✅ |
| Chế độ tối (theo hệ thống): chữ và biểu đồ đều đọc rõ | ✅ |
| Màn hình hẹp 320px: không vỡ layout, không cuộn ngang | ✅ |
| Cả 5 tab đều hiển thị, không có lỗi console | ✅ |

### Điểm còn hạn chế (nói thẳng)
- **Bảng màu biểu đồ chưa chạy qua bộ kiểm tra mù màu tự động** vì máy không có Node.js. Đã bù bằng cách giãn tông màu thủ công, **giới hạn 8 lát** trong biểu đồ (phần dư gộp vào "Khác") và **luôn hiện chú giải ghi rõ tên + số tiền + %** — nên không bao giờ phải phân biệt bằng màu đơn thuần.
- **Không đồng bộ nhiều thiết bị** và **không tự lấy tỉ giá** — đây là đánh đổi có chủ ý để app chạy offline hoàn toàn.

---

*Phiên bản 1.0.0 · Giao diện tiếng Việt · Mặc định đơn vị JPY (đổi được trong Cài đặt)*

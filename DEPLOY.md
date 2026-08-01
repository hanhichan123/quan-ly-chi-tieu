# 🚀 Đưa app lên điện thoại bằng GitHub Pages

Repo git đã được tạo sẵn và commit đầu tiên đã xong. Bạn chỉ còn 3 việc.

---

## Bước 1 — Tạo repo rỗng trên GitHub

1. Vào **https://github.com/new**
2. **Repository name**: `quan-ly-chi-tieu`
3. Chọn **Public**
   > GitHub Pages cho repo Private cần gói trả phí. Public nghĩa là **mã nguồn** ai cũng xem được — nhưng **dữ liệu chi tiêu của bạn thì không**, nó chỉ nằm trong điện thoại. File sao lưu cũng đã bị chặn sẵn trong `.gitignore`.
4. ⚠️ **KHÔNG** tích `Add a README file`, `Add .gitignore`, `Choose a license` — để trống hết, vì máy bạn đã có sẵn rồi. Tích vào sẽ gây xung đột khi đẩy lên.
5. Bấm **Create repository**

---

## Bước 2 — Đẩy code lên

Thay `TEN-GITHUB-CUA-BAN` bằng tên tài khoản GitHub của bạn rồi chạy:

```bash
cd "C:/Users/Administrator/quan-ly-chi-tieu" && git remote add origin https://github.com/TEN-GITHUB-CUA-BAN/quan-ly-chi-tieu.git && git push -u origin main
```

**Về việc đăng nhập:** Git for Windows sẽ tự mở một cửa sổ trình duyệt để bạn đăng nhập GitHub. Bấm **Sign in with your browser** và làm theo. GitHub **không còn nhận mật khẩu** gõ trong terminal nữa — nếu nó hỏi Password thì bạn cần tạo Personal Access Token tại `github.com/settings/tokens` và dán token vào chỗ Password.

Đẩy thành công sẽ thấy dòng kiểu `main -> main`.

---

## Bước 3 — Bật GitHub Pages

1. Vào repo vừa tạo → tab **Settings** (thanh trên cùng)
2. Menu trái → **Pages**
3. Mục **Source** → chọn **Deploy from a branch**
4. **Branch**: `main` · **Folder**: `/ (root)` → bấm **Save**
5. Chờ 1–3 phút. Tải lại trang, GitHub sẽ hiện link:

```
https://TEN-GITHUB-CUA-BAN.github.io/quan-ly-chi-tieu/
```

---

## Bước 4 — Cài vào màn hình chính điện thoại

Mở link trên **bằng trình duyệt của điện thoại**:

### 📱 Android (Chrome)
Chrome thường tự hiện thanh **"Thêm ứng dụng vào Màn hình chính"** ở dưới. Nếu không:
1. Chạm nút **⋮** góc trên bên phải
2. Chọn **Cài đặt ứng dụng** (hoặc *Thêm vào Màn hình chính*)
3. Chạm **Cài đặt**

### 🍎 iPhone (bắt buộc dùng Safari, Chrome trên iPhone không cài được)
1. Chạm nút **Chia sẻ** (hình vuông có mũi tên đi lên) ở thanh dưới
2. Kéo xuống chọn **Thêm vào MH chính**
3. Chạm **Thêm** góc trên bên phải

Xong! Trên màn hình chính sẽ có icon riêng. Mở lên là chạy toàn màn hình, không thanh địa chỉ, **và dùng được cả khi không có mạng**.

> 💡 Sau lần mở đầu tiên, hãy **tắt Wi-Fi và 4G rồi mở lại app** để tự kiểm chứng nó chạy offline thật.

---

## Về sau: sửa code rồi cập nhật lên điện thoại

**Nhớ tăng số phiên bản trước**, nếu không điện thoại sẽ giữ bản cũ trong cache:

1. Mở `sw.js`, sửa dòng đầu: `qlct-v1.0.1` → `qlct-v1.0.2`
2. Chạy:

```bash
cd "C:/Users/Administrator/quan-ly-chi-tieu" && git add -A && git commit -m "Cap nhat tinh nang" && git push
```

Khoảng 1–2 phút sau, lần tới bạn mở app trên điện thoại nó sẽ hỏi *"Có bản cập nhật — Tải lại?"*.

---

## Muốn file `.apk` cài như app Android thật?

Sau khi có link GitHub Pages ở Bước 3:

1. Vào **https://www.pwabuilder.com**
2. Dán link `https://TEN-GITHUB-CUA-BAN.github.io/quan-ly-chi-tieu/` → **Start**
3. Chọn **Android** → **Generate Package**
4. Tải file `.apk` về, chép sang điện thoại và cài (cần bật *Cài đặt từ nguồn không xác định*)

Vẫn không cần cài Android Studio.

---

## Gặp lỗi?

| Hiện tượng | Cách xử lý |
|---|---|
| `remote origin already exists` | Chạy `git remote remove origin` rồi làm lại Bước 2 |
| `Updates were rejected` | Bạn đã lỡ tích README khi tạo repo. Chạy `git pull --rebase origin main` rồi `git push -u origin main` |
| Mở link ra trang 404 | Chờ thêm 2–3 phút. Kiểm tra Settings → Pages đã chọn đúng `main` + `/ (root)` |
| Trang trắng, không có gì | Mở link trên máy tính, nhấn F12 → tab Console xem báo lỗi gì |
| Không thấy nút "Thêm vào màn hình chính" | Kiểm tra link có bắt đầu bằng `https://` không. Trên iPhone bắt buộc phải dùng Safari |
| Sửa code rồi mà điện thoại vẫn bản cũ | Bạn quên tăng `CACHE_VERSION` trong `sw.js` |

# WeekBoard

App quản lý công việc theo chân trời thời gian. Toàn bộ code đã sẵn sàng — làm 5 bước dưới là chạy.

---

## 1. Tạo database ở Supabase

1. [supabase.com](https://supabase.com) → **New project** (chọn region Singapore).
2. **SQL Editor → New query** → dán toàn bộ nội dung file `supabase/schema.sql` → **Run**.
3. **Authentication → Providers → Email** → bật, tắt *Confirm email*.
4. **Settings → API** → copy `Project URL` và `anon public` key (dùng ở bước 3).

## 2. Tạo repository

Tạo repo mới tên **`weekboard`** (nếu đặt tên khác, sửa dòng `base: '/weekboard/'` trong `vite.config.js` cho khớp).

Upload toàn bộ file trong thư mục này lên repo, nhánh `main`.
Nhớ upload cả thư mục ẩn `.github/` — nếu GitHub web không cho kéo thả thì dùng:

```bash
git init && git add -A && git commit -m "init"
git branch -M main
git remote add origin https://github.com/<user>/weekboard.git
git push -u origin main
```

## 3. Khai key vào repo

GitHub → **Settings → Secrets and variables → Actions → New repository secret**, thêm 2 cái:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL ở bước 1 |
| `VITE_SUPABASE_ANON_KEY` | anon public key ở bước 1 |

> `anon key` là key công khai, lộ ra không sao vì schema đã bật Row Level Security.
> Đừng bao giờ dùng `service_role` key ở đây.

## 4. Bật GitHub Pages

GitHub → **Settings → Pages → Source: GitHub Actions**.

Vào tab **Actions** xem workflow chạy xong (~1 phút). App sẽ ở:
`https://<user>.github.io/weekboard/`

## 5. Khai URL ngược lại cho Supabase

Supabase → **Authentication → URL Configuration → Redirect URLs**, thêm:

```
https://<user>.github.io/weekboard/
http://localhost:5173/
```

Bỏ qua bước này thì bấm magic link trong mail sẽ bị đá về sai chỗ.

**Xong.** Mở app, nhập email, bấm link trong mail là vào.
Trên điện thoại: mở URL → *Add to Home Screen*.

---

## Chạy ở máy (nếu muốn sửa code)

```bash
npm install
cp .env.local.example .env.local    # rồi điền 2 key vào
npm run dev                          # http://localhost:5173
```

---

## Cấu trúc

```
supabase/schema.sql              4 bảng + trigger + RLS
src/lib/dates.js                 logic chân trời thời gian, bung habit
src/lib/api.js                   gọi Supabase
src/components/WeekBoard.jsx     bảng 7 ngày (ngang/dọc, ẩn ngày đã qua)
src/components/StuffCard.jsx     thẻ task/event/habit
src/components/StuffForm.jsx     form thêm mới
src/pages/Dashboard.jsx          trang chính
src/pages/Planning.jsx           trang kéo thả lập kế hoạch tuần
src/index.css                    toàn bộ style
```

`HUONG-DAN.md` giải thích vì sao code viết như vậy — chỉ cần đọc khi bạn muốn sửa logic.

## Kiểm tra nhanh sau khi chạy

- Thêm task ngày 22/8 → tự nhảy vào ô T7 22/8
- Thêm task khoảng 24–28/8 → nằm ở **Next week**, vào trang Planning thấy ở hàng chờ
- Thêm habit "hằng tuần, T2 T4 T6" → hiện đúng 3 ngày trong lưới
- Xoay điện thoại → bảng tuần đổi giữa ngang và dọc

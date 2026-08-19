# WeekBoard — hướng dẫn dựng app từ đầu đến cuối

App quản lý công việc theo chân trời thời gian (this week → next week → in a month → later),
với nghi thức "Chủ nhật lập kế hoạch tuần sau" là trung tâm.
Stack: **Vite + React (JSX) + Supabase + GitHub Pages**.

---

## 0. Ba quyết định kiến trúc quan trọng nhất

Đọc phần này trước khi gõ dòng code nào — nó giải thích *vì sao* các file sau lại như vậy.

**(1) Một bảng `stuff` cho cả task / event / habit.**
Chúng khác nhau ở cách khai báo thời gian, không khác ở bản chất. Tách 3 bảng sẽ khiến
mọi truy vấn "cho tôi xem thứ Tư có gì" phải join 3 lần. Một bảng + cột `type` là đủ.

**(2) Tách `start_date/end_date` (khoảng cho phép) khỏi `planned_date` (ngày được xếp).**
Đây là mấu chốt của toàn bộ app:

| Bạn nhập | `date_mode` | `start_date` | `end_date` | `planned_date` |
|---|---|---|---|---|
| Không ngày | `none` | – | – | do bạn kéo thả |
| 22/8 | `single` | 22/8 | 22/8 | **tự động** = 22/8 |
| 24/8 → 28/8 | `range` | 24/8 | 28/8 | kéo thả, phải nằm trong khoảng |
| Tháng 9 | `month` | 1/9 | 30/9 | kéo thả, phải nằm trong khoảng |

Nhờ vậy, khi vào trang Planning: việc có ngày cụ thể **tự nhảy vào đúng ô**, việc còn lại
nằm ở hàng chờ để bạn sắp. Đúng như bạn mô tả.

**(3) Habit không sinh sẵn hàng nghìn dòng trong DB.**
Chỉ lưu *quy tắc lặp* (`freq`, `by_weekday`, `by_monthday`). Khi render một tuần, code bung
quy tắc đó thành 7 ngày cụ thể ngay trên trình duyệt. Chỉ khi bạn tick hoàn thành mới ghi
1 dòng vào `habit_logs`. DB gọn, đổi lịch lặp không phải sửa lịch sử.

---

## 1. Chuẩn bị (15 phút)

- Node.js ≥ 20 (`node -v`)
- Tài khoản [supabase.com](https://supabase.com) (gói free đủ dùng)
- Repo GitHub trống, đặt tên `weekboard`

```bash
npm create vite@latest weekboard -- --template react
cd weekboard
npm install @supabase/supabase-js date-fns @dnd-kit/core
git init && git remote add origin https://github.com/<user>/weekboard.git
```

Xoá `src/App.css`, `src/assets/`, và toàn bộ nội dung mặc định trong `src/App.jsx`.

**`.gitignore`** — thêm dòng `.env.local` (rất quan trọng, đừng commit key).

**`.env.local`**
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> `anon key` là key công khai, lộ ra ngoài không sao — miễn là bạn bật RLS (bước 2).
> Tuyệt đối **không** dùng `service_role key` trong frontend.

---

## 2. Supabase: tạo project và chạy schema (20 phút)

1. Tạo project mới, chọn region Singapore (gần VN nhất).
2. Vào **SQL Editor → New query**, dán toàn bộ `supabase/schema.sql` và chạy.
3. Vào **Settings → API**, copy `Project URL` và `anon public key` vào `.env.local`.

Schema tạo 4 bảng:

- `topics` — danh sách Goals/Topics để brainstorm
- `stuff` — task / event / habit
- `habit_logs` — mỗi lần hoàn thành một habit
- `week_plans` — đánh dấu tuần nào đã lập kế hoạch (dùng để làm nút phát sáng)

Ba thứ đáng chú ý trong schema:

- **`default auth.uid()`** trên cột `user_id` → client không cần gửi user_id khi insert.
- **Trigger `stuff_before_write`** → tự set `planned_date = start_date` khi `date_mode='single'`,
  và *chặn* việc kéo một stuff ra ngoài khoảng ngày cho phép ngay ở tầng DB.
- **RLS `own_rows`** → mỗi user chỉ đọc/ghi được dữ liệu của mình. Không có nó thì
  anon key trở thành lỗ hổng thật sự.

Kiểm tra nhanh: vào **Table Editor → stuff → Insert row**, nếu insert được và
`SELECT * FROM stuff` từ trình duyệt ẩn danh không thấy gì → RLS đang chạy đúng.

---

## 3. Auth (10 phút)

Dùng **magic link** cho gọn — không cần nhớ mật khẩu.

- Supabase → **Authentication → Providers → Email**: bật, tắt "Confirm email" nếu muốn nhanh.
- **Authentication → URL Configuration → Redirect URLs**: thêm
  `http://localhost:5173/` và `https://<user>.github.io/weekboard/`

Code nằm ở `src/App.jsx` (`<SignIn/>` + `supabase.auth.onAuthStateChange`).

---

## 4. Logic ngày tháng — trái tim của app

Toàn bộ nằm ở `src/lib/dates.js`. Đây là phần dễ sai nhất, nên hiểu kỹ.

### 4.1 Bốn chân trời

Với hôm nay = **19/8/2026 (T4)**, tuần bắt đầu thứ Hai:

```
thisStart 17/8 ──── thisEnd 23/8
                    nextStart 24/8 ──── nextEnd 30/8
                                        in a month ──── monthEnd 30/9
                                                        later ────▶
```

`monthEnd = nextEnd + 1 tháng`. Công thức này ra đúng **30/8 – 30/9/2026** như trong
bảng kế hoạch bạn đang dùng.

### 4.2 Ngày "neo" (`anchorDate`)

Một stuff rơi vào nhóm nào được quyết bởi một ngày duy nhất:

```
đã có planned_date          → dùng planned_date
chưa có, end_date < hôm nay → dùng end_date   (quá hạn → kéo về This week)
chưa có, khoảng đang chạy   → dùng đầu tuần này
còn lại                     → dùng start_date
```

Nhờ nhánh "quá hạn", việc trễ hạn không biến mất khỏi màn hình — nó nổi lên
mục **Quá hạn** với viền đỏ, thay vì trôi vào quá khứ.

### 4.3 Bung habit

`habitOccurrences(habit, from, to)` duyệt từng ngày trong khoảng và kiểm tra:

- `freq = 'weekly'` → `by_weekday` chứa thứ của ngày đó (ISO: 1 = T2 … 7 = CN).
  Ví dụ *"2-4-6 hằng tuần"* → `by_weekday = {1,3,5}`.
- `freq = 'monthly'` → `by_monthday` chứa ngày đó. Ví dụ *"ngày 5 mỗi tháng"* → `{5}`.
  Quy ước riêng: **32 = ngày cuối tháng** (giải quyết chuyện 31/2 không tồn tại).

### 4.4 `buildWeek()`

Nhận `weekStart` + toàn bộ stuff + habit logs → trả về mảng 7 phần tử
`{ date, key, items }` sẵn sàng để render. Cả trang chính lẫn trang Planning đều dùng
chung hàm này, nên hai màn hình không bao giờ lệch nhau.

---

## 5. Giao diện chính

### 5.1 Bảng tuần responsive (`components/WeekBoard.jsx` + CSS `.rail`)

Yêu cầu của bạn: ngang thì bảng ngang, dọc thì bảng dọc. Giải bằng CSS thuần,
không cần JS đo màn hình:

```css
.rail { display: grid; gap: 1px; }                     /* mặc định: xếp dọc  */

@media (min-width: 820px), (orientation: landscape) and (min-width: 640px) {
  .rail { grid-auto-flow: column; grid-auto-columns: 1fr; }   /* 7 cột ngang */
}
```

Điều kiện kép có ý nghĩa: laptop (rộng ≥ 820px) luôn ngang; điện thoại **xoay ngang**
(landscape ≥ 640px) cũng ngang; điện thoại cầm dọc thì xếp dọc.

### 5.2 Ẩn ngày đã trôi qua

Mặc định `showPast = false`. Ngày trước hôm nay:

- ở chế độ ngang → cột co lại còn **44px**, chỉ hiện "T2", bấm vào thì bung ra
- ở chế độ dọc → vẫn thu gọn, có nút *"Hiện 2 ngày đã qua"* ở trên

Kỹ thuật: build chuỗi `grid-template-columns` động rồi truyền qua CSS variable
`--rail-cols` (xem `WeekBoard.jsx`). Không dùng `display:none` để layout không giật.

### 5.3 Các nhóm còn lại

`pages/Dashboard.jsx` gom stuff thành `next_week / in_a_month / later / no_date`
bằng `bucketOf()`, cộng thêm mục **Quá hạn** và **Topics/Goals to brainstorm** ở cuối.

Lưu ý: habit **chỉ** hiện trong lưới 7 ngày, không hiện ở các nhóm bên dưới —
nếu không mỗi habit sẽ xuất hiện hàng chục lần và làm loãng màn hình.

---

## 6. Form thêm stuff (`components/StuffForm.jsx`)

Form đổi hình theo `type`:

- **task / event** → 4 nút chọn cách nhập ngày: *Chưa có ngày · Một ngày · Khoảng ngày · Cả tháng*.
  Chọn "Cả tháng" dùng `<input type="month">`, hàm `normalise()` trong `api.js` tự
  quy ra `1/9 → 30/9`.
- **habit** → chọn *Hằng tuần* (bấm các nút T2…CN) hoặc *Hằng tháng* (gõ `5, 20`),
  kèm ngày bắt đầu / kết thúc lặp.

`normalise()` là nơi duy nhất biết cách dịch dữ liệu form sang đúng ràng buộc DB.
Giữ nó ở một chỗ, đừng rải logic này vào component.

---

## 7. Trang Planning — kéo thả (`pages/Planning.jsx`)

### 7.1 Khi nào nút phát sáng

```js
const isSunday = new Date().getDay() === 0
const planned  = await isWeekPlanned(nextStart)   // có dòng trong week_plans?
<button className={`btn ${!planned && isSunday ? 'glow' : 'primary'}`}>
```

Chủ nhật + chưa lập kế hoạch → class `.glow` (viền vàng đồng, nhịp thở 2.4s,
tự tắt animation nếu hệ điều hành bật *reduce motion*). Ngoài Chủ nhật nút vẫn bấm được,
chỉ là không sáng — nghi thức nên nhắc, không nên cấm.

Bấm **"Xong, chốt tuần"** → `markWeekPlanned(nextStart)` → nút thôi sáng.

### 7.2 Cơ chế kéo thả

Dùng `@dnd-kit/core` với mô hình đơn giản nhất: **8 vùng thả** (7 ngày + 1 hàng chờ),
mỗi card là một `useDraggable`.

```
┌────────────┐  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ Chưa xếp   │  │  T2  │  T3  │  T4  │  T5  │  T6  │  T7  │  CN  │
│            │  │      │      │      │      │      │      │      │
│ ▢ Card  ──────────────────▶ │      │      │      │      │      │
│ ▢ Card     │  │ ▨ cố │      │      │      │      │      │      │
└────────────┘  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

Ba quy tắc trong `onDragEnd`:

1. `date_mode === 'single'` → **không kéo được**, đã cố định đúng ngày.
2. `range` / `month` → chỉ thả được vào ngày nằm trong khoảng, nếu không thì báo và huỷ.
3. `none` → thả đâu cũng được; thả về hàng chờ thì `planned_date = null`.

DB có trigger chặn lần hai, nên dù bug ở client cũng không sinh dữ liệu sai.

`activationConstraint: { distance: 6 }` cho phép vẫn bấm được nút tick trên card
mà không bị hiểu nhầm là bắt đầu kéo.

---

## 8. Topics / Goals to brainstorm

Bảng `topics` độc lập, mỗi stuff có `topic_id` tuỳ chọn.
Ở phiên bản đầu chỉ cần: liệt kê dạng chip ở cuối trang chính + chọn topic trong form.

Bước nâng cấp đáng làm sau: bấm vào một topic → mở panel liệt kê mọi stuff thuộc topic đó
+ ô nhập nhanh để "đẻ" task mới ngay tại chỗ. Đó chính là hành vi brainstorm bạn muốn.

---

## 9. Ghép các file lại

```
weekboard/
├─ .github/workflows/deploy.yml
├─ supabase/schema.sql
├─ index.html
├─ vite.config.js
└─ src/
   ├─ main.jsx
   ├─ App.jsx
   ├─ index.css
   ├─ lib/{api.js, dates.js}
   ├─ components/{WeekBoard.jsx, StuffCard.jsx, StuffForm.jsx}
   └─ pages/{Dashboard.jsx, Planning.jsx}
```

**`index.html`** — thêm font vào `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
```

**`src/main.jsx`**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>,
)
```

**`vite.config.js`** — `base` phải trùng tên repo, nếu không GitHub Pages sẽ 404 toàn bộ asset:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/weekboard/',
})
```

Chạy thử: `npm run dev` → http://localhost:5173

---

## 10. Deploy lên GitHub Pages

1. Đẩy code lên `main`.
2. GitHub → **Settings → Pages → Source: GitHub Actions**.
3. GitHub → **Settings → Secrets and variables → Actions → New repository secret**, thêm:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. File `.github/workflows/deploy.yml` đã sẵn sàng — mỗi lần push `main` là tự build & deploy.
5. Quay lại Supabase → **Authentication → URL Configuration**, thêm URL Pages thật vào
   Redirect URLs (bước hay quên nhất, dấu hiệu: bấm magic link thì bị đá về localhost).

**Dùng như app trên điện thoại:** mở URL Pages trên Safari/Chrome → *Add to Home Screen*.
Muốn có icon và chạy toàn màn hình thì thêm `manifest.json` sau, chưa cần ngay.

---

## 11. Checklist kiểm thử

- [ ] Thêm task không ngày → nằm ở **No date**
- [ ] Thêm task ngày 22/8 → tự nhảy vào ô **T7 22/8** của tuần này
- [ ] Thêm task khoảng 24/8–28/8 → nằm ở **Next week**, sang Planning thấy ở hàng chờ
- [ ] Thêm task "tháng 9" → nằm ở **In a month**
- [ ] Thêm task tháng 12/2026 → nằm ở **In more than a month**
- [ ] Habit "2-4-6 hằng tuần" → hiện đúng 3 ngày trong lưới, tick không ảnh hưởng ngày khác
- [ ] Habit "ngày 5 hằng tháng" → chỉ hiện tuần chứa ngày 5
- [ ] Task quá hạn hôm qua → hiện ở mục **Quá hạn**, viền đỏ
- [ ] Thu nhỏ cửa sổ / xoay điện thoại → bảng tuần đổi giữa ngang và dọc
- [ ] Ngày đã qua bị thu gọn, bấm mở lại được
- [ ] Kéo task từ hàng chờ vào T5 → reload trang vẫn ở T5
- [ ] Kéo task khoảng 24–28/8 vào CN 30/8 → bị chặn, có thông báo
- [ ] Bấm "Xong, chốt tuần" → nút thôi phát sáng
- [ ] Mở trên trình duyệt ẩn danh chưa đăng nhập → không thấy dữ liệu nào

---

## 12. Lộ trình 5 buổi

| Buổi | Việc | Kết quả nhìn thấy được |
|---|---|---|
| 1 | Bước 1–3 | Đăng nhập được, DB sẵn sàng |
| 2 | `dates.js` + `WeekBoard` | Lưới 7 ngày hiện dữ liệu nhập tay từ Supabase |
| 3 | `Dashboard` + `StuffForm` | Thêm được mọi loại stuff, 4 nhóm chạy đúng |
| 4 | `Planning` | Kéo thả được, nút phát sáng Chủ nhật |
| 5 | Bước 10 + checklist | App chạy thật trên điện thoại |

Đừng làm hết một lượt. Sau buổi 3 app đã dùng được thật — dùng nó một tuần trước khi
làm buổi 4, bạn sẽ biết chính xác trang Planning cần gì.

---

## 13. Mở rộng sau này

- **Weekly review**: khi chốt tuần, hiện những gì chưa xong tuần này và hỏi đẩy sang tuần sau hay bỏ.
- **Streak cho habit**: đếm từ `habit_logs`, hiện số chuỗi ngày liên tiếp trên card.
- **Realtime**: `supabase.channel('stuff').on('postgres_changes', …)` để mở nhiều tab vẫn đồng bộ.
- **Offline**: bọc bằng service worker + cache-first, vì bạn hay mở app lúc di chuyển.
- **Nhập nhanh bằng ngôn ngữ tự nhiên**: "họp CĐT thứ 5 9h" → parse ra `single` + `start_time`.

---

## Ghi chú thiết kế

Hướng thị giác: **giấy kẻ ô, mực xanh rừng**.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--paper` | `#EFF2F0` | nền, xám lạnh chứ không phải kem |
| `--ink` | `#15181B` | chữ chính |
| `--rule` | `#DCE2DE` | đường kẻ 1px giữa các ô ngày |
| `--pine` | `#1F4D3D` | hôm nay, habit, nút chính |
| `--gold` | `#B8891A` | **chỉ** dùng cho tín hiệu "đến lúc lập kế hoạch" |

Chữ: **Be Vietnam Pro** (thiết kế riêng cho dấu tiếng Việt, không bị vỡ dấu như
nhiều font grotesque) cho nội dung; **IBM Plex Mono** cho ngày tháng, số đếm, nhãn.
Ngày tháng ở dạng mono khiến 7 cột thẳng hàng tuyệt đối — đó là chi tiết làm bảng tuần
trông giống một công cụ hơn là một trang web.

Điểm nhấn duy nhất là **dải 7 ngày**: ngày đã qua co thành vạch mảnh, hôm nay có gạch
xanh pine 3px trên đầu. Mọi thứ khác cố tình giữ im lặng — màu vàng đồng chỉ xuất hiện
mỗi tuần một lần, và vì thế nó có nghĩa.

/**
 * Chuyển nền sáng / nền ảnh sao.
 *
 * Toàn bộ CSS của chế độ tối được nhét thẳng vào <head> từ file này, thay vì
 * viết trong index.css — nhờ vậy thêm tính năng mà không phải sửa file CSS gốc.
 *
 * Cách hoạt động: index.css khai báo màu bằng biến CSS trên :root. Ở đây chỉ
 * cần khai lại đúng những biến đó trên body.theme-night (độ ưu tiên cao hơn
 * :root) là mọi thành phần tự đổi màu theo, không phải sửa từng chỗ.
 */

const KEY = 'weekboard-theme'
export const THEMES = ['light', 'night']

// Ảnh nằm trong thư mục public/ của repo. BASE_URL để đường dẫn vẫn đúng
// khi app chạy dưới /weekboard/ trên GitHub Pages.
const BG = `${import.meta.env.BASE_URL}background_dark.jpg`

const CSS = `
body.theme-night {
  --ink:        #EEF3F8;
  --ink-2:      #B6C3D0;
  --ink-3:      #8593A3;
  --paper:      #0C1224;
  --surface:    rgba(14, 22, 44, 0.72);
  --rule:       rgba(255, 255, 255, 0.16);
  --rule-soft:  rgba(255, 255, 255, 0.08);
  --rule-strong: rgba(255, 255, 255, 0.26);
  --pine:       #6FD3A8;
  --pine-soft:  rgba(111, 211, 168, 0.16);
  --gold:       #E5C15C;
  --gold-soft:  rgba(229, 193, 92, 0.16);
  --danger:     #FF8A80;

  background: var(--paper);
  color-scheme: dark;   /* để lịch/giờ gốc của trình duyệt cũng ra nền tối */
}

/* Ảnh nền dán cố định bằng lớp phủ riêng. Không dùng background-attachment:
   fixed vì trên iOS nó giật và bị phóng to sai. */
body.theme-night::before,
body.theme-night::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
body.theme-night::before {
  background: url("${BG}") center / cover no-repeat;
}
/* Lớp tối nhẹ để chữ luôn đọc được, kể cả ở góc ảnh sáng */
body.theme-night::after {
  background: linear-gradient(180deg, rgba(6,10,24,.45), rgba(6,10,24,.72));
}

/* Mặt thẻ mờ đục để nổi khỏi ảnh nền */
body.theme-night .card,
body.theme-night .day,
body.theme-night .panel,
body.theme-night .modal,
body.theme-night .pool,
body.theme-night .resource,
body.theme-night .archived-topic,
body.theme-night .field,
body.theme-night .btn {
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

/* index.css tô cứng màu sáng cho ngày đã qua — phải khai lại */
body.theme-night .day.past { background: rgba(8, 13, 30, 0.55); }
body.theme-night .day.today { background: var(--pine-soft); }

/* Nút nền xanh mint: chữ phải đậm màu mới đọc được */
body.theme-night .btn.primary,
body.theme-night .topic-on { color: #08121F; }
body.theme-night .btn.glow { color: #2A1F04; }

body.theme-night .modal-bg { background: rgba(2, 6, 18, 0.62); }
body.theme-night .search-item:hover { background: rgba(255, 255, 255, 0.07); }
body.theme-night .rail { border-color: var(--rule-strong); }
`

let injected = false

function inject() {
  if (injected || typeof document === 'undefined') return
  const el = document.createElement('style')
  el.id = 'weekboard-theme'
  el.textContent = CSS
  document.head.appendChild(el)
  injected = true
}

export function getTheme() {
  try {
    const v = localStorage.getItem(KEY)
    return THEMES.includes(v) ? v : 'light'
  } catch {
    return 'light'   // trình duyệt chặn localStorage (chế độ riêng tư)
  }
}

export function applyTheme(theme) {
  inject()
  const t = THEMES.includes(theme) ? theme : 'light'
  document.body.classList.toggle('theme-night', t === 'night')
  try { localStorage.setItem(KEY, t) } catch { /* không lưu được thì thôi */ }
  return t
}

/** Đổi qua lại giữa hai nền, trả về nền vừa chọn. */
export function toggleTheme() {
  return applyTheme(getTheme() === 'night' ? 'light' : 'night')
}

// Áp dụng ngay khi file được nạp, để không bị nháy nền sáng rồi mới đổi
applyTheme(getTheme())

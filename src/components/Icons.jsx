/**
 * Bộ icon dùng chung cho thanh công cụ. Vẽ trực tiếp bằng SVG thay vì
 * dùng thư viện icon — chỉ cần vài cái, không đáng để thêm dependency.
 * Mặc định 16px, kế thừa màu chữ của nút bao ngoài.
 */
const base = {
  width: 16, height: 16, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round',
}

export function SearchIcon(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  )
}

export function PlusIcon(p) {
  return (
    <svg {...base} {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

/** Lịch có mũi tên sang phải — "lập kế hoạch cho tuần sau". */
export function PlanIcon(p) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" />
      <line x1="8" y1="2.5" x2="8" y2="6" />
      <line x1="16" y1="2.5" x2="16" y2="6" />
      <polyline points="11.5 13 14.5 15.5 11.5 18" />
    </svg>
  )
}

export function CheckIcon(p) {
  return (
    <svg {...base} {...p}>
      <polyline points="4 12.5 9.5 18 20 6.5" />
    </svg>
  )
}

/** Chồng sách/thẻ — Resource. */
export function LibraryIcon(p) {
  return (
    <svg {...base} {...p}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
      <path d="M9 4h4.5a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H9Z" />
      <path d="m17.5 5.2 2.2 13.1" />
    </svg>
  )
}

export function LogoutIcon(p) {
  return (
    <svg {...base} {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

/** Tia sáng — Reflect. Đây là icon duy nhất tô đặc, để nổi bật hơn. */
export function ReflectIcon(p) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="m12 2 1.8 5.6a2 2 0 0 0 1.3 1.3L20.7 10.7 15.1 12.5a2 2 0 0 0-1.3 1.3L12 19.4l-1.8-5.6a2 2 0 0 0-1.3-1.3L3.3 10.7l5.6-1.8a2 2 0 0 0 1.3-1.3Z" />
    </svg>
  )
}

export function BackIcon(p) {
  return (
    <svg {...base} {...p}>
      <line x1="20" y1="12" x2="5" y2="12" />
      <polyline points="11 18 5 12 11 6" />
    </svg>
  )
}

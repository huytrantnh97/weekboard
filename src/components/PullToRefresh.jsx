import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 64   // px kéo xuống trước khi coi là "thả để làm mới"

/**
 * Bọc quanh nội dung trang. Khi trang đang cuộn ở đỉnh (scrollY = 0),
 * kéo xuống đủ xa rồi thả → gọi onRefresh().
 * Dùng native addEventListener (không phải onTouchMove của React) vì
 * cần preventDefault để trang không tự cuộn trong lúc kéo, mà touchmove
 * qua synthetic event của React mặc định là passive nên preventDefault bị bỏ qua.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef(null)
  const startY = useRef(0)
  const pullRef = useRef(0)
  const active = useRef(false)
  const busyRef = useRef(false)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const onStart = (e) => {
      if (window.scrollY > 0 || busyRef.current) { active.current = false; return }
      startY.current = e.touches[0].clientY
      active.current = true
    }

    const onMove = (e) => {
      if (!active.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) { pullRef.current = 0; setPull(0); return }
      e.preventDefault()
      const v = Math.min(dy * 0.5, 96)
      pullRef.current = v
      setPull(v)
    }

    const onEnd = async () => {
      if (!active.current) return
      active.current = false
      const p = pullRef.current
      pullRef.current = 0
      setPull(0)
      if (p > THRESHOLD) {
        busyRef.current = true
        setBusy(true)
        try { await onRefresh() } finally { busyRef.current = false; setBusy(false) }
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [onRefresh])

  return (
    <div ref={rootRef}>
      <div className="ptr-indicator"
           style={{ height: busy ? 40 : pull, opacity: busy || pull > 8 ? 1 : 0 }}>
        <span className={busy ? 'ptr-spin' : ''}>
          {busy ? '↻' : pull > THRESHOLD ? '↑ Thả để làm mới' : '↓ Kéo để làm mới'}
        </span>
      </div>
      {children}
    </div>
  )
}

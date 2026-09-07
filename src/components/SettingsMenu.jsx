import { useEffect, useRef, useState } from 'react'
import { getTheme, applyTheme } from '../lib/theme'
import { LogoutIcon } from './Icons'

/**
 * Một nút bánh răng gom các thiết lập: đổi nền và đăng xuất.
 * Menu đóng khi bấm ra ngoài hoặc nhấn Esc.
 */
export default function SettingsMenu({ onSignOut }) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(getTheme)
  const boxRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    // pointerdown thay vì click: đóng menu ngay khi chạm, không đợi nhả tay
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (next) => {
    setTheme(applyTheme(next))
  }

  const signOut = () => {
    setOpen(false)
    if (confirm('Đăng xuất khỏi WeekBoard?')) onSignOut?.()
  }

  return (
    <span ref={boxRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button className="btn ghost icon-btn" title="Thiết lập" aria-label="Thiết lập"
              aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <GearIcon />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60,
            minWidth: 210, padding: 10,
            background: 'var(--surface)', color: 'var(--ink)',
            border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow)',
            display: 'grid', gap: 10,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Nền</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={`btn ${theme === 'light' ? 'primary' : ''}`}
                      style={{ flex: 1 }} onClick={() => pick('light')}>
                Sáng
              </button>
              <button className={`btn ${theme === 'night' ? 'primary' : ''}`}
                      style={{ flex: 1 }} onClick={() => pick('night')}>
                Đêm sao
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 10 }}>
            <button className="btn ghost" onClick={signOut}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              <LogoutIcon />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </span>
  )
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.11a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.11a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.11a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.11a1.6 1.6 0 0 0-1.47.97Z" />
    </svg>
  )
}

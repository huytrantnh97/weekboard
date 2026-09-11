import { useEffect, useState } from 'react'
import { format, getISODay } from 'date-fns'
import { DAY_LABEL, iso } from '../lib/dates'
import { saveJournal } from '../lib/api'

/**
 * Ghi chú của một ngày, mở toàn màn hình để có chỗ viết thật sự.
 * Dùng style nội tuyến thay vì class .modal để không phải sửa index.css —
 * .modal bị giới hạn chiều rộng và canh giữa, không hợp ở đây.
 */
export default function JournalModal({ date, initialContent = '', onClose, onSaved }) {
  const [text, setText] = useState(initialContent)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const dirty = text !== initialContent

  const close = () => {
    if (dirty && !confirm('Thoát mà không lưu? Nội dung vừa gõ sẽ mất.')) return
    onClose()
  }

  // Esc để đóng; Ctrl/Cmd + Enter để lưu nhanh
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // Khoá cuộn trang nền trong lúc mở toàn màn hình
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const save = async () => {
    setBusy(true)
    setErr(null)
    try {
      await saveJournal(iso(date), text)
      onSaved?.(text.trim())
      onClose()
    } catch (e) {
      setErr(e.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'var(--paper)',
        display: 'flex', flexDirection: 'column',
        padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <h2>Nhật ký</h2>
        <span className="eyebrow">
          {DAY_LABEL[getISODay(date)]} {format(date, 'd/M/yyyy')}
        </span>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={close}>
          Đóng
        </button>
      </div>

      {/* flex:1 để ô nhập chiếm hết chỗ còn lại, kể cả khi bàn phím ảo
          đẩy chiều cao khung nhìn xuống */}
      <textarea
        className="field"
        autoFocus
        placeholder="Hôm nay thế nào…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          flex: 1, resize: 'none', minHeight: 0,
          fontSize: 15, lineHeight: 1.65, padding: 14,
        }}
      />

      {err && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{err}</p>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button className="btn primary" onClick={save} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
        <button className="btn ghost" onClick={close}>Huỷ</button>
        <span className="card-meta" style={{ marginLeft: 'auto' }}>
          {text.trim() ? `${text.trim().length} ký tự` : ''}
        </span>
      </div>
    </div>
  )
}

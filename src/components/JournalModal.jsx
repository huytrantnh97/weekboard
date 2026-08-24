import { useState } from 'react'
import { format } from 'date-fns'
import { DAY_LABEL, iso } from '../lib/dates'
import { getISODay } from 'date-fns'
import { saveJournal } from '../lib/api'

export default function JournalModal({ date, initialContent = '', onClose, onSaved }) {
  const [text, setText] = useState(initialContent)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

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
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <h2>Nhật ký</h2>
          <span className="eyebrow">{DAY_LABEL[getISODay(date)]} {format(date, 'd/M/yyyy')}</span>
          <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Đóng</button>
        </div>

        <textarea className="field" rows={8} autoFocus placeholder="Hôm nay thế nào…"
                  value={text} onChange={(e) => setText(e.target.value)} />

        {err && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { getReflection, triggerReflect } from '../lib/api'
import { iso } from '../lib/dates'
import MiniMarkdown from './MiniMarkdown'

/**
 * weekStart: Date — thứ Hai của tuần cần xem báo cáo (luôn là h.thisStart,
 * dù mở từ Dashboard hay từ trang Planning — cùng một báo cáo).
 */
export default function ReflectModal({ weekStart, onClose }) {
  const [data, setData] = useState(undefined)   // undefined: đang tải, null: chưa có
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const load = () => getReflection(iso(weekStart)).then(setData)
  useEffect(() => { load() }, [weekStart])

  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      await triggerReflect()
      await load()
    } catch (e) {
      setErr(e.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <h2>Reflect</h2>
          <span className="eyebrow">
            Tuần {format(weekStart, 'd/M')} – {format(new Date(weekStart.getTime() + 6 * 86400000), 'd/M')}
          </span>
          <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Đóng</button>
        </div>

        {data === undefined && <p className="empty">Đang tải…</p>}

        {data === null && (
          <>
            <p className="empty">
              Chưa có báo cáo cho tuần này. Báo cáo tự động tạo lúc 20:00 Chủ nhật,
              hoặc bấm nút dưới để tạo ngay.
            </p>
            <button className="btn primary" onClick={run} disabled={busy}>
              {busy ? 'Đang tạo…' : 'Tạo báo cáo ngay'}
            </button>
          </>
        )}

        {data && (
          <>
            <MiniMarkdown text={data.content} />
            <button className="btn ghost" onClick={run} disabled={busy} style={{ marginTop: 8 }}>
              {busy ? 'Đang tạo lại…' : 'Tạo lại'}
            </button>
          </>
        )}

        {err && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{err}</p>}
      </div>
    </div>
  )
}

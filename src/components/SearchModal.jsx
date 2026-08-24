import { useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { searchAll } from '../lib/api'
import { dateText } from '../lib/dates'

const EMPTY = { stuff: [], journal: [], resources: [], reflections: [], topics: [] }
const TYPE_LABEL = { task: 'task', event: 'event', habit: 'habit' }

export default function SearchModal({ onClose, onOpenStuff }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const seq = useRef(0)

  // Gõ tới đâu tìm tới đó, nhưng chờ 250ms cho ngừng gõ mới gọi server.
  // seq để bỏ qua kết quả về muộn của lần gõ cũ (tránh nhấp nháy sai kết quả).
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setRes(EMPTY); setBusy(false); return }
    setBusy(true)
    const mine = ++seq.current
    const t = setTimeout(async () => {
      try {
        const r = await searchAll(term)
        if (seq.current === mine) { setRes(r); setErr(null) }
      } catch (e) {
        if (seq.current === mine) setErr(e.message ?? String(e))
      } finally {
        if (seq.current === mine) setBusy(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  const total = useMemo(
    () => Object.values(res).reduce((n, arr) => n + arr.length, 0), [res])

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal search-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="field" autoFocus placeholder="Tìm mọi thứ…"
                 value={q} onChange={(e) => setQ(e.target.value)}
                 onKeyDown={(e) => e.key === 'Escape' && onClose()} />
          <button className="btn ghost" onClick={onClose} style={{ flex: '0 0 auto' }}>Đóng</button>
        </div>

        <div className="search-results">
          {err && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</p>}
          {q.trim().length < 2 && <div className="empty">Gõ ít nhất 2 ký tự.</div>}
          {q.trim().length >= 2 && !busy && total === 0 && (
            <div className="empty">Không tìm thấy gì.</div>
          )}
          {busy && <div className="empty">Đang tìm…</div>}

          <Group title="Việc" items={res.stuff} render={(s) => (
            <button key={s.id} className="search-item"
                    onClick={() => { onOpenStuff?.(s); onClose() }}>
              <span className="search-title">{s.title}</span>
              <span className="search-meta">
                {TYPE_LABEL[s.type]}
                {dateText(s) && ` · ${dateText(s)}`}
                {s.status === 'done' && ' · đã xong'}
              </span>
            </button>
          )} />

          <Group title="Nhật ký" items={res.journal} render={(j) => (
            <div key={j.entry_date} className="search-item static">
              <span className="search-title">{format(parseISO(j.entry_date), 'd/M/yyyy')}</span>
              <span className="search-meta">{snip(j.content)}</span>
            </div>
          )} />

          <Group title="Resource" items={res.resources} render={(r) => (
            r.url
              ? <a key={r.id} className="search-item" href={r.url}
                   target="_blank" rel="noopener noreferrer">
                  <span className="search-title">{r.title} ↗</span>
                  <span className="search-meta">{r.note || r.url}</span>
                </a>
              : <div key={r.id} className="search-item static">
                  <span className="search-title">{r.title}</span>
                  <span className="search-meta">{r.note}</span>
                </div>
          )} />

          <Group title="Chủ đề" items={res.topics} render={(t) => (
            <div key={t.id} className="search-item static">
              <span className="search-title">{t.title}</span>
              {t.note && <span className="search-meta">{snip(t.note)}</span>}
            </div>
          )} />

          <Group title="Báo cáo Reflect" items={res.reflections} render={(r) => (
            <div key={r.week_start} className="search-item static">
              <span className="search-title">
                Tuần {format(parseISO(r.week_start), 'd/M/yyyy')}
              </span>
              <span className="search-meta">{snip(r.content)}</span>
            </div>
          )} />
        </div>
      </div>
    </div>
  )
}

function Group({ title, items, render }) {
  if (!items?.length) return null
  return (
    <div className="search-group">
      <div className="eyebrow">{title} · {items.length}</div>
      {items.map(render)}
    </div>
  )
}

const snip = (s, n = 110) => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

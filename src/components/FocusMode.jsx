import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  setDone, toggleHabitLog, deleteStuff, updateStuff,
  createSubtask, setIgnoreFocus,
  listResources, listLinkedResources, linkResource, unlinkResource,
} from '../lib/api'
import { DateField } from './DateField'

const ICON = { task: '📌', event: '◆', habit: '↻' }
const TYPE_LABEL = { task: 'Task', event: 'Event', habit: 'Habit' }

const toMin = (t) => {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const nowMin = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** Còn <= 30 phút nữa là tới giờ thì coi như "đến lượt" của việc đó. */
const SOON = 30
/** Quá giờ hơn 60 phút thì thôi không ưu tiên nữa — nếu cứ ưu tiên mãi,
 *  một việc buổi sáng bị bỏ lỡ sẽ chiếm màn hình tới tận đêm. */
const LATE = 60

/**
 * Chế độ Tập trung: chỉ hiện MỘT việc của hôm nay.
 *
 * Cách chọn:
 *  1. Việc có giờ và đã tới giờ (hoặc còn <= 30 phút nữa) — ưu tiên cao nhất,
 *     lấy việc sớm nhất trước.
 *  2. Không có việc nào tới giờ → bốc ngẫu nhiên trong đám chưa đặt giờ.
 *  3. Hết việc chưa đặt giờ → hiện việc có giờ gần nhất sắp tới.
 *
 * items: danh sách việc của HÔM NAY (đã bung habit), lấy từ lưới tuần.
 * stuff: toàn bộ stuff, để tìm việc con.
 */
export default function FocusMode({ items = [], stuff = [], onChanged, onClose }) {
  const [seed, setSeed] = useState(0)           // tăng lên mỗi lần bấm "Việc khác"
  const [rnd] = useState(() => Math.floor(Math.random() * 10000))   // xáo phần chưa đặt giờ
  const [panel, setPanel] = useState(null)   // 'subtasks' | 'resources' | 'schedule'
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const { current, remaining } = useMemo(() => {
    const pool = items.filter((it) => !it.done && !it.ignore_focus)
    const now = nowMin()

    // Đang tới lượt: có giờ, và giờ đó nằm quanh thời điểm hiện tại
    const dueNow = pool
      .filter((it) => {
        const m = toMin(it.start_time)
        return m !== null && m <= now + SOON && m >= now - LATE
      })
      .sort((a, b) => toMin(a.start_time) - toMin(b.start_time))

    // Còn lại: chưa đặt giờ, giờ còn xa, hoặc đã quá giờ lâu.
    // Xáo thứ tự theo rnd để mỗi phiên bốc được việc khác nhau.
    const rest = pool.filter((it) => !dueNow.includes(it))
    const shuffled = rest.map((_, i) => rest[(i + rnd) % rest.length])

    const ordered = [...dueNow, ...shuffled]
    const pick = ordered.length ? ordered[seed % ordered.length] : null
    return { current: pick, remaining: pool.length }
  }, [items, seed, rnd])

  const children = useMemo(
    () => (current ? stuff.filter((s) => s.parent_id === current.id) : []),
    [stuff, current])

  const openChildren = children.filter((c) => c.status === 'open')
  const prepared = current?.type === 'event' && openChildren.length === 0

  // Đổi việc thì đóng bảng công cụ đang mở, tránh sửa nhầm việc khác
  useEffect(() => { setPanel(null); setErr(null) }, [current?.id])

  const run = async (fn) => {
    setBusy(true); setErr(null)
    try { await fn(); onChanged?.() }
    catch (e) { setErr(e.message ?? String(e)) }
    finally { setBusy(false) }
  }

  const markDone = () => run(async () => {
    if (current.type === 'habit') await toggleHabitLog(current.id, current.occurrence_date, true)
    else await setDone(current.id, true)
  })

  const remove = () => {
    if (!confirm(`Xoá "${current.title}"?\n\nKhông thể hoàn tác.`)) return
    run(() => deleteStuff(current.id))
  }

  const ignore = () => run(() => setIgnoreFocus(current.id, true))

  return (
    <div style={SHELL}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <span className="eyebrow">Tập trung</span>
        <span className="card-meta">còn {remaining} việc hôm nay</span>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>
          Thoát
        </button>
      </div>

      {!current ? (
        <div style={{ margin: 'auto', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <h1 style={{ marginBottom: 8 }}>Xong hết rồi</h1>
          <p className="card-meta">Không còn việc nào cho hôm nay.</p>
        </div>
      ) : (
        <div style={{ margin: 'auto 0', width: '100%', maxWidth: 620 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            {ICON[current.type]} {TYPE_LABEL[current.type]}
            {current.start_time && ` · ${current.start_time.slice(0, 5)}`}
            {prepared && ' · ✅ đã chuẩn bị xong'}
          </div>

          <h1 style={{ fontSize: 30, lineHeight: 1.25, marginBottom: 12 }}>
            {current.title}
          </h1>

          {current.note && (
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-2)', marginBottom: 12 }}>
              {current.note}
            </p>
          )}

          {current.link && (
            <p style={{ marginBottom: 16 }}>
              <a className="btn ghost" href={current.link}
                 target="_blank" rel="noopener noreferrer">↗ Mở link</a>
            </p>
          )}

          {current.type !== 'habit' && children.length > 0 && (
            <p className="card-meta" style={{ marginBottom: 16 }}>
              Việc con: {children.length - openChildren.length}/{children.length} xong
            </p>
          )}

          {/* --------------------------- công cụ --------------------------- */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <button className="btn primary" onClick={markDone} disabled={busy}>
              ✓ Xong
            </button>

            {current.type === 'task' && (
              <>
                <Tool on={panel === 'subtasks'} onClick={() => toggle('subtasks')}>
                  Chia nhỏ
                </Tool>
                <Tool on={panel === 'resources'} onClick={() => toggle('resources')}>
                  Resource
                </Tool>
                <Tool on={panel === 'schedule'} onClick={() => toggle('schedule')}>
                  Dời ngày
                </Tool>
                <button className="btn ghost" onClick={remove} disabled={busy}
                        style={{ color: 'var(--danger)' }}>Xoá</button>
              </>
            )}

            {current.type === 'habit' && (
              <Tool on={panel === 'resources'} onClick={() => toggle('resources')}>
                Resource
              </Tool>
            )}

            {current.type === 'event' && (
              <>
                <Tool on={panel === 'subtasks'} onClick={() => toggle('subtasks')}>
                  Chuẩn bị{openChildren.length > 0 ? ` (${openChildren.length})` : ''}
                </Tool>
                <button className="btn ghost" onClick={ignore} disabled={busy}>
                  Bỏ qua event này
                </button>
              </>
            )}

            <button className="btn ghost" style={{ marginLeft: 'auto' }}
                    onClick={() => setSeed((v) => v + 1)} disabled={busy}>
              Việc khác →
            </button>
          </div>

          {err && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</p>}

          {panel === 'subtasks' && (
            <Subtasks parent={current} subs={children} onChanged={onChanged} />
          )}
          {panel === 'resources' && (
            <RelatedResources stuffId={current.id} />
          )}
          {panel === 'schedule' && (
            <Schedule item={current} onDone={onChanged} />
          )}
        </div>
      )}
    </div>
  )

  function toggle(name) { setPanel((p) => (p === name ? null : name)) }
}

/* ------------------------------- việc con -------------------------------- */

// Đặt tên prop là subs, không phải children — children là tên dành riêng của React
function Subtasks({ parent, subs, onChanged }) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const add = async (e) => {
    e.preventDefault()
    const t = draft.trim()
    if (!t) return
    setBusy(true)
    try { await createSubtask(parent.id, t); setDraft(''); onChanged?.() }
    finally { setBusy(false) }
  }

  return (
    <div className="panel">
      <div className="eyebrow">
        {parent.type === 'event' ? 'Cần chuẩn bị' : 'Chia nhỏ'} · {subs.length}
      </div>

      {subs.length === 0
        ? <div className="empty">Chưa có việc con nào.</div>
        : subs.map((c) => (
          <div key={c.id} className="topic-item">
            <button type="button" className="tick" data-on={String(c.status === 'done')}
                    aria-label="Đánh dấu hoàn thành"
                    onClick={async () => {
                      await setDone(c.id, c.status !== 'done'); onChanged?.()
                    }} />
            <span style={{ textDecoration: c.status === 'done' ? 'line-through' : 'none' }}>
              {c.title}
            </span>
            <button className="btn ghost" style={{ marginLeft: 'auto', color: 'var(--danger)' }}
                    aria-label="Xoá việc con"
                    onClick={async () => { await deleteStuff(c.id); onChanged?.() }}>×</button>
          </div>
        ))}

      <form onSubmit={add} style={{ display: 'flex', gap: 6 }}>
        <input className="field" placeholder="Bước tiếp theo là gì…"
               value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn" type="submit" disabled={busy}
                style={{ flex: '0 0 auto' }}>Thêm</button>
      </form>
    </div>
  )
}

/* ------------------------------- resource -------------------------------- */

function RelatedResources({ stuffId }) {
  const [linked, setLinked] = useState([])
  const [all, setAll] = useState([])
  const [pick, setPick] = useState('')

  const load = async () => {
    const [l, a] = await Promise.all([listLinkedResources(stuffId), listResources()])
    setLinked(l); setAll(a)
  }
  useEffect(() => { load() }, [stuffId])

  const free = all.filter((r) => !linked.some((x) => x.id === r.id))

  return (
    <div className="panel">
      <div className="eyebrow">Resource liên quan · {linked.length}</div>

      {linked.length === 0
        ? <div className="empty">Chưa gắn resource nào.</div>
        : linked.map((r) => (
          <div key={r.id} className="topic-item">
            {r.url
              ? <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title} ↗</a>
              : <span>{r.title}</span>}
            <button className="btn ghost" style={{ marginLeft: 'auto' }}
                    aria-label="Bỏ gắn"
                    onClick={async () => { await unlinkResource(stuffId, r.id); load() }}>×</button>
          </div>
        ))}

      {free.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          <select className="field" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">— chọn resource —</option>
            {free.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
          <button className="btn" style={{ flex: '0 0 auto' }} disabled={!pick}
                  onClick={async () => {
                    await linkResource(stuffId, pick); setPick(''); load()
                  }}>Gắn</button>
        </div>
      )}
    </div>
  )
}

/* -------------------------------- dời ngày ------------------------------- */

function Schedule({ item, onDone }) {
  const [d, setD] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const save = async () => {
    if (!d) return
    setBusy(true); setErr(null)
    try {
      // Dời hẳn, không chỉ đổi ngày hiển thị — nếu không việc vẫn bị tính quá hạn
      const patch = { planned_date: d, position: Date.now() }
      if (item.date_mode === 'single') { patch.start_date = d; patch.end_date = d }
      else if (item.date_mode === 'range' || item.date_mode === 'month') {
        if (item.start_date > d) patch.start_date = d
        if (item.end_date < d) patch.end_date = d
      }
      await updateStuff(item.id, patch)
      onDone?.()
    } catch (e) {
      setErr(e.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <div className="eyebrow">Dời sang ngày khác</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <DateField value={d} onChange={setD} />
        <button className="btn" onClick={save} disabled={!d || busy}>
          {busy ? 'Đang lưu…' : 'Dời'}
        </button>
      </div>
      <div className="card-meta">
        Đang xếp: {item.planned_date ? format(new Date(item.planned_date), 'd/M/yyyy') : 'chưa có'}
      </div>
      {err && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</p>}
    </div>
  )
}

function Tool({ on, onClick, children }) {
  return (
    <button className={`btn ${on ? 'primary' : ''}`} onClick={onClick}>{children}</button>
  )
}

const SHELL = {
  position: 'fixed', inset: 0, zIndex: 80,
  background: 'var(--paper)',
  display: 'flex', flexDirection: 'column',
  overflowY: 'auto',
  padding: 'max(20px, env(safe-area-inset-top)) 20px max(20px, env(safe-area-inset-bottom))',
}

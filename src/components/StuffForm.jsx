import { useState } from 'react'
import { createStuff, updateStuff, deleteStuff, normalise } from '../lib/api'
import { DAY_LABEL } from '../lib/dates'
import { DateField, MonthField } from './DateField'
import ShareBox from './ShareBox'

const empty = {
  type: 'task', title: '', note: '', link: '', topic_id: null,
  date_mode: 'none', start_date: '', end_date: '', month: '', start_time: '',
  freq: 'weekly', by_weekday: [], by_monthday: [], repeat_from: '', repeat_until: '',
}

/** Đổ dữ liệu một stuff đã có vào state của form. */
function fromItem(it) {
  if (!it) return empty
  return {
    ...empty,
    type: it.type,
    title: it.title ?? '',
    note: it.note ?? '',
    link: it.link ?? '',
    topic_id: it.topic_id ?? null,
    date_mode: it.date_mode ?? 'none',
    start_date: it.start_date ?? '',
    end_date: it.end_date ?? '',
    month: it.date_mode === 'month' && it.start_date ? it.start_date.slice(0, 7) : '',
    start_time: it.start_time ? it.start_time.slice(0, 5) : '',
    freq: it.freq ?? 'weekly',
    by_weekday: it.by_weekday ?? [],
    by_monthday: it.by_monthday ?? [],
    repeat_from: it.repeat_from ?? '',
    repeat_until: it.repeat_until ?? '',
  }
}

/**
 * Dùng cho cả thêm mới và sửa.
 * item = null  → thêm mới
 * item = stuff → sửa, hiện thêm nút Xoá
 */
export default function StuffForm({ item = null, topics = [], defaultDate = null, meId = null,
                                    onSaved, onCancel, onDeleted }) {
  const [f, setF] = useState(() => {
    const base = fromItem(item)
    if (!item && defaultDate) return { ...base, date_mode: 'single', start_date: defaultDate }
    return base
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const editing = !!item
  // Người mới (chưa lưu) luôn là chủ. Đang sửa: chỉ chủ mới thấy Xoá / Chia sẻ —
  // người được người khác chia sẻ cho chỉ xem/sửa nội dung, không quản lý quyền.
  const isOwner = !editing || item.user_id === meId

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const toggleIn = (k, v) =>
    set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v])

  const save = async (e) => {
    e.preventDefault()
    if (!f.title.trim()) return
    setErr(null); setBusy(true)
    try {
      const payload = { ...f, title: f.title.trim() }

      if (payload.type !== 'habit') {
        payload.freq = null; payload.by_weekday = null; payload.by_monthday = null
        payload.repeat_from = null; payload.repeat_until = null
      }

      // Giữ / gỡ ngày đã xếp cho khớp với khoảng ngày mới
      if (editing) {
        if (payload.date_mode === 'none') payload.planned_date = null
        else if (payload.date_mode !== 'single' && item.planned_date) {
          const p = item.planned_date
          const lo = payload.date_mode === 'month'
            ? `${payload.month}-01` : payload.start_date
          if (!lo || p < lo || (payload.end_date && p > payload.end_date && payload.date_mode === 'range'))
            payload.planned_date = null
        }
      }

      // normalise() lọc về đúng các cột có thật — cả hai nhánh đều phải qua đây
      if (editing) await updateStuff(item.id, normalise(payload))
      else await createStuff(payload)
      onSaved?.()
    } catch (e2) {
      setErr(e2.message ?? String(e2))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Xoá "${item.title}"?\n\nKhông thể hoàn tác.`)) return
    setBusy(true)
    try { await deleteStuff(item.id); onDeleted?.() }
    catch (e2) { setErr(e2.message ?? String(e2)); setBusy(false) }
  }

  return (
    <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h2>{editing ? 'Sửa' : 'Thêm mới'}</h2>
        <button className="btn ghost" type="button" style={{ marginLeft: 'auto' }}
                onClick={onCancel}>Đóng</button>
      </div>

      <Row label="Loại">
        {['task', 'event', 'habit'].map((t) => (
          <button type="button" key={t}
                  className={`btn ${f.type === t ? 'primary' : ''}`}
                  onClick={() => set('type', t)}>{t}</button>
        ))}
      </Row>

      <input className="field" placeholder="Tên việc…" autoFocus
             value={f.title} onChange={(e) => set('title', e.target.value)} />

      {f.type !== 'habit' ? (
        <>
          <Row label="Ngày">
            {[['none', 'Chưa có ngày'], ['single', 'Một ngày'],
              ['range', 'Khoảng ngày'], ['month', 'Cả tháng']].map(([v, l]) => (
              <button type="button" key={v}
                      className={`btn ${f.date_mode === v ? 'primary' : ''}`}
                      onClick={() => set('date_mode', v)}>{l}</button>
            ))}
          </Row>

          {f.date_mode === 'single' && (
            <DateField value={f.start_date} onChange={(v) => set('start_date', v)} />
          )}
          {f.date_mode === 'range' && (
            <Row label="Từ – đến">
              <DateField value={f.start_date} onChange={(v) => set('start_date', v)} />
              <DateField value={f.end_date} onChange={(v) => set('end_date', v)} />
            </Row>
          )}
          {f.date_mode === 'month' && (
            <MonthField value={f.month} onChange={(v) => set('month', v)} />
          )}
        </>
      ) : (
        <>
          <Row label="Lặp">
            {[['weekly', 'Hằng tuần'], ['monthly', 'Hằng tháng']].map(([v, l]) => (
              <button type="button" key={v}
                      className={`btn ${f.freq === v ? 'primary' : ''}`}
                      onClick={() => set('freq', v)}>{l}</button>
            ))}
          </Row>
          {f.freq === 'weekly' ? (
            <Row label="Thứ">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button type="button" key={d}
                        className={`btn ${f.by_weekday.includes(d) ? 'primary' : ''}`}
                        onClick={() => toggleIn('by_weekday', d)}>{DAY_LABEL[d]}</button>
              ))}
            </Row>
          ) : (
            <Row label="Ngày trong tháng">
              <input className="field" placeholder="vd: 5, 20, 32 (=cuối tháng)"
                     defaultValue={f.by_monthday.join(', ')}
                     onChange={(e) => set('by_monthday',
                       e.target.value.split(',').map((s) => Number(s.trim()))
                         .filter((n) => n >= 1 && n <= 32))} />
            </Row>
          )}
          <Row label="Bắt đầu / kết thúc lặp">
            <DateField value={f.repeat_from} onChange={(v) => set('repeat_from', v)} />
            <DateField value={f.repeat_until} onChange={(v) => set('repeat_until', v)} />
          </Row>
        </>
      )}

      <Row label="Giờ (không bắt buộc)">
        <input type="time" className="field" style={{ width: 'auto' }}
               value={f.start_time} onChange={(e) => set('start_time', e.target.value)} />
        {f.start_time && (
          <button type="button" className="btn ghost" onClick={() => set('start_time', '')}
                  aria-label="Bỏ giờ">×</button>
        )}
      </Row>

      <textarea className="field" rows={2} placeholder="Ghi chú…"
                value={f.note} onChange={(e) => set('note', e.target.value)} />

      <Row label="Link">
        <span style={{ display: 'flex', gap: 6, flex: 1, minWidth: 200 }}>
          <input type="url" className="field" placeholder="https://…"
                 value={f.link} onChange={(e) => set('link', e.target.value)} />
          {f.link && (
            <a className="btn ghost" href={f.link} target="_blank" rel="noopener noreferrer"
               title="Mở link" aria-label="Mở link" style={{ flex: '0 0 auto' }}>↗</a>
          )}
        </span>
      </Row>

      <Row label="Chủ đề">
        <select className="field" value={f.topic_id ?? ''}
                onChange={(e) => set('topic_id', e.target.value || null)}>
          <option value="">— không —</option>
          {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </Row>

      {editing && !isOwner && (
        <p className="card-meta">Việc này được người khác chia sẻ với bạn.</p>
      )}

      {editing && isOwner && (
        <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 12 }}>
          <ShareBox id={item.id} kind="stuff" />
        </div>
      )}

      {err && <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{err}</p>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
        <button className="btn ghost" type="button" onClick={onCancel}>Huỷ</button>
        {editing && isOwner && (
          <button className="btn ghost" type="button" onClick={remove} disabled={busy}
                  style={{ marginLeft: 'auto', color: 'var(--danger)' }}>Xoá</button>
        )}
      </div>
    </form>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

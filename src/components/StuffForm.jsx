import { useState } from 'react'
import { createStuff } from '../lib/api'
import { DAY_LABEL } from '../lib/dates'

const empty = {
  type: 'task', title: '', note: '', topic_id: null,
  date_mode: 'none', start_date: '', end_date: '', month: '', start_time: '',
  freq: 'weekly', by_weekday: [], by_monthday: [], repeat_from: '', repeat_until: '',
}

export default function StuffForm({ topics = [], onSaved, onCancel }) {
  const [f, setF] = useState(empty)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const toggleIn = (k, v) =>
    set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v])

  const save = async (e) => {
    e.preventDefault()
    if (!f.title.trim()) return
    const payload = { ...f }
    // dọn các trường rỗng để không vi phạm ràng buộc DB
    for (const k of ['start_date', 'end_date', 'start_time', 'repeat_from', 'repeat_until'])
      if (!payload[k]) payload[k] = null
    if (payload.type !== 'habit') {
      payload.freq = null; payload.by_weekday = null; payload.by_monthday = null
      payload.repeat_from = null; payload.repeat_until = null
    }
    await createStuff(payload)
    setF(empty)
    onSaved?.()
  }

  return (
    <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
      <Row label="Loại">
        {['task', 'event', 'habit'].map((t) => (
          <button type="button" key={t}
                  className={`btn ${f.type === t ? 'primary' : ''}`}
                  onClick={() => set('type', t)}>{t}</button>
        ))}
      </Row>

      <input className="btn" style={{ textAlign: 'left', fontWeight: 400 }}
             placeholder="Tên việc…" value={f.title}
             onChange={(e) => set('title', e.target.value)} autoFocus />

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
            <input type="date" className="btn" value={f.start_date}
                   onChange={(e) => set('start_date', e.target.value)} />
          )}
          {f.date_mode === 'range' && (
            <Row label="Từ – đến">
              <input type="date" className="btn" value={f.start_date}
                     onChange={(e) => set('start_date', e.target.value)} />
              <input type="date" className="btn" value={f.end_date} min={f.start_date}
                     onChange={(e) => set('end_date', e.target.value)} />
            </Row>
          )}
          {f.date_mode === 'month' && (
            <input type="month" className="btn" value={f.month}
                   onChange={(e) => set('month', e.target.value)} />
          )}
          {f.type === 'event' && (
            <input type="time" className="btn" value={f.start_time}
                   onChange={(e) => set('start_time', e.target.value)} />
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
              <input className="btn" placeholder="vd: 5, 20, 32 (=cuối tháng)"
                     onChange={(e) => set('by_monthday',
                       e.target.value.split(',').map((s) => Number(s.trim()))
                         .filter((n) => n >= 1 && n <= 32))} />
            </Row>
          )}
          <Row label="Bắt đầu / kết thúc">
            <input type="date" className="btn" value={f.repeat_from}
                   onChange={(e) => set('repeat_from', e.target.value)} />
            <input type="date" className="btn" value={f.repeat_until}
                   onChange={(e) => set('repeat_until', e.target.value)} />
          </Row>
        </>
      )}

      <Row label="Chủ đề">
        <select className="btn" value={f.topic_id ?? ''}
                onChange={(e) => set('topic_id', e.target.value || null)}>
          <option value="">— không —</option>
          {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </Row>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" type="submit">Lưu</button>
        <button className="btn ghost" type="button" onClick={onCancel}>Huỷ</button>
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

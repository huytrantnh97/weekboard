import { useState } from 'react'
import {
  createTopic, updateTopic, archiveTopic, deleteTopic,
  createStuff, setDone,
} from '../lib/api'
import { dateText, horizons, sortStuff } from '../lib/dates'

/**
 * Topics/Goals to brainstorm.
 * Bấm một chip để mở ra: sửa tên, xem việc đã sinh ra từ topic đó,
 * và ô nhập nhanh để thêm việc mới thuộc topic.
 */
export default function Topics({ topics, stuff, onChanged }) {
  const [openId, setOpenId] = useState(null)
  const [draft, setDraft] = useState('')

  const add = async (e) => {
    e.preventDefault()
    const t = draft.trim()
    if (!t) return
    setDraft('')
    await createTopic(t)
    onChanged?.()
  }

  const open = topics.find((t) => t.id === openId)

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="topic-list">
        {topics.map((t) => {
          const n = stuff.filter((s) => s.topic_id === t.id).length
          return (
            <span key={t.id} className={`topic ${t.id === openId ? 'topic-on' : ''}`}>
              <button type="button" className="topic-label"
                      onClick={() => setOpenId(t.id === openId ? null : t.id)}>
                {t.title}
              </button>
              {n > 0 && <span className="topic-n">{n}</span>}
              {t.link && (
                <a className="topic-link" href={t.link}
                   target="_blank" rel="noopener noreferrer"
                   title={t.link} aria-label={`Mở link của ${t.title}`}
                   onClick={(e) => e.stopPropagation()}>↗</a>
              )}
            </span>
          )
        })}
      </div>

      <form onSubmit={add} style={{ display: 'flex', gap: 6 }}>
        <input className="field" style={{ flex: 1 }}
               placeholder="Thêm chủ đề / mục tiêu…"
               value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn" type="submit">Thêm</button>
      </form>

      {open && (
        <TopicPanel key={open.id} topic={open} stuff={stuff}
                    onChanged={onChanged} onClose={() => setOpenId(null)} />
      )}
    </div>
  )
}

function TopicPanel({ topic, stuff, onChanged, onClose }) {
  const [name, setName] = useState(topic.title)
  const [note, setNote] = useState(topic.note ?? '')
  const [link, setLink] = useState(topic.link ?? '')
  const [draft, setDraft] = useState('')
  const [type, setType] = useState('task')

  const items = sortStuff(stuff.filter((s) => s.topic_id === topic.id), horizons())

  const saveName = async () => {
    const t = name.trim()
    const unchanged = t === topic.title
      && note === (topic.note ?? '')
      && link.trim() === (topic.link ?? '')
    if (!t || unchanged) return
    await updateTopic(topic.id, {
      title: t, note: note || null, link: link.trim() || null,
    })
    onChanged?.()
  }

  const spawn = async (e) => {
    e.preventDefault()
    const t = draft.trim()
    if (!t) return
    setDraft('')
    await createStuff({
      type, title: t, topic_id: topic.id,
      date_mode: type === 'habit' ? 'none' : 'none',
      ...(type === 'habit'
        ? { freq: 'weekly', by_weekday: [1], repeat_from: new Date().toISOString().slice(0, 10) }
        : {}),
    })
    onChanged?.()
  }

  const remove = async () => {
    if (!confirm(`Xoá chủ đề "${topic.title}"? Các việc thuộc chủ đề này vẫn được giữ.`)) return
    await deleteTopic(topic.id)
    onClose()
    onChanged?.()
  }

  const archive = async () => {
    await archiveTopic(topic.id)
    onClose()
    onChanged?.()
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input className="field" style={{ flex: 1, fontWeight: 600 }}
               value={name} onChange={(e) => setName(e.target.value)}
               onBlur={saveName}
               onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
        <button className="btn ghost" onClick={onClose}>Đóng</button>
      </div>

      <textarea className="field" rows={2} placeholder="Ghi chú, câu hỏi cần nghĩ…"
                value={note} onChange={(e) => setNote(e.target.value)} onBlur={saveName} />

      <div style={{ display: 'flex', gap: 6 }}>
        <input type="url" className="field" placeholder="https://…"
               value={link} onChange={(e) => setLink(e.target.value)} onBlur={saveName} />
        {link.trim() && (
          <a className="btn ghost" href={link.trim()} target="_blank" rel="noopener noreferrer"
             title="Mở link" aria-label="Mở link" style={{ flex: '0 0 auto' }}>↗</a>
        )}
      </div>

      <div className="eyebrow">Đã nghĩ ra · {items.length}</div>
      {items.length === 0
        ? <div className="empty">Chưa có gì. Gõ vào ô dưới để bắt đầu.</div>
        : (
          <div style={{ display: 'grid', gap: 6 }}>
            {items.map((s) => (
              <label key={s.id} className="topic-item">
                <input type="checkbox" checked={s.status === 'done'}
                       onChange={async (e) => { await setDone(s.id, e.target.checked); onChanged?.() }} />
                <span style={{ textDecoration: s.status === 'done' ? 'line-through' : 'none' }}>
                  {s.title}
                </span>
                <span className="card-meta" style={{ marginLeft: 'auto' }}>
                  {s.type === 'habit' ? 'habit' : dateText(s) || 'chưa có ngày'}
                </span>
              </label>
            ))}
          </div>
        )}

      <form onSubmit={spawn} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <select className="field" style={{ width: 100 }}
                value={type} onChange={(e) => setType(e.target.value)}>
          <option value="task">task</option>
          <option value="event">event</option>
          <option value="habit">habit</option>
        </select>
        <input className="field" style={{ flex: 1, minWidth: 160 }}
               placeholder="Nghĩ ra việc gì thì gõ vào đây…"
               value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn" type="submit">Thêm</button>
      </form>

      <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--rule-soft)', paddingTop: 10 }}>
        <button className="btn ghost" onClick={archive}>Lưu trữ</button>
        <button className="btn ghost" onClick={remove}
                style={{ color: 'var(--danger)' }}>Xoá</button>
      </div>
    </div>
  )
}

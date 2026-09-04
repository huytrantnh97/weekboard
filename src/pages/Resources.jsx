import { useEffect, useMemo, useState } from 'react'
import {
  listResources, createResource, updateResource, deleteResource, listTopics,
} from '../lib/api'
import { PlusIcon, BackIcon } from '../components/Icons'
import ShareBox from '../components/ShareBox'

export default function Resources({ onBack, meId }) {
  const [items, setItems] = useState([])
  const [topics, setTopics] = useState([])
  const [editing, setEditing] = useState(undefined)   // undefined = đóng, null = thêm mới
  const [q, setQ] = useState('')

  const load = async () => {
    const [r, t] = await Promise.all([listResources(), listTopics()])
    setItems(r); setTopics(t)
  }
  useEffect(() => { load() }, [])

  const topicsById = useMemo(
    () => Object.fromEntries(topics.map((t) => [t.id, t])), [topics])

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return items
    return items.filter((r) =>
      [r.title, r.note, r.url, topicsById[r.topic_id]?.title]
        .filter(Boolean).some((v) => v.toLowerCase().includes(k)))
  }, [items, q, topicsById])

  const remove = async (r) => {
    if (!confirm(`Xoá "${r.title}"?\n\nKhông thể hoàn tác.`)) return
    await deleteResource(r.id)
    load()
  }

  return (
    <div className="app">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1>Resource</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn icon-btn" onClick={() => setEditing(null)}
                  title="Thêm resource" aria-label="Thêm resource"><PlusIcon /></button>
          <button className="btn ghost icon-btn" onClick={onBack}
                  title="Quay lại" aria-label="Quay lại"><BackIcon /></button>
        </div>
      </header>

      <input className="field" style={{ marginTop: 16 }} placeholder="Tìm…"
             value={q} onChange={(e) => setQ(e.target.value)} />

      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        {shown.length === 0 && (
          <div className="empty">
            {items.length === 0 ? 'Chưa có resource nào.' : 'Không tìm thấy.'}
          </div>
        )}
        {shown.map((r) => {
          // meId chưa truyền xuống thì coi như của mình, tránh khoá nhầm nút
          const isOwner = !meId || r.user_id === meId
          return (
            <div key={r.id} className="resource">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="resource-title"
                          onClick={() => setEditing(r)}>{r.title}</button>
                  {!isOwner && <span className="card-meta">👥 được chia sẻ</span>}
                  {r.topic_id && topicsById[r.topic_id] && (
                    <span className="topic-group-label" style={{ margin: 0 }}>
                      {topicsById[r.topic_id].title}
                    </span>
                  )}
                </div>
                {r.note && <div className="card-meta" style={{ marginTop: 2 }}>{r.note}</div>}
                {r.url && <div className="resource-url">{r.url}</div>}
              </div>

              {r.url && (
                <a className="btn ghost" href={r.url} target="_blank" rel="noopener noreferrer"
                   title="Mở link" aria-label="Mở link">↗</a>
              )}
              {isOwner && (
                <button className="btn ghost" onClick={() => remove(r)}
                        style={{ color: 'var(--danger)' }} aria-label="Xoá">×</button>
              )}
            </div>
          )
        })}
      </div>

      {editing !== undefined && (
        <ResourceForm item={editing} topics={topics} meId={meId}
                      onClose={() => setEditing(undefined)}
                      onSaved={() => { setEditing(undefined); load() }} />
      )}
    </div>
  )
}

function ResourceForm({ item, topics, meId, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    title: item?.title ?? '',
    url: item?.url ?? '',
    note: item?.note ?? '',
    topic_id: item?.topic_id ?? null,
  }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  // Resource mới thì mình là chủ. Đang sửa: chỉ chủ mới thấy phần chia sẻ.
  const isOwner = !item || !meId || item.user_id === meId

  const save = async (e) => {
    e.preventDefault()
    if (!f.title.trim()) return
    setBusy(true); setErr(null)
    try {
      const payload = {
        title: f.title.trim(),
        url: f.url.trim() || null,
        note: f.note.trim() || null,
        topic_id: f.topic_id || null,
      }
      if (item) await updateResource(item.id, payload)
      else await createResource(payload)
      onSaved()
    } catch (e2) {
      setErr(e2.message ?? String(e2))
      setBusy(false)
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <h2>{item ? 'Sửa resource' : 'Thêm resource'}</h2>
            <button className="btn ghost" type="button" style={{ marginLeft: 'auto' }}
                    onClick={onClose}>Đóng</button>
          </div>

          <input className="field" autoFocus placeholder="Tên resource…"
                 value={f.title} onChange={(e) => set('title', e.target.value)} />

          <div style={{ display: 'flex', gap: 6 }}>
            <input type="url" className="field" placeholder="https://…"
                   value={f.url} onChange={(e) => set('url', e.target.value)} />
            {f.url && (
              <a className="btn ghost" href={f.url} target="_blank" rel="noopener noreferrer"
                 style={{ flex: '0 0 auto' }} aria-label="Mở link">↗</a>
            )}
          </div>

          <textarea className="field" rows={2} placeholder="Ghi chú…"
                    value={f.note} onChange={(e) => set('note', e.target.value)} />

          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Chủ đề</div>
            <select className="field" value={f.topic_id ?? ''}
                    onChange={(e) => set('topic_id', e.target.value || null)}>
              <option value="">— không —</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          {item && !isOwner && (
            <p className="card-meta">Resource này được người khác chia sẻ với bạn.</p>
          )}

          {item && isOwner && (
            <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 12 }}>
              <ShareBox id={item.id} kind="resource" />
            </div>
          )}

          {err && <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{err}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Lưu'}
            </button>
            <button className="btn ghost" type="button" onClick={onClose}>Huỷ</button>
          </div>
        </form>
      </div>
    </div>
  )
}

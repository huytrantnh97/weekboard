import { useEffect, useMemo, useState } from 'react'
import {
  listStuff, listTopics, listArchivedTopics, setDone, restoreTopic, deleteTopic,
} from '../lib/api'
import GroupedItems from '../components/GroupedItems'
import StuffForm from '../components/StuffForm'

/**
 * "Đã xong" — nơi xem lại:
 *  - task/event đã tick hoàn thành (status = 'done')
 *  - topic/goal đã lưu trữ (coi như đã xong / gác lại)
 * Cả hai đều khôi phục được: bỏ tick lại, hoặc "Khôi phục" topic.
 */
export default function Done({ onBack }) {
  const [stuff, setStuff] = useState([])
  const [topics, setTopics] = useState([])       // topic đang mở, cho dropdown trong form sửa
  const [archived, setArchived] = useState([])
  const [editing, setEditing] = useState(undefined)

  const load = async () => {
    const [s, t, a] = await Promise.all([listStuff(), listTopics(), listArchivedTopics()])
    setStuff(s); setTopics(t); setArchived(a)
  }
  useEffect(() => { load() }, [])

  const doneStuff = useMemo(
    () => stuff.filter((s) => s.status === 'done')
      .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')),
    [stuff])

  const topicsById = useMemo(
    () => Object.fromEntries(topics.map((t) => [t.id, t])), [topics])

  const toggle = async (item, on) => { await setDone(item.id, on); load() }
  const closeEditor = () => setEditing(undefined)
  const afterWrite = () => { closeEditor(); load() }

  const restore = async (id) => { await restoreTopic(id); load() }
  const removeTopic = async (t) => {
    if (!confirm(`Xoá vĩnh viễn chủ đề "${t.title}"?\n\nKhông thể hoàn tác.`)) return
    await deleteTopic(t.id)
    load()
  }

  return (
    <div className="app">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1>Đã xong</h1>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onBack}>
          Quay lại
        </button>
      </header>

      <section className="section">
        <div className="section-head">
          <h2>Việc đã xong</h2>
          <span className="count">{doneStuff.length}</span>
        </div>
        <div style={{ marginTop: 12 }}>
          {doneStuff.length === 0
            ? <div className="empty">Chưa xong việc gì.</div>
            : <GroupedItems items={doneStuff} topicsById={topicsById}
                            onToggle={toggle} onOpen={setEditing} />}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Chủ đề / mục tiêu đã xong</h2>
          <span className="count">{archived.length}</span>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {archived.length === 0
            ? <div className="empty">Chưa lưu trữ chủ đề nào.</div>
            : archived.map((t) => (
              <div key={t.id} className="archived-topic">
                <span>{t.title}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button className="btn ghost" onClick={() => restore(t.id)}>Khôi phục</button>
                  <button className="btn ghost" onClick={() => removeTopic(t)}
                          style={{ color: 'var(--danger)' }}>Xoá</button>
                </div>
              </div>
            ))}
        </div>
      </section>

      {editing !== undefined && (
        <div className="modal-bg" onClick={closeEditor}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <StuffForm item={editing} topics={topics}
                       onSaved={afterWrite} onDeleted={afterWrite} onCancel={closeEditor} />
          </div>
        </div>
      )}
    </div>
  )
}

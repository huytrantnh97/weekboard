import { useEffect, useMemo, useState } from 'react'
import {
  listStuff, listTopics, listArchivedTopics, setDone, restoreTopic, deleteTopic,
  listAllJournalUpTo, getSettings, saveSettings,
} from '../lib/api'
import { iso } from '../lib/dates'
import GroupedItems from '../components/GroupedItems'
import StuffForm from '../components/StuffForm'

/**
 * "Đã xong" — nơi xem lại:
 *  - task/event đã tick hoàn thành (status = 'done')
 *  - topic/goal đã lưu trữ (coi như đã xong / gác lại)
 * Cả hai đều khôi phục được: bỏ tick lại, hoặc "Khôi phục" topic.
 */
export default function Done({ onBack, meId }) {
  const [stuff, setStuff] = useState([])
  const [topics, setTopics] = useState([])       // topic đang mở, cho dropdown trong form sửa
  const [archived, setArchived] = useState([])
  const [editing, setEditing] = useState(undefined)
  const [exportBusy, setExportBusy] = useState(false)
  const [exportErr, setExportErr] = useState(null)
  const [tg, setTg] = useState({ telegram_chat_id: '', notify_events: true, notify_daily: true })
  const [tgMsg, setTgMsg] = useState(null)

  const load = async () => {
    const [s, t, a, cfg] = await Promise.all([
      listStuff(), listTopics(), listArchivedTopics(), getSettings(),
    ])
    setStuff(s); setTopics(t); setArchived(a)
    if (cfg) {
      setTg({
        telegram_chat_id: cfg.telegram_chat_id ?? '',
        notify_events: cfg.notify_events,
        notify_daily: cfg.notify_daily,
      })
    }
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

  const exportJournalPdf = async () => {
    setExportBusy(true)
    setExportErr(null)
    try {
      const entries = await listAllJournalUpTo(iso(new Date()))
      if (entries.length === 0) {
        setExportErr('Chưa có ghi chú nhật ký nào.')
        return
      }
      // Tách riêng, chỉ tải jsPDF + font khi thật sự bấm xuất — tránh làm
      // nặng bundle chính cho mọi lần mở app.
      const { buildJournalPdf } = await import('../lib/exportJournalPdf')
      const doc = buildJournalPdf(entries)
      doc.save(`nhat-ky-${iso(new Date())}.pdf`)
    } catch (e) {
      setExportErr(e.message ?? String(e))
    } finally {
      setExportBusy(false)
    }
  }

  const saveTg = async () => {
    setTgMsg(null)
    try {
      await saveSettings({
        telegram_chat_id: tg.telegram_chat_id.trim() || null,
        notify_events: tg.notify_events,
        notify_daily: tg.notify_daily,
      })
      setTgMsg('Đã lưu.')
    } catch (e) {
      setTgMsg(e.message ?? String(e))
    }
  }

  const restore = async (id) => { await restoreTopic(id); load() }
  const removeTopic = async (t) => {
    if (!confirm(`Xoá vĩnh viễn chủ đề "${t.title}"?\n\nKhông thể hoàn tác.`)) return
    await deleteTopic(t.id)
    load()
  }

  return (
    <div className="app">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1>Done</h1>
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
          <h2>Nhật ký</h2>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={exportJournalPdf} disabled={exportBusy}>
            {exportBusy ? 'Đang tạo PDF…' : 'Xuất PDF tất cả nhật ký'}
          </button>
          {exportErr && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{exportErr}</p>
          )}
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

      <section className="section">
        <div className="section-head">
          <h2>Thông báo Telegram</h2>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 10, maxWidth: 420 }}>
          <input className="field" placeholder="Telegram chat ID (vd: 123456789)"
                 value={tg.telegram_chat_id}
                 onChange={(e) => setTg((p) => ({ ...p, telegram_chat_id: e.target.value }))} />
          <label className="tg-check">
            <input type="checkbox" checked={tg.notify_events}
                   onChange={(e) => setTg((p) => ({ ...p, notify_events: e.target.checked }))} />
            <span>Báo khi event tới giờ</span>
          </label>
          <label className="tg-check">
            <input type="checkbox" checked={tg.notify_daily}
                   onChange={(e) => setTg((p) => ({ ...p, notify_daily: e.target.checked }))} />
            <span>Tổng hợp việc chưa xong lúc 20:00</span>
          </label>
          <div>
            <button className="btn primary" onClick={saveTg}>Lưu</button>
            {tgMsg && <span className="card-meta" style={{ marginLeft: 10 }}>{tgMsg}</span>}
          </div>
          <p className="card-meta">
            Lấy chat ID: mở Telegram, nhắn bất kỳ cho bot của bạn, rồi nhắn cho
            @userinfobot để lấy số ID của mình.
          </p>
        </div>
      </section>

      {editing !== undefined && (
        <div className="modal-bg" onClick={closeEditor}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <StuffForm item={editing} topics={topics} meId={meId}
                       onSaved={afterWrite} onDeleted={afterWrite} onCancel={closeEditor} />
          </div>
        </div>
      )}
    </div>
  )
}

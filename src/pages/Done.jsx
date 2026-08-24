import { useEffect, useMemo, useState } from 'react'
import {
  listStuff, listTopics, listArchivedTopics, setDone, restoreTopic, deleteTopic,
  listJournalBefore, deleteJournalEntries,
  listReflections, deleteReflections,
  getSettings, saveSettings,
} from '../lib/api'
import { iso, horizons } from '../lib/dates'
import { format, parseISO } from 'date-fns'
import MiniMarkdown from '../components/MiniMarkdown'
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
  const [reflections, setReflections] = useState([])
  const [openReflect, setOpenReflect] = useState(null)

  const load = async () => {
    const [s, t, a, cfg, refl] = await Promise.all([
      listStuff(), listTopics(), listArchivedTopics(), getSettings(), listReflections(),
    ])
    setStuff(s); setTopics(t); setArchived(a)
    // Chỉ hiện báo cáo của các tuần ĐÃ QUA; tuần hiện tại vẫn xem ở nút Reflect
    const thisWeek = iso(horizons().thisStart)
    setReflections(refl.filter((r) => r.week_start < thisWeek)
      .sort((a2, b2) => b2.week_start.localeCompare(a2.week_start)))
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

  /**
   * Xuất PDF rồi XOÁ khỏi database. Thứ tự bắt buộc: tạo file và gọi save()
   * thành công trước, xoá sau — nếu tạo PDF lỗi thì dữ liệu vẫn còn nguyên.
   */
  const exportAndPurge = async (kind) => {
    const isJournal = kind === 'journal'
    setExportBusy(kind)
    setExportErr(null)
    try {
      const rows = isJournal
        ? await listJournalBefore(iso(new Date()))   // chỉ các ngày đã qua
        : reflections
      if (rows.length === 0) {
        setExportErr(isJournal ? 'Chưa có ghi chú của ngày đã qua.' : 'Chưa có báo cáo nào.')
        return
      }

      const what = isJournal ? `${rows.length} ghi chú` : `${rows.length} báo cáo`
      if (!confirm(
        `Xuất ${what} ra PDF và XOÁ khỏi database?\n\n`
        + 'Sau khi tải, dữ liệu này sẽ bị xoá vĩnh viễn khỏi app — '
        + 'chỉ còn trong file PDF trên máy bạn. Hãy chắc bạn lưu file lại.',
      )) return

      // Tách riêng, chỉ tải jsPDF + font khi thật sự bấm xuất.
      const mod = await import('../lib/exportJournalPdf')
      const doc = isJournal ? mod.buildJournalPdf(rows) : mod.buildReflectionsPdf(rows)
      const stamp = iso(new Date())
      doc.save(isJournal ? `nhat-ky-${stamp}.pdf` : `reflect-${stamp}.pdf`)

      if (isJournal) await deleteJournalEntries(rows.map((r) => r.entry_date))
      else await deleteReflections(rows.map((r) => r.week_start))

      setOpenReflect(null)
      await load()
      setExportErr(`Đã tải PDF và xoá ${what} khỏi database.`)
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
          <button className="btn" onClick={() => exportAndPurge('journal')}
                  disabled={!!exportBusy}>
            {exportBusy === 'journal' ? 'Đang tạo PDF…' : 'Xuất PDF các ngày đã qua'}
          </button>
          <p className="card-meta" style={{ marginTop: 6 }}>
            Xuất xong sẽ xoá khỏi database. Ghi chú của hôm nay được giữ lại.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Báo cáo Reflect</h2>
          <span className="count">{reflections.length}</span>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {reflections.length === 0
            ? <div className="empty">Chưa có báo cáo của tuần đã qua.</div>
            : (
              <>
                {reflections.map((r) => (
                  <div key={r.week_start} className="archived-topic"
                       style={{ display: 'block' }}>
                    <button type="button" className="resource-title"
                            onClick={() => setOpenReflect(
                              openReflect === r.week_start ? null : r.week_start)}>
                      Tuần {format(parseISO(r.week_start), 'd/M/yyyy')}
                      {openReflect === r.week_start ? ' ▾' : ' ▸'}
                    </button>
                    {openReflect === r.week_start && (
                      <div style={{ marginTop: 8 }}>
                        <MiniMarkdown text={r.content} />
                      </div>
                    )}
                  </div>
                ))}
                <div>
                  <button className="btn" onClick={() => exportAndPurge('reflect')}
                          disabled={!!exportBusy}>
                    {exportBusy === 'reflect' ? 'Đang tạo PDF…' : 'Xuất PDF tất cả báo cáo'}
                  </button>
                  <p className="card-meta" style={{ marginTop: 6 }}>
                    Xuất xong sẽ xoá khỏi database.
                  </p>
                </div>
              </>
            )}
        </div>
        {exportErr && (
          <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{exportErr}</p>
        )}
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

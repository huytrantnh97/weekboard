import { useEffect, useMemo, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors,
         useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core'
import { format, isWithinInterval } from 'date-fns'
import {
  listStuff, listHabitLogs, moveToDay, markWeekPlanned, listJournal, createStuff,
  updateStuff, listTopics, supabase,
} from '../lib/api'
import { horizons, buildWeek, daysOf, iso, parse, dateText } from '../lib/dates'
import WeekBoard from '../components/WeekBoard'
import StuffCard from '../components/StuffCard'
import ReflectModal from '../components/ReflectModal'
import StuffForm from '../components/StuffForm'
import { ReflectIcon, BackIcon } from '../components/Icons'

export default function Planning({ onDone }) {
  const h = useMemo(() => horizons(), [])
  const days = useMemo(() => daysOf(h.nextStart), [h])
  const [stuff, setStuff] = useState([])
  const [logs, setLogs] = useState([])
  const [journal, setJournal] = useState({})
  const [dragging, setDragging] = useState(null)
  const [reflectOpen, setReflectOpen] = useState(false)
  const [topics, setTopics] = useState([])
  const [meId, setMeId] = useState(null)
  const [editing, setEditing] = useState(undefined)   // undefined = đóng

  const load = async () => {
    const [s, l, j, t, sess] = await Promise.all([
      listStuff(), listHabitLogs(h.nextStart, h.nextEnd), listJournal(iso(h.nextStart), iso(h.nextEnd)),
      listTopics(), supabase.auth.getSession(),
    ])
    setStuff(s); setLogs(l); setTopics(t)
    // StuffForm cần biết ai là chủ để quyết định hiện nút Xoá / Chia sẻ
    setMeId(sess?.data?.session?.user?.id ?? null)
    setJournal(Object.fromEntries(j.map((e) => [e.entry_date, e.content])))
  }
  useEffect(() => { load() }, [])

  // Việc con chỉ hiện bên trong việc cha (Focus mode), không xếp lịch riêng
  const roots = useMemo(() => stuff.filter((s) => !s.parent_id), [stuff])

  const week = useMemo(() => buildWeek(h.nextStart, roots, logs), [roots, logs, h])

  /** Việc đã trễ hạn — cần được xếp lại chứ không thể bỏ quên. */
  const isOverdue = (s) => s.status === 'open' && s.type !== 'habit'
    && s.end_date && parse(s.end_date) < h.today

  /**
   * Hàng chờ: việc chưa có ngày cụ thể liên quan tới tuần sau, CỘNG THÊM
   * việc quá hạn. Việc quá hạn thường đã có planned_date ở quá khứ nên trước
   * đây bị loại ngay từ dòng đầu và không bao giờ xuất hiện để xếp lại.
   */
  const pool = useMemo(() => roots.filter((s) => {
    if (s.type === 'habit' || s.status === 'done') return false
    if (isOverdue(s)) return true
    if (s.planned_date) return false
    if (s.date_mode === 'none') return true
    // range / month có giao với tuần sau
    return parse(s.start_date) <= h.nextEnd && parse(s.end_date) >= h.nextStart
  }), [roots, h])

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },   // để nút tick vẫn bấm được
  }))

  const onDragEnd = async ({ active, over }) => {
    setDragging(null)
    if (!over) return
    const item = stuff.find((s) => s.id === active.id)
    if (!item) return

    const target = over.id === 'pool' ? null : parse(over.id)
    const overdue = isOverdue(item)

    // Việc quá hạn được kéo tự do: hạn cũ đã mất ý nghĩa, mục đích lúc này
    // chính là dời nó sang ngày mới.
    if (!overdue) {
      // Chặn kéo ra ngoài khoảng cho phép
      if (target && item.date_mode !== 'none') {
        const inRange = isWithinInterval(target,
          { start: parse(item.start_date), end: parse(item.end_date) })
        if (!inRange) {
          alert(`"${item.title}" chỉ nằm trong ${dateText(item)}.`)
          return
        }
      }
      if (item.date_mode === 'single') return    // ngày cố định, không kéo được
    }

    // cập nhật lạc quan rồi ghi DB
    setStuff((prev) => prev.map((s) =>
      s.id === item.id ? { ...s, planned_date: target ? iso(target) : null } : s))

    if (overdue && target) {
      // Dời hẳn hạn sang ngày mới. Chỉ đổi planned_date là chưa đủ — end_date
      // vẫn ở quá khứ nên nó sẽ tiếp tục nằm ở mục "Quá hạn" ngoài màn hình chính.
      const d = iso(target)
      const patch = { planned_date: d, position: Date.now() }
      if (item.date_mode === 'single') { patch.start_date = d; patch.end_date = d }
      else if (item.end_date && item.end_date < d) patch.end_date = d
      await updateStuff(item.id, patch)
    } else {
      await moveToDay(item.id, target, Date.now())
    }
    load()
  }

  const quickAdd = async (dateKey, title) => {
    await createStuff({ type: 'task', title, date_mode: 'single', start_date: dateKey })
    load()
  }

  /** Bấm vào thẻ để sửa. Kéo thả vẫn chạy bình thường: cảm biến kéo chỉ
   *  kích hoạt sau khi con trỏ đi được 6px, nên chạm-rồi-nhả là click. */
  const openEditor = (item) => setEditing(stuff.find((s) => s.id === item.id) ?? item)
  const closeEditor = () => setEditing(undefined)
  const afterWrite = () => { closeEditor(); load() }

  const finish = async () => { await markWeekPlanned(h.nextStart); onDone?.() }

  return (
    <div className="app">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">
            {format(h.nextStart, 'd/M')} – {format(h.nextEnd, 'd/M/yyyy')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h1>Lập kế hoạch tuần sau</h1>
            <button className="btn ghost icon-btn sm" title="Reflect — báo cáo tuần này"
                    aria-label="Xem báo cáo Reflect tuần này"
                    onClick={() => setReflectOpen(true)}>
              <ReflectIcon />
            </button>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn ghost icon-btn" onClick={onDone}
                  title="Quay lại" aria-label="Quay lại"><BackIcon /></button>
          <button className="btn primary" onClick={finish}>Xong, chốt tuần</button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setDragging(stuff.find((s) => s.id === active.id))}
        onDragEnd={onDragEnd}
      >
        <div className="plan-grid" style={{ marginTop: 16 }}>
          <Pool items={pool} isOverdue={isOverdue} onOpen={openEditor} />
          <WeekBoard
            days={week}
            today={h.nextStart}                 /* tuần sau: không ngày nào "đã qua" */
            renderDay={(d) => <DayDrop day={d} onOpen={openEditor} />}
            journalByDate={journal}
            onJournalChange={load}
            onQuickAdd={quickAdd}
          />
        </div>

        <DragOverlay>
          {dragging && <StuffCard item={dragging} />}
        </DragOverlay>
      </DndContext>

      {editing !== undefined && (
        <div className="modal-bg" onClick={closeEditor}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <StuffForm item={editing} topics={topics} meId={meId}
                       onSaved={afterWrite} onDeleted={afterWrite} onCancel={closeEditor} />
          </div>
        </div>
      )}

      {reflectOpen && (
        // Đang lập kế hoạch cho tuần sau, nên nhìn lại tuần vừa chạy xong.
        <ReflectModal weekStart={h.thisStart} label="tuần này" canGenerate
                      onClose={() => setReflectOpen(false)} />
      )}
    </div>
  )
}


function Pool({ items, isOverdue, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' })
  const lateCount = items.filter(isOverdue).length
  return (
    <div ref={setNodeRef} className={`pool ${isOver ? 'drop-active' : ''}`}>
      <div className="eyebrow">
        Chưa xếp ngày · {items.length}
        {lateCount > 0 && ` · trong đó ${lateCount} quá hạn`}
      </div>
      <div className="pool-items">
        {items.map((s) => (
          <Draggable key={s.id} item={s} overdue={isOverdue(s)} onOpen={onOpen} />
        ))}
        {items.length === 0 && <div className="empty">Đã xếp hết. Đẹp.</div>}
      </div>
    </div>
  )
}

function DayDrop({ day, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: day.key })
  return (
    <div ref={setNodeRef} className={`day-items ${isOver ? 'drop-active' : ''}`}
         style={{ minHeight: 60, borderRadius: 6 }}>
      {/* Habit và việc có ngày cố định thì không kéo được */}
      {day.items.map((it) => (
        it.type === 'habit' || it.date_mode === 'single'
          ? <StuffCard key={it.key} item={it} onOpen={onOpen} />
          : <Draggable key={it.key} item={it} onOpen={onOpen} />
      ))}
    </div>
  )
}

function Draggable({ item, overdue = false, onOpen }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })
  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.35 : 1 }}>
      <StuffCard item={item} overdue={overdue} onOpen={onOpen}
                 dragProps={{ ...listeners, ...attributes }} />
    </div>
  )
}

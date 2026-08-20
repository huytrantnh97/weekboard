import { useEffect, useMemo, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors,
         useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core'
import { format, isWithinInterval } from 'date-fns'
import { listStuff, listHabitLogs, moveToDay, markWeekPlanned } from '../lib/api'
import { horizons, buildWeek, daysOf, iso, parse, dateText } from '../lib/dates'
import WeekBoard from '../components/WeekBoard'
import StuffCard from '../components/StuffCard'

export default function Planning({ onDone }) {
  const h = useMemo(() => horizons(), [])
  const days = useMemo(() => daysOf(h.nextStart), [h])
  const [stuff, setStuff] = useState([])
  const [logs, setLogs] = useState([])
  const [dragging, setDragging] = useState(null)

  const load = async () => {
    const [s, l] = await Promise.all([listStuff(), listHabitLogs(h.nextStart, h.nextEnd)])
    setStuff(s); setLogs(l)
  }
  useEffect(() => { load() }, [])

  const week = useMemo(() => buildWeek(h.nextStart, stuff, logs), [stuff, logs, h])

  /** Hàng chờ: việc chưa có ngày cụ thể nhưng liên quan tới tuần sau. */
  const pool = useMemo(() => stuff.filter((s) => {
    if (s.type === 'habit' || s.status === 'done' || s.planned_date) return false
    if (s.date_mode === 'none') return true
    // range / month có giao với tuần sau
    return parse(s.start_date) <= h.nextEnd && parse(s.end_date) >= h.nextStart
  }), [stuff, h])

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },   // để nút tick vẫn bấm được
  }))

  const onDragEnd = async ({ active, over }) => {
    setDragging(null)
    if (!over) return
    const item = stuff.find((s) => s.id === active.id)
    if (!item) return

    const target = over.id === 'pool' ? null : parse(over.id)

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

    // cập nhật lạc quan rồi ghi DB
    setStuff((prev) => prev.map((s) =>
      s.id === item.id ? { ...s, planned_date: target ? iso(target) : null } : s))
    await moveToDay(item.id, target, Date.now())
    load()
  }

  const finish = async () => { await markWeekPlanned(h.nextStart); onDone?.() }

  return (
    <div className="app">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">
            {format(h.nextStart, 'd/M')} – {format(h.nextEnd, 'd/M/yyyy')}
          </div>
          <h1>Lập kế hoạch tuần sau</h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={onDone}>Quay lại</button>
          <button className="btn primary" onClick={finish}>Xong, chốt tuần</button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setDragging(stuff.find((s) => s.id === active.id))}
        onDragEnd={onDragEnd}
      >
        <div className="plan-grid" style={{ marginTop: 16 }}>
          <Pool items={pool} />
          <div>
            <WeekBoard
              days={week}
              today={h.nextStart}                 /* tuần sau: không ngày nào "đã qua" */
              renderDay={(d) => <DayDrop day={d} />}
            />
          </div>
        </div>

        <DragOverlay>
          {dragging && <StuffCard item={dragging} />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function Pool({ items }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' })
  return (
    <div ref={setNodeRef} className={`pool ${isOver ? 'drop-active' : ''}`}>
      <div className="eyebrow">Chưa xếp ngày · {items.length}</div>
      {items.map((s) => <Draggable key={s.id} item={s} />)}
      {items.length === 0 && <div className="empty">Đã xếp hết. Đẹp.</div>}
    </div>
  )
}

function DayDrop({ day }) {
  const { setNodeRef, isOver } = useDroppable({ id: day.key })
  return (
    <div ref={setNodeRef} className={`day-items ${isOver ? 'drop-active' : ''}`}
         style={{ minHeight: 60, borderRadius: 6 }}>
      {/* Habit và việc có ngày cố định thì không kéo được */}
      {day.items.map((it) => (
        it.type === 'habit' || it.date_mode === 'single'
          ? <StuffCard key={it.key} item={it} />
          : <Draggable key={it.key} item={it} />
      ))}
    </div>
  )
}

function Draggable({ item }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })
  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.35 : 1 }}>
      <StuffCard item={item} dragProps={{ ...listeners, ...attributes }} />
    </div>
  )
}

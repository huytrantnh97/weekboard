import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { DndContext, PointerSensor, useSensor, useSensors,
         useDroppable, DragOverlay } from '@dnd-kit/core'
import {
  listStuff, listTopics, listHabitLogs, setDone, toggleHabitLog, isWeekPlanned,
  createStuff, listJournal, updateStuff,
} from '../lib/api'
import {
  horizons, buildWeek, bucketOf, isOverdue, sortStuff, iso, reflectWeek,
} from '../lib/dates'
import WeekBoard from '../components/WeekBoard'
import StuffCard from '../components/StuffCard'
import GroupedItems from '../components/GroupedItems'
import Topics from '../components/Topics'
import StuffForm from '../components/StuffForm'
import ReflectModal from '../components/ReflectModal'
import SearchModal from '../components/SearchModal'
import {
  SearchIcon, PlusIcon, PlanIcon, CheckIcon, LibraryIcon, ReflectIcon,
} from '../components/Icons'
import SettingsMenu from '../components/SettingsMenu'
import FocusMode from '../components/FocusMode'

const TITLES = {
  next_week:  'Next week',
  in_a_month: 'In a month',
  later:      'In more than a month',
  no_date:    'No date',
}

export default function Dashboard({ onOpenPlanning, onOpenDone, onOpenResources, onSignOut, meId }) {
  const [editing, setEditing] = useState(undefined)   // undefined = đóng, null = thêm mới
  const [reflectOpen, setReflectOpen] = useState(false)
  // Tính lúc mở modal, không phải lúc dựng trang — nếu app mở suốt cả ngày
  // Chủ nhật thì mốc 20:00 vẫn được nhận đúng.
  const [reflectAt, setReflectAt] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [stuff, setStuff] = useState([])
  const [topics, setTopics] = useState([])
  const [logs, setLogs] = useState([])
  const [planned, setPlanned] = useState(true)
  const [journal, setJournal] = useState({})
  const [dragging, setDragging] = useState(null)
  const [focusOpen, setFocusOpen] = useState(false)
  const h = useMemo(() => horizons(), [])

  const load = async () => {
    const [s, t, l, p, j] = await Promise.all([
      listStuff(), listTopics(),
      listHabitLogs(h.thisStart, h.nextEnd),
      isWeekPlanned(h.nextStart),
      listJournal(iso(h.thisStart), iso(h.thisEnd)),
    ])
    setStuff(s); setTopics(t); setLogs(l); setPlanned(p)
    setJournal(Object.fromEntries(j.map((e) => [e.entry_date, e.content])))
  }
  useEffect(() => { load() }, [])

  // Việc con (parent_id) chỉ hiện bên trong việc cha ở Focus mode,
  // không lẫn vào lưới tuần và các mục bên dưới.
  const roots = useMemo(() => stuff.filter((s) => !s.parent_id), [stuff])

  const week = useMemo(() => buildWeek(h.thisStart, roots, logs), [roots, logs, h])
  const topicsById = useMemo(() => Object.fromEntries(topics.map((t) => [t.id, t])), [topics])

  // Các nhóm còn lại: bỏ habit (habit chỉ hiện trong lưới tuần) và bỏ việc đã xong
  const groups = useMemo(() => {
    const g = { next_week: [], in_a_month: [], later: [], no_date: [] }
    for (const s of roots) {
      if (s.type === 'habit' || s.status === 'done') continue
      const b = bucketOf(s, h)
      if (g[b]) g[b].push(s)
    }
    for (const k of Object.keys(g)) g[k] = sortStuff(g[k], h)
    return g
  }, [roots, h])

  const overdue = useMemo(
    () => sortStuff(roots.filter((s) => s.type !== 'habit' && isOverdue(s, h)), h),
    [roots, h])

  /**
   * Việc thuộc về tuần này nhưng CHƯA được xếp vào ngày cụ thể — thường do
   * quên lập kế hoạch hôm Chủ nhật. Trước đây nhóm 'this_week' không có chỗ
   * hiển thị nên những việc này biến mất khỏi màn hình.
   * Việc quá hạn đã có mục riêng nên không lặp lại ở đây.
   */
  const unscheduled = useMemo(
    () => sortStuff(roots.filter((s) =>
      s.type !== 'habit' && s.status === 'open' && !s.planned_date
      && bucketOf(s, h) === 'this_week' && !isOverdue(s, h)), h),
    [roots, h])

  const toggle = async (item, on) => {
    if (item.type === 'habit') await toggleHabitLog(item.id, item.occurrence_date, on)
    else await setDone(item.id, on)
    load()
  }

  /** Mở form sửa. Habit trong lưới tuần → sửa quy tắc lặp của habit gốc. */
  const openEditor = (item) => setEditing(stuff.find((s) => s.id === item.id) ?? item)

  const quickAdd = async (dateKey, title) => {
    await createStuff({ type: 'task', title, date_mode: 'single', start_date: dateKey })
    load()
  }

  const closeEditor = () => setEditing(undefined)
  const afterWrite = () => { closeEditor(); load() }

  // Ngưỡng 6px: chạm-rồi-nhả vẫn là click (mở form sửa), rê mới là kéo.
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }))

  /**
   * Kéo một việc vào ô ngày trong lưới tuần = dời hẳn nó sang ngày đó.
   * Không chỉ đặt planned_date: với việc có ngày cụ thể hoặc đã quá hạn,
   * start/end vẫn nằm ở chỗ cũ thì nó sẽ tiếp tục bị tính là quá hạn.
   */
  const onDragEnd = async ({ active, over }) => {
    setDragging(null)
    if (!over) return
    const item = stuff.find((s) => s.id === active.id)
    if (!item || item.type === 'habit') return

    const d = over.id                      // key của ô ngày, dạng 'yyyy-MM-dd'
    if (d === item.planned_date) return

    const patch = { planned_date: d, position: Date.now() }
    if (item.date_mode === 'single') {
      patch.start_date = d; patch.end_date = d
    } else if (item.date_mode === 'range' || item.date_mode === 'month') {
      // Nới khoảng cho chứa ngày mới, nếu không trigger của DB sẽ từ chối
      if (item.start_date > d) patch.start_date = d
      if (item.end_date < d) patch.end_date = d
    }

    setStuff((prev) => prev.map((x) =>
      x.id === item.id ? { ...x, ...patch } : x))
    await updateStuff(item.id, patch)
    load()
  }

  const isSunday = new Date().getDay() === 0

  return (
    <div className="app">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Tuần {format(h.thisStart, 'd/M')} – {format(h.thisEnd, 'd/M/yyyy')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h1>This week</h1>
            <button className="btn ghost icon-btn sm" title="Reflect — báo cáo tuần trước"
                    aria-label="Xem báo cáo Reflect tuần trước"
                    onClick={() => { setReflectAt(reflectWeek()); setReflectOpen(true) }}>
              <ReflectIcon />
            </button>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn ghost icon-btn" title="Tìm kiếm" aria-label="Tìm kiếm"
                  onClick={() => setSearchOpen(true)}>
            <SearchIcon />
          </button>
          <button className="btn icon-btn" title="Thêm việc mới" aria-label="Thêm việc mới"
                  onClick={() => setEditing(null)}>
            <PlusIcon />
          </button>
          <button
            className={`btn icon-btn ${!planned && isSunday ? 'glow' : 'primary'}`}
            title="Lập kế hoạch tuần sau" aria-label="Lập kế hoạch tuần sau"
            onClick={onOpenPlanning}>
            <PlanIcon />
          </button>
          <button className="btn ghost icon-btn" title="Chế độ tập trung"
                  aria-label="Chế độ tập trung" onClick={() => setFocusOpen(true)}>
            <FocusIcon />
          </button>
          {onOpenDone && (
            <button className="btn ghost icon-btn" title="Đã xong" aria-label="Đã xong"
                    onClick={onOpenDone}>
              <CheckIcon />
            </button>
          )}
          {onOpenResources && (
            <button className="btn ghost icon-btn" title="Resource" aria-label="Resource"
                    onClick={onOpenResources}>
              <LibraryIcon />
            </button>
          )}
          {/* Bánh răng gom: đổi nền + đăng xuất */}
          <SettingsMenu onSignOut={onSignOut} />
        </div>
      </header>

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setDragging(stuff.find((s) => s.id === active.id))}
        onDragEnd={onDragEnd}
      >
        <div style={{ marginTop: 16 }}>
          <WeekBoard days={week} onToggle={toggle} topicsById={topicsById}
                     onOpen={openEditor} onQuickAdd={quickAdd}
                     journalByDate={journal} onJournalChange={load}
                     focusToday
                     renderDay={(d) => (
                       <DayDrop day={d} topicsById={topicsById}
                                onToggle={toggle} onOpen={openEditor} />
                     )} />
        </div>

      {unscheduled.length > 0 && (
        <Section title="Chưa sắp lịch" count={unscheduled.length}
                 hint="thuộc tuần này, chưa xếp vào ngày nào">
          <GroupedItems items={unscheduled} topicsById={topicsById} collapsible draggable
                        onToggle={toggle} onOpen={openEditor} />
        </Section>
      )}

      {overdue.length > 0 && (
        <Section title="Quá hạn" count={overdue.length}>
          <GroupedItems items={overdue} topicsById={topicsById} overdue collapsible draggable
                        onToggle={toggle} onOpen={openEditor} />
        </Section>
      )}

      {Object.entries(TITLES).map(([key, title]) => (
        <Section key={key} title={title} count={groups[key].length}
                 hint={key === 'next_week'
                   ? `${format(h.nextStart, 'd/M')} – ${format(h.nextEnd, 'd/M')}`
                   : key === 'in_a_month'
                     ? `đến ${format(h.monthEnd, 'd/M/yyyy')}`
                     : ''}>
          {groups[key].length === 0
            ? <div className="empty">Chưa có gì.</div>
            : <GroupedItems items={groups[key]} topicsById={topicsById} collapsible draggable
                            onToggle={toggle} onOpen={openEditor} />}
        </Section>
      ))}

        <DragOverlay>
          {dragging && <StuffCard item={dragging} />}
        </DragOverlay>
      </DndContext>

      <Section title="Topics / Goals to brainstorm" count={topics.length}>
        <Topics topics={topics} stuff={roots} onChanged={load} />
      </Section>

      {editing !== undefined && (
        <div className="modal-bg" onClick={closeEditor}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <StuffForm item={editing} topics={topics} meId={meId}
                       onSaved={afterWrite} onDeleted={afterWrite} onCancel={closeEditor} />
          </div>
        </div>
      )}

      {reflectOpen && reflectAt && (
        // Trước 20:00 CN: xem tuần đã kết thúc. Từ 20:00 CN: tuần vừa được
        // tổng kết xong. Xem lib/dates.js → reflectWeek().
        <ReflectModal weekStart={reflectAt.weekStart}
                      label={reflectAt.current ? 'tuần này' : 'tuần trước'}
                      canGenerate={reflectAt.current}
                      onClose={() => setReflectOpen(false)} />
      )}

      {focusOpen && (
        <FocusMode
          items={week.find((d) => d.key === iso(h.today))?.items ?? []}
          stuff={stuff}
          onChanged={load}
          onClose={() => setFocusOpen(false)} />
      )}

      {searchOpen && (
        <SearchModal onClose={() => setSearchOpen(false)}
                     onOpenStuff={(item) => setEditing(item)} />
      )}
    </div>
  )
}




function FocusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  )
}

/** Ô ngày trong lưới tuần: vừa hiện việc, vừa là chỗ thả. */
function DayDrop({ day, topicsById, onToggle, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: day.key })
  return (
    <div ref={setNodeRef} className={`day-items ${isOver ? 'drop-active' : ''}`}
         style={{ minHeight: 48, borderRadius: 6 }}>
      <GroupedItems items={day.items} topicsById={topicsById}
                    onToggle={onToggle} onOpen={onOpen} hideDate draggable />
    </div>
  )
}

function Section({ title, count, hint, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {hint && <span className="eyebrow">{hint}</span>}
        <span className="count">{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {children}
      </div>
    </section>
  )
}

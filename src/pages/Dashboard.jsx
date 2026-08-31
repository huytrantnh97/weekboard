import { useEffect, useMemo, useState } from 'react'
import { format, addDays } from 'date-fns'
import {
  listStuff, listTopics, listHabitLogs, setDone, toggleHabitLog, isWeekPlanned,
  createStuff, listJournal,
} from '../lib/api'
import { horizons, buildWeek, bucketOf, isOverdue, sortStuff, iso } from '../lib/dates'
import WeekBoard from '../components/WeekBoard'
import GroupedItems from '../components/GroupedItems'
import Topics from '../components/Topics'
import StuffForm from '../components/StuffForm'
import ReflectModal from '../components/ReflectModal'
import SearchModal from '../components/SearchModal'
import {
  SearchIcon, PlusIcon, PlanIcon, CheckIcon, LibraryIcon, LogoutIcon, ReflectIcon,
} from '../components/Icons'

const TITLES = {
  next_week:  'Next week',
  in_a_month: 'In a month',
  later:      'In more than a month',
  no_date:    'No date',
}

export default function Dashboard({ onOpenPlanning, onOpenDone, onOpenResources, onSignOut, meId }) {
  const [editing, setEditing] = useState(undefined)   // undefined = đóng, null = thêm mới
  const [reflectOpen, setReflectOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [stuff, setStuff] = useState([])
  const [topics, setTopics] = useState([])
  const [logs, setLogs] = useState([])
  const [planned, setPlanned] = useState(true)
  const [journal, setJournal] = useState({})
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

  const week = useMemo(() => buildWeek(h.thisStart, stuff, logs), [stuff, logs, h])
  const topicsById = useMemo(() => Object.fromEntries(topics.map((t) => [t.id, t])), [topics])

  // Các nhóm còn lại: bỏ habit (habit chỉ hiện trong lưới tuần) và bỏ việc đã xong
  const groups = useMemo(() => {
    const g = { next_week: [], in_a_month: [], later: [], no_date: [] }
    for (const s of stuff) {
      if (s.type === 'habit' || s.status === 'done') continue
      const b = bucketOf(s, h)
      if (g[b]) g[b].push(s)
    }
    for (const k of Object.keys(g)) g[k] = sortStuff(g[k], h)
    return g
  }, [stuff, h])

  const overdue = useMemo(
    () => sortStuff(stuff.filter((s) => s.type !== 'habit' && isOverdue(s, h)), h),
    [stuff, h])

  /**
   * Việc thuộc về tuần này nhưng CHƯA được xếp vào ngày cụ thể — thường do
   * quên lập kế hoạch hôm Chủ nhật. Trước đây nhóm 'this_week' không có chỗ
   * hiển thị nên những việc này biến mất khỏi màn hình.
   * Việc quá hạn đã có mục riêng nên không lặp lại ở đây.
   */
  const unscheduled = useMemo(
    () => sortStuff(stuff.filter((s) =>
      s.type !== 'habit' && s.status === 'open' && !s.planned_date
      && bucketOf(s, h) === 'this_week' && !isOverdue(s, h)), h),
    [stuff, h])

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
                    onClick={() => setReflectOpen(true)}>
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
          {onSignOut && (
            <button className="btn ghost icon-btn" title="Đăng xuất" aria-label="Đăng xuất"
                    onClick={() => { if (confirm('Đăng xuất khỏi WeekBoard?')) onSignOut() }}>
              <LogoutIcon />
            </button>
          )}
        </div>
      </header>

      <div style={{ marginTop: 16 }}>
        <WeekBoard days={week} onToggle={toggle} topicsById={topicsById}
                   onOpen={openEditor} onQuickAdd={quickAdd}
                   journalByDate={journal} onJournalChange={load} />
      </div>

      {unscheduled.length > 0 && (
        <Section title="Chưa sắp lịch" count={unscheduled.length}
                 hint="thuộc tuần này, chưa xếp vào ngày nào">
          <GroupedItems items={unscheduled} topicsById={topicsById}
                        onToggle={toggle} onOpen={openEditor} />
        </Section>
      )}

      {overdue.length > 0 && (
        <Section title="Quá hạn" count={overdue.length}>
          <GroupedItems items={overdue} topicsById={topicsById} overdue
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
            : <GroupedItems items={groups[key]} topicsById={topicsById}
                            onToggle={toggle} onOpen={openEditor} />}
        </Section>
      ))}

      <Section title="Topics / Goals to brainstorm" count={topics.length}>
        <Topics topics={topics} stuff={stuff} onChanged={load} />
      </Section>

      {editing !== undefined && (
        <div className="modal-bg" onClick={closeEditor}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <StuffForm item={editing} topics={topics} meId={meId}
                       onSaved={afterWrite} onDeleted={afterWrite} onCancel={closeEditor} />
          </div>
        </div>
      )}

      {reflectOpen && (
        // Ở màn hình chính, cái đáng nhìn lại là tuần ĐÃ KẾT THÚC.
        // Báo cáo của tuần đang chạy xem ở trang "Lập kế hoạch tuần sau".
        <ReflectModal weekStart={addDays(h.thisStart, -7)} label="tuần trước"
                      onClose={() => setReflectOpen(false)} />
      )}

      {searchOpen && (
        <SearchModal onClose={() => setSearchOpen(false)}
                     onOpenStuff={(item) => setEditing(item)} />
      )}
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

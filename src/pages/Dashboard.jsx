import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  listStuff, listTopics, listHabitLogs, setDone, toggleHabitLog, isWeekPlanned,
  createStuff,
} from '../lib/api'
import { horizons, buildWeek, bucketOf, isOverdue, sortStuff } from '../lib/dates'
import WeekBoard from '../components/WeekBoard'
import GroupedItems from '../components/GroupedItems'
import Topics from '../components/Topics'
import StuffForm from '../components/StuffForm'

const TITLES = {
  next_week:  'Next week',
  in_a_month: 'In a month',
  later:      'In more than a month',
  no_date:    'No date',
}

export default function Dashboard({ onOpenPlanning, onOpenDone, onSignOut, meId }) {
  const [editing, setEditing] = useState(undefined)   // undefined = đóng, null = thêm mới
  const [stuff, setStuff] = useState([])
  const [topics, setTopics] = useState([])
  const [logs, setLogs] = useState([])
  const [planned, setPlanned] = useState(true)
  const h = useMemo(() => horizons(), [])

  const load = async () => {
    const [s, t, l, p] = await Promise.all([
      listStuff(), listTopics(),
      listHabitLogs(h.thisStart, h.nextEnd),
      isWeekPlanned(h.nextStart),
    ])
    setStuff(s); setTopics(t); setLogs(l); setPlanned(p)
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
          <h1>This week</h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setEditing(null)}>+ Add</button>
          <button
            className={`btn ${!planned && isSunday ? 'glow' : 'primary'}`}
            onClick={onOpenPlanning}>
            Plan for next week
          </button>
          {onOpenDone && (
            <button className="btn ghost" onClick={onOpenDone}>Done</button>
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
                   onOpen={openEditor} onQuickAdd={quickAdd} />
      </div>

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
    </div>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
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

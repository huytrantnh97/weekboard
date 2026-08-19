import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  listStuff, listTopics, listHabitLogs, setDone, toggleHabitLog, isWeekPlanned,
} from '../lib/api'
import { horizons, buildWeek, bucketOf, isOverdue, daysOf } from '../lib/dates'
import WeekBoard from '../components/WeekBoard'
import StuffCard from '../components/StuffCard'
import Topics from '../components/Topics'

const TITLES = {
  next_week:  'Next week',
  in_a_month: 'In a month',
  later:      'In more than a month',
  no_date:    'No date',
}

export default function Dashboard({ onOpenPlanning, onOpenNew, onSignOut }) {
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

  // Các nhóm còn lại: bỏ habit (habit chỉ hiện trong lưới tuần) và bỏ việc đã xong
  const groups = useMemo(() => {
    const g = { next_week: [], in_a_month: [], later: [], no_date: [] }
    for (const s of stuff) {
      if (s.type === 'habit' || s.status === 'done') continue
      const b = bucketOf(s, h)
      if (g[b]) g[b].push(s)
    }
    return g
  }, [stuff, h])

  const overdue = useMemo(
    () => stuff.filter((s) => s.type !== 'habit' && isOverdue(s, h)), [stuff, h])

  const toggle = async (item, on) => {
    if (item.type === 'habit') await toggleHabitLog(item.id, item.occurrence_date, on)
    else await setDone(item.id, on)
    load()
  }

  const isSunday = new Date().getDay() === 0

  return (
    <div className="app">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Tuần {format(h.thisStart, 'd/M')} – {format(h.thisEnd, 'd/M/yyyy')}</div>
          <h1>This week</h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" onClick={onOpenNew}>+ Thêm</button>
          <button
            className={`btn ${!planned && isSunday ? 'glow' : 'primary'}`}
            onClick={onOpenPlanning}>
            Lập kế hoạch tuần sau
          </button>
          {onSignOut && (
            <button className="btn ghost" onClick={onSignOut} title="Đăng xuất">Thoát</button>
          )}
        </div>
      </header>

      <div style={{ marginTop: 16 }}>
        <WeekBoard days={week} onToggle={toggle} />
      </div>

      {overdue.length > 0 && (
        <Section title="Quá hạn" count={overdue.length}>
          {overdue.map((s) => <StuffCard key={s.id} item={s} overdue onToggle={toggle} />)}
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
            : groups[key].map((s) => <StuffCard key={s.id} item={s} onToggle={toggle} />)}
        </Section>
      ))}

      <Section title="Topics / Goals to brainstorm" count={topics.length}>
        <Topics topics={topics} stuff={stuff} onChanged={load} />
      </Section>
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

import { useEffect, useState } from 'react'
import { dateText, iso } from '../lib/dates'

const ICON = { task: '', event: '◆', habit: '↻' }

/**
 * Stuff có giờ, nằm đúng ngày HÔM NAY, chưa xong, mà giờ đó đã qua → "quá giờ".
 * Chỉ xét khi biết chắc ngày: habit (occurrence_date), việc đã xếp ngày
 * (planned_date) hoặc việc một ngày. Việc nằm trong khoảng ngày mà chưa xếp
 * thì không biết nó "thuộc" ngày nào nên không tô đỏ.
 */
export function isLateToday(item, now = new Date()) {
  if (!item.start_time || item.done || item.status === 'done') return false
  const day = item.type === 'habit'
    ? item.occurrence_date
    : (item.planned_date || (item.date_mode === 'single' ? item.start_date : null))
  if (!day || day !== iso(now)) return false
  const [h, m] = item.start_time.split(':').map(Number)
  return h * 60 + m < now.getHours() * 60 + now.getMinutes()
}

/** Cập nhật mỗi 30 giây, chỉ khi stuff có giờ — để thẻ tự chuyển đỏ khi giờ trôi qua. */
function useNow(active) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [active])
  return now
}

export default function StuffCard({ item, onToggle, onOpen, overdue = false,
                                   hideDate = false, dragProps }) {
  const now = useNow(!!item.start_time)
  const late = !overdue && isLateToday(item, now)
  const red = overdue || late

  // Trong lưới tuần, stuff đã nằm đúng ô ngày rồi → chỉ hiện giờ.
  const when = hideDate ? '' : dateText(item)

  const meta = [
    item.start_time?.slice(0, 5),
    when,
    overdue ? 'Quá hạn' : late ? 'Quá giờ' : null,
  ].filter(Boolean).join(' · ')

  const icon = ICON[item.type]
  const title = (
    <span className="card-title">
      {icon && <span aria-hidden style={{ marginRight: 5, opacity: 0.55, fontSize: '.85em' }}>{icon}</span>}
      {item.title}
    </span>
  )

  return (
    <div
      className={[
        'card',
        item.type === 'habit' ? 'habit' : '',
        item.done ? 'is-done' : '',
        red ? 'is-overdue' : '',
      ].join(' ')}
      {...dragProps}
    >
      <button
        className="tick"
        data-on={String(!!item.done)}
        aria-label={item.done ? 'Bỏ đánh dấu hoàn thành' : 'Đánh dấu hoàn thành'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onToggle?.(item, !item.done) }}
      />

      {onOpen ? (
        <button type="button" className="card-body"
                onClick={(e) => { e.stopPropagation(); onOpen(item) }}>
          {title}
          {meta && <span className="card-meta"
                         style={late ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{meta}</span>}
        </button>
      ) : (
        <div className="card-body">
          {title}
          {meta && <span className="card-meta"
                         style={late ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{meta}</span>}
        </div>
      )}

      {item.link && (
        <a className="card-link" href={item.link} target="_blank" rel="noopener noreferrer"
           title={item.link} aria-label="Mở link"
           onPointerDown={(e) => e.stopPropagation()}
           onClick={(e) => e.stopPropagation()}>↗</a>
      )}
    </div>
  )
}

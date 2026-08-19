import { dateText } from '../lib/dates'

const ICON = { task: '', event: '◆', habit: '↻' }

export default function StuffCard({ item, onToggle, overdue = false, dragProps }) {
  const meta = [
    item.start_time?.slice(0, 5),
    item.type !== 'task' ? `${ICON[item.type]} ${dateText(item)}`.trim() : dateText(item),
    overdue ? 'Quá hạn' : null,
  ].filter(Boolean).join(' · ')

  return (
    <div
      className={[
        'card',
        item.type === 'habit' ? 'habit' : '',
        item.done ? 'is-done' : '',
        overdue ? 'is-overdue' : '',
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
      <div style={{ minWidth: 0 }}>
        <div className="card-title">{item.title}</div>
        {meta && <div className="card-meta">{meta}</div>}
      </div>
    </div>
  )
}

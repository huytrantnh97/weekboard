import { dateText } from '../lib/dates'

const ICON = { task: '', event: '◆', habit: '↻' }

export default function StuffCard({ item, onToggle, onOpen, overdue = false, dragProps }) {
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

      {onOpen ? (
        <button type="button" className="card-body"
                onClick={(e) => { e.stopPropagation(); onOpen(item) }}>
          <span className="card-title">{item.title}</span>
          {meta && <span className="card-meta">{meta}</span>}
        </button>
      ) : (
        <div className="card-body">
          <span className="card-title">{item.title}</span>
          {meta && <span className="card-meta">{meta}</span>}
        </div>
      )}
    </div>
  )
}

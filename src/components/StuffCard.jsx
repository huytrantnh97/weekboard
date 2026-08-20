import { dateText } from '../lib/dates'

const ICON = { task: '', event: '◆', habit: '↻' }

export default function StuffCard({ item, onToggle, onOpen, overdue = false,
                                   hideDate = false, dragProps }) {
  // Trong lưới tuần, stuff đã nằm đúng ô ngày rồi → chỉ hiện giờ.
  const when = hideDate
    ? (item.type === 'task' ? '' : ICON[item.type])
    : `${item.type !== 'task' ? ICON[item.type] : ''} ${dateText(item)}`.trim()

  const meta = [
    item.start_time?.slice(0, 5),
    when,
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

      {item.link && (
        <a className="card-link" href={item.link} target="_blank" rel="noopener noreferrer"
           title={item.link} aria-label="Mở link"
           onPointerDown={(e) => e.stopPropagation()}
           onClick={(e) => e.stopPropagation()}>↗</a>
      )}
    </div>
  )
}

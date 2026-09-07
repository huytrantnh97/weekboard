import { dateText } from '../lib/dates'

const ICON = { task: '', event: '◆', habit: '↻' }

export default function StuffCard({ item, onToggle, onOpen, overdue = false,
                                   hideDate = false, dragProps }) {
  // Icon loại việc đứng ngay đầu dòng tiêu đề, không tách xuống dòng phụ.
  const icon = ICON[item.type]

  // Trong lưới tuần, stuff đã nằm đúng ô ngày rồi → không lặp lại ngày.
  const meta = [
    item.start_time?.slice(0, 5),
    hideDate ? null : dateText(item),
    overdue ? 'Quá hạn' : null,
  ].filter(Boolean).join(' · ')

  const body = (
    <>
      <span className="card-title">
        {icon && (
          <span aria-hidden="true"
                style={{ marginRight: 5, opacity: 0.55, fontSize: '0.85em' }}>
            {icon}
          </span>
        )}
        {item.title}
      </span>
      {meta && <span className="card-meta">{meta}</span>}
    </>
  )

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
          {body}
        </button>
      ) : (
        <div className="card-body">{body}</div>
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

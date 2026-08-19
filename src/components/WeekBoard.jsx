import { useState } from 'react'
import { isSameDay, isBefore, startOfDay, getISODay, format } from 'date-fns'
import { DAY_LABEL } from '../lib/dates'
import StuffCard from './StuffCard'

/**
 * Bảng 7 ngày.
 * - Màn hình ngang / rộng  → 7 cột nằm ngang (grid-auto-flow: column)
 * - Màn hình dọc (điện thoại) → xếp dọc
 * - Mặc định thu gọn các ngày đã trôi qua, bấm để mở lại.
 */
export default function WeekBoard({ days, today = new Date(), onToggle, renderDay }) {
  const [showPast, setShowPast] = useState(false)
  const t = startOfDay(today)

  const pastCount = days.filter((d) => isBefore(d.date, t)).length
  const collapse = (d) => !showPast && isBefore(d.date, t)

  // Cột ngày đã qua co lại còn 44px khi ở chế độ nằm ngang
  const cols = days.map((d) => (collapse(d) ? '44px' : '1fr')).join(' ')

  return (
    <>
      {pastCount > 0 && (
        <button className="btn ghost" onClick={() => setShowPast((v) => !v)}
                style={{ marginBottom: 8 }}>
          {showPast ? 'Ẩn ngày đã qua' : `Hiện ${pastCount} ngày đã qua`}
        </button>
      )}

      <div className={`rail ${pastCount && !showPast ? 'has-past' : ''}`}
           style={{ '--rail-cols': cols }}>
        {days.map((d) => {
          const isToday = isSameDay(d.date, t)
          const isPast = isBefore(d.date, t)
          const shrunk = collapse(d)
          return (
            <div key={d.key}
                 className={[
                   'day',
                   isPast ? 'past' : '',
                   isToday ? 'today' : '',
                   shrunk ? 'collapsed' : '',
                 ].join(' ')}
                 onClick={shrunk ? () => setShowPast(true) : undefined}>
              <div className="day-head">
                <span className="dow">{DAY_LABEL[getISODay(d.date)]}</span>
                {!shrunk && <span>{format(d.date, 'd/M')}</span>}
                {!shrunk && d.items.length > 0 && (
                  <span style={{ marginLeft: 'auto' }}>{d.items.length}</span>
                )}
              </div>

              {!shrunk && (
                renderDay
                  ? renderDay(d)
                  : (
                    <div className="day-items">
                      {d.items.map((it) => (
                        <StuffCard key={it.key} item={it} onToggle={onToggle} />
                      ))}
                    </div>
                  )
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

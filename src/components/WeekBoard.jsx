import { useState } from 'react'
import { isSameDay, isBefore, startOfDay, getISODay, format } from 'date-fns'
import { DAY_LABEL, iso } from '../lib/dates'
import StuffCard from './StuffCard'
import GroupedItems from './GroupedItems'
import JournalModal from './JournalModal'

/**
 * Bảng 7 ngày.
 * - Màn hình ngang / rộng  → 7 cột nằm ngang (grid-auto-flow: column)
 * - Màn hình dọc (điện thoại) → xếp dọc
 * - Trong chế độ đủ tuần, các ngày đã trôi qua bị thu gọn, bấm để mở lại.
 *
 * focusToday: chỉ hiện riêng ngày hôm nay, bấm nút để bung cả tuần.
 * Phải bật tường minh — trang "Lập kế hoạch tuần sau" cũng dùng component này
 * nhưng truyền today = ngày đầu tuần sau, bật nhầm sẽ giấu mất 6 cột cần kéo thả.
 */
export default function WeekBoard({ days, today = new Date(), onToggle, onOpen,
                                   onQuickAdd, topicsById = {}, journalByDate = {},
                                   onJournalChange, focusToday = false, renderDay }) {
  const [showAll, setShowAll] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const [addDay, setAddDay] = useState(null)
  const [draft, setDraft] = useState('')
  const [journalDay, setJournalDay] = useState(null)
  const t = startOfDay(today)

  const todayIdx = days.findIndex((d) => isSameDay(d.date, t))
  // Chỉ thu về một ngày khi hôm nay thật sự nằm trong tuần đang hiển thị
  const focusMode = focusToday && !showAll && todayIdx >= 0
  const shownDays = focusMode ? [days[todayIdx]] : days

  const pastCount = days.filter((d) => isBefore(d.date, t)).length
  const collapse = (d) => !focusMode && !showPast && isBefore(d.date, t)

  // Cột ngày đã qua co lại còn 44px khi ở chế độ nằm ngang
  const cols = shownDays.map((d) => (collapse(d) ? '44px' : '1fr')).join(' ')
  const hasCollapsed = !focusMode && pastCount > 0 && !showPast

  return (
    <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {focusToday && todayIdx >= 0 && (
          <button className="btn ghost" onClick={() => setShowAll((v) => !v)}>
            {focusMode ? 'Hiện cả tuần' : 'Chỉ hôm nay'}
          </button>
        )}
        {!focusMode && pastCount > 0 && (
          <button className="btn ghost" onClick={() => setShowPast((v) => !v)}>
            {showPast ? 'Ẩn ngày đã qua' : `Hiện ${pastCount} ngày đã qua`}
          </button>
        )}
      </div>

      <div className={`rail ${hasCollapsed ? 'has-past' : ''}`}
           style={{ '--rail-cols': cols }}>
        {shownDays.map((d) => {
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
                {!shrunk && (
                  <button type="button" className="journal-dot"
                          data-has={String(!!journalByDate[d.key])}
                          title="Nhật ký ngày này" aria-label="Nhật ký ngày này"
                          onClick={(e) => { e.stopPropagation(); setJournalDay(d.date) }}>
                    <JournalDotIcon />
                  </button>
                )}
                {!shrunk && d.items.length > 0 && (
                  <span style={{ marginLeft: 'auto' }}>{d.items.length}</span>
                )}
              </div>

              {!shrunk && (
                renderDay
                  ? renderDay(d)
                  : (
                    <GroupedItems items={d.items} topicsById={topicsById}
                                  onToggle={onToggle} onOpen={onOpen}
                                  hideDate className="day-items" />
                  )
              )}

              {!shrunk && onQuickAdd && (
                addDay === d.key ? (
                  <input
                    className="field day-add-input" autoFocus placeholder="Việc gì?"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => { setAddDay(null); setDraft('') }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setAddDay(null); setDraft('') }
                      if (e.key === 'Enter' && draft.trim()) {
                        onQuickAdd(d.key, draft.trim())
                        setDraft('')          // giữ ô mở để nhập tiếp
                      }
                    }}
                  />
                ) : (
                  <button className="day-add" onClick={() => setAddDay(d.key)}
                          aria-label="Thêm việc vào ngày này">+</button>
                )
              )}
            </div>
          )
        })}
      </div>

      {journalDay && (
        <JournalModal
          date={journalDay}
          initialContent={journalByDate[iso(journalDay)] ?? ''}
          onClose={() => setJournalDay(null)}
          onSaved={() => onJournalChange?.()}
        />
      )}
    </>
  )
}

function JournalDotIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8">
      <circle cx="4" cy="4" r="3.2" />
    </svg>
  )
}

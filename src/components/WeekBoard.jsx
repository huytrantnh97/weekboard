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

  const closeAdd = () => { setAddDay(null); setDraft('') }

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
                  /*
                    Phải là <form> thật: trên điện thoại, phím "return"/"Go" của
                    bàn phím ảo chỉ kích hoạt submit của form. Với <input> đứng
                    một mình, nhiều trình duyệt di động không phát sự kiện Enter
                    nào cả — đó là lý do trước đây bấm return không lưu được.
                    Cũng bỏ luôn onBlur xoá nội dung: bàn phím đóng lại là ô mất
                    focus, chữ vừa gõ bị xoá trước khi kịp lưu.
                  */
                  <form
                    style={{ display: 'flex', gap: 4, marginTop: 4 }}
                    onSubmit={(e) => {
                      e.preventDefault()
                      const v = draft.trim()
                      if (!v) { closeAdd(); return }
                      onQuickAdd(d.key, v)
                      setDraft('')            // giữ ô mở để nhập tiếp
                    }}
                  >
                    <input
                      className="field day-add-input" autoFocus placeholder="Việc gì?"
                      value={draft} enterKeyHint="done"
                      style={{ flex: 1, minWidth: 0 }}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') closeAdd() }}
                    />
                    {/* Luôn có một đường lưu bằng cách chạm, không phụ thuộc bàn phím */}
                    <button type="submit" className="btn day-add-ok"
                            aria-label="Lưu việc này">✓</button>
                    <button type="button" className="btn ghost day-add-ok"
                            onClick={closeAdd} aria-label="Đóng">×</button>
                  </form>
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

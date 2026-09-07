import { useState } from 'react'
import { groupByTopic } from '../lib/dates'
import StuffCard from './StuffCard'

const UNGROUPED = 'Chưa nhóm'

/**
 * Bọc quanh một danh sách stuff đã sắp xếp, chia thành các nhóm theo Topic.
 *
 * collapsible: hiện tiêu đề nhóm bấm được để thu gọn / mở ra, kèm số lượng.
 *   Bật ở các mục Next week / In a month / … cho gọn; KHÔNG bật trong lưới
 *   "This week" vì mỗi ô ngày quá hẹp, thêm dòng tiêu đề sẽ rối hơn là gọn.
 */
export default function GroupedItems({ items, topicsById = {}, onToggle, onOpen,
                                       overdue = false, hideDate = false,
                                       collapsible = false, className }) {
  const groups = groupByTopic(items, topicsById)
  const [closed, setClosed] = useState({})   // { [key]: true } = đang thu gọn

  return (
    <div className={className}>
      {groups.map((g) => {
        const key = g.id ?? '_none'
        const label = g.title ?? UNGROUPED
        const isClosed = !!closed[key]

        if (!collapsible) {
          return (
            <div className="topic-group" key={key}>
              {/* Không gộp nhóm "Chưa nhóm" bằng nhãn ở đây — trong ô ngày
                  hẹp, việc để trống nhìn gọn hơn. */}
              {g.title && <div className="topic-group-label">{g.title}</div>}
              {g.items.map((it) => (
                <StuffCard key={it.key ?? it.id} item={it}
                           onToggle={onToggle} onOpen={onOpen}
                           overdue={overdue} hideDate={hideDate} />
              ))}
            </div>
          )
        }

        return (
          <div className="topic-group" key={key}>
            <button
              type="button"
              className="topic-group-label"
              aria-expanded={!isClosed}
              onClick={() => setClosed((p) => ({ ...p, [key]: !p[key] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                font: 'inherit', color: 'inherit', background: 'none',
                border: 0, padding: '2px 0', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '.07em', textTransform: 'uppercase',
              }}
            >
              <span style={{
                display: 'inline-block', width: 8,
                transform: isClosed ? 'rotate(-90deg)' : 'none',
                transition: 'transform .12s',
              }}>▾</span>
              {label}
              <span style={{ opacity: .6 }}>{g.items.length}</span>
            </button>

            {!isClosed && g.items.map((it) => (
              <StuffCard key={it.key ?? it.id} item={it}
                         onToggle={onToggle} onOpen={onOpen}
                         overdue={overdue} hideDate={hideDate} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

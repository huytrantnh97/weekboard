import { groupByTopic } from '../lib/dates'
import StuffCard from './StuffCard'

/**
 * Bọc quanh một danh sách stuff đã sắp xếp, chia thành các nhóm theo Topic.
 * Nhóm không có topic không hiện tiêu đề — chỉ các nhóm có topic mới có nhãn.
 */
export default function GroupedItems({ items, topicsById = {}, onToggle, onOpen,
                                       overdue = false, hideDate = false, className }) {
  const groups = groupByTopic(items, topicsById)
  return (
    <div className={className}>
      {groups.map((g) => (
        <div className="topic-group" key={g.id ?? '_none'}>
          {g.title && <div className="topic-group-label">{g.title}</div>}
          {g.items.map((it) => (
            <StuffCard key={it.key ?? it.id} item={it}
                       onToggle={onToggle} onOpen={onOpen}
                       overdue={overdue} hideDate={hideDate} />
          ))}
        </div>
      ))}
    </div>
  )
}

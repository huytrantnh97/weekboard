import {
  startOfWeek, endOfWeek, startOfDay, addDays, addMonths,
  format, parseISO, getISODay, getDate, lastDayOfMonth,
} from 'date-fns'

export const WEEK = { weekStartsOn: 1 }          // tuần bắt đầu thứ Hai
export const iso = (d) => format(d, 'yyyy-MM-dd')
export const parse = (s) => parseISO(s)

export const DAY_LABEL = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
export const dayLabel = (d) => `${DAY_LABEL[getISODay(d)]} ${format(d, 'd/M')}`

/**
 * Mốc thời gian của 4 nhóm.
 * VD hôm nay 19/8/2026 (T4):
 *   thisWeek  17/8 – 23/8
 *   nextWeek  24/8 – 30/8
 *   inAMonth  31/8 – 30/9   (= cuối tuần sau + 1 tháng)
 *   later     từ 1/10 trở đi
 */
export function horizons(now = new Date()) {
  const today = startOfDay(now)
  const thisStart = startOfWeek(today, WEEK)
  const thisEnd = endOfWeek(today, WEEK)
  const nextStart = addDays(thisEnd, 1)
  const nextEnd = addDays(nextStart, 6)
  const monthEnd = addMonths(nextEnd, 1)
  return { today, thisStart, thisEnd, nextStart, nextEnd, monthEnd }
}

export const daysOf = (start) => Array.from({ length: 7 }, (_, i) => addDays(start, i))

/** Ngày "neo" dùng để xếp một stuff vào nhóm nào. */
export function anchorDate(item, h) {
  if (item.planned_date) return parse(item.planned_date)
  if (!item.start_date) return null
  const s = parse(item.start_date)
  const e = parse(item.end_date ?? item.start_date)
  if (e < h.today) return e                 // đã quá hạn → kéo về tuần này
  return s < h.thisStart ? h.thisStart : s  // khoảng đang chạy → tính từ đầu tuần này
}

export const BUCKETS = ['this_week', 'next_week', 'in_a_month', 'later', 'no_date']

/**
 * Task (không tính event/habit) đặt đúng ngày hôm nay mà chưa đánh dấu xong.
 * Coi như hết hạn ngay trong hôm nay — không đợi sang ngày mai mới thành
 * quá hạn. Bị đẩy khỏi lưới This week xuống Next week, và ở trang Planning
 * được coi như chưa có ngày cụ thể (kéo thả tự do) để xếp lại ngày mới.
 *
 * Tự động hết hiệu lực ngay khi: được đánh dấu xong, hoặc được xếp một
 * planned_date khác hôm nay (tức đã "lên lịch lại" xong).
 */
export function isStaleToday(item, h) {
  if (item.type !== 'task' || item.status !== 'open') return false
  if (item.date_mode !== 'single') return false
  const anchor = item.planned_date ?? item.start_date
  return anchor === iso(h.today)
}

export function bucketOf(item, h) {
  if (isStaleToday(item, h)) return 'next_week'
  const a = anchorDate(item, h)
  if (!a) return 'no_date'
  if (a <= h.thisEnd) return 'this_week'
  if (a <= h.nextEnd) return 'next_week'
  if (a <= h.monthEnd) return 'in_a_month'
  return 'later'
}

export function isOverdue(item, h) {
  if (item.status !== 'open' || !item.end_date) return false
  return parse(item.end_date) < h.today
}

/** Hiển thị khoảng ngày của một stuff dưới dạng chữ ngắn. */
export function dateText(item) {
  if (item.type === 'habit') return habitText(item)
  if (item.date_mode === 'none') return ''
  const s = parse(item.start_date), e = parse(item.end_date)
  if (item.date_mode === 'single') return format(s, 'd/M')
  if (item.date_mode === 'month') return `tháng ${format(s, 'M/yyyy')}`
  return `${format(s, 'd/M')} – ${format(e, 'd/M')}`
}

export function habitText(h) {
  if (h.freq === 'weekly') {
    const ds = (h.by_weekday ?? []).sort((a, b) => a - b).map((d) => DAY_LABEL[d])
    return ds.length ? `Hằng tuần · ${ds.join(', ')}` : 'Hằng tuần'
  }
  const ds = (h.by_monthday ?? []).sort((a, b) => a - b)
    .map((d) => (d === 32 ? 'cuối tháng' : `ngày ${d}`))
  return ds.length ? `Hằng tháng · ${ds.join(', ')}` : 'Hằng tháng'
}

/**
 * Bung habit thành danh sách ngày cụ thể trong [from, to].
 * Trả về mảng chuỗi 'yyyy-MM-dd'.
 */
export function habitOccurrences(habit, from, to) {
  if (habit.type !== 'habit' || !habit.freq) return []
  const out = []
  const begin = habit.repeat_from ? parse(habit.repeat_from) : from
  const until = habit.repeat_until ? parse(habit.repeat_until) : null

  for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
    if (d < begin) continue
    if (until && d > until) break
    const hit = habit.freq === 'weekly'
      ? (habit.by_weekday ?? []).includes(getISODay(d))
      : (habit.by_monthday ?? []).some(
          (n) => n === getDate(d) || (n === 32 && getDate(d) === getDate(lastDayOfMonth(d))),
        )
    if (hit) out.push(iso(d))
  }
  return out
}

/**
 * Gom mọi thứ cần hiển thị cho 7 ngày của một tuần.
 * @returns [{ date, key, items: [...] }]  — items gồm cả habit đã bung.
 */
export function buildWeek(weekStart, stuff, habitLogs = []) {
  const days = daysOf(weekStart)
  const from = days[0], to = days[6]
  const logged = new Set(habitLogs.map((l) => `${l.habit_id}|${l.occurrence_date}`))
  const map = Object.fromEntries(days.map((d) => [iso(d), []]))

  for (const s of stuff) {
    if (s.type === 'habit') {
      for (const day of habitOccurrences(s, from, to)) {
        map[day]?.push({
          ...s,
          occurrence_date: day,
          done: logged.has(`${s.id}|${day}`),
          key: `${s.id}|${day}`,
        })
      }
    } else if (s.planned_date && map[s.planned_date]) {
      map[s.planned_date].push({ ...s, done: s.status === 'done', key: s.id })
    }
  }

  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => (a.start_time ?? '99').localeCompare(b.start_time ?? '99')
      || a.position - b.position)
  }
  return days.map((d) => ({ date: d, key: iso(d), items: map[iso(d)] }))
}

/**
 * Sắp xếp theo thứ tự thời gian: ngày trước, rồi giờ, rồi tên.
 * Việc chưa có ngày xếp xuống cuối.
 */
export function sortStuff(list, h) {
  return [...list].sort((a, b) => {
    const da = anchorDate(a, h), db = anchorDate(b, h)
    if (da && db && +da !== +db) return da - db
    if (da && !db) return -1
    if (!da && db) return 1
    const ta = a.start_time ?? '99:99', tb = b.start_time ?? '99:99'
    if (ta !== tb) return ta.localeCompare(tb)
    return (a.title ?? '').localeCompare(b.title ?? '', 'vi')
  })
}

/**
 * Gom danh sách theo topic, giữ nguyên thứ tự thời gian đã sắp trước đó.
 * Thứ tự nhóm = thứ tự xuất hiện đầu tiên của topic trong danh sách
 * (tức nhóm nào có việc gần nhất thì lên trước).
 * Việc không có topic được gom vào một nhóm không tiêu đề, ở đúng vị trí
 * xuất hiện đầu tiên của nó (thường là đầu danh sách nếu sortStuff đã chạy).
 */
export function groupByTopic(items, topicsById = {}) {
  const order = []
  const map = new Map()
  for (const it of items) {
    const key = it.topic_id || '_none'
    if (!map.has(key)) { map.set(key, []); order.push(key) }
    map.get(key).push(it)
  }
  return order.map((key) => ({
    id: key === '_none' ? null : key,
    title: key === '_none' ? null : (topicsById[key]?.title ?? null),
    items: map.get(key),
  }))
}

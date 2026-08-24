import { createClient } from '@supabase/supabase-js'
import { iso } from './dates'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

const ok = ({ data, error }) => { if (error) throw error; return data }

/* ----------------------------- STUFF ----------------------------- */

export const listStuff = () =>
  supabase.from('stuff').select('*')
    .neq('status', 'cancelled')
    .order('position', { ascending: true })
    .then(ok)

export const createStuff = (payload) =>
  supabase.from('stuff').insert(normalise(payload)).select().single().then(ok)

export const updateStuff = (id, patch) =>
  supabase.from('stuff').update(patch).eq('id', id).select().single().then(ok)

export const deleteStuff = (id) =>
  supabase.from('stuff').delete().eq('id', id).then(ok)

export const setDone = (id, done) =>
  updateStuff(id, { status: done ? 'done' : 'open' })

/** Kéo thả: gán stuff vào một ngày, đặt cuối danh sách ngày đó. */
export const moveToDay = (id, date, position) =>
  updateStuff(id, { planned_date: date ? iso(date) : null, position })

/** Đúng các cột có thật trong bảng stuff. Mọi field khác của form bị loại bỏ. */
const STUFF_COLUMNS = [
  'topic_id', 'type', 'title', 'note', 'link', 'status',
  'date_mode', 'start_date', 'end_date', 'start_time', 'planned_date', 'position',
  'freq', 'by_weekday', 'by_monthday', 'repeat_from', 'repeat_until',
]

/**
 * Chuẩn hoá dữ liệu form → đúng ràng buộc của DB.
 * date_mode: 'none' | 'single' | 'range' | 'month'
 */
export function normalise(f) {
  const out = { ...f }

  if (f.type === 'habit') {
    out.date_mode = 'none'
    out.start_date = out.end_date = null
    out.repeat_from ||= iso(new Date())
  } else if (f.date_mode === 'single') {
    out.end_date = f.start_date
  } else if (f.date_mode === 'month' && f.month) {
    const [y, m] = f.month.split('-').map(Number)   // input type="month" → '2026-09'
    out.start_date = iso(new Date(y, m - 1, 1))
    out.end_date = iso(new Date(y, m, 0))
  } else if (f.date_mode === 'none') {
    out.start_date = out.end_date = null
  }

  // Chỉ giữ lại các cột có thật, và bỏ chuỗi rỗng (Postgres cần null)
  const clean = {}
  for (const k of STUFF_COLUMNS) {
    if (out[k] === undefined) continue
    clean[k] = out[k] === '' ? null : out[k]
  }
  return clean
}

/* ----------------------------- TOPICS ---------------------------- */

export const listTopics = () =>
  supabase.from('topics').select('*').eq('status', 'open')
    .order('position').then(ok)

export const createTopic = (title) =>
  supabase.from('topics')
    .insert({ title, position: Date.now() }).select().single().then(ok)

export const updateTopic = (id, patch) =>
  supabase.from('topics').update(patch).eq('id', id).select().single().then(ok)

export const archiveTopic = (id) =>
  updateTopic(id, { status: 'archived' })

/** Xoá hẳn. Stuff thuộc topic không mất — topic_id chỉ bị gỡ về null. */
export const deleteTopic = (id) =>
  supabase.from('topics').delete().eq('id', id).then(ok)

export const listArchivedTopics = () =>
  supabase.from('topics').select('*').eq('status', 'archived')
    .order('created_at', { ascending: false }).then(ok)

export const restoreTopic = (id) => updateTopic(id, { status: 'open' })

/* ------------------------------ ĐÃ XONG (stuff) ------------------------- */

export const listDoneStuff = () =>
  supabase.from('stuff').select('*').eq('status', 'done')
    .order('completed_at', { ascending: false }).then(ok)

/* -------------------------------- CHIA SẺ -------------------------------- */

export const listShares = (stuffId) =>
  supabase.from('stuff_shares').select('*').eq('stuff_id', stuffId).then(ok)

/** email đã được chuẩn hoá (toEmail) từ phía component gọi hàm này. */
export const shareStuff = (stuffId, email) =>
  supabase.rpc('share_stuff', { p_stuff_id: stuffId, p_email: email }).then(ok)

export const unshareStuff = (stuffId, email) =>
  supabase.from('stuff_shares').delete()
    .eq('stuff_id', stuffId).eq('shared_with_email', email).then(ok)

/* ------------------------------- REFLECT --------------------------------- */

/** null = chưa có báo cáo cho tuần này. */
export const getReflection = (weekStartIso) =>
  supabase.from('reflections').select('*')
    .eq('week_start', weekStartIso).maybeSingle().then(ok)

/**
 * Gọi Edge Function để tạo báo cáo ngay cho CHÍNH người đang đăng nhập
 * (không đợi tới 20h Chủ nhật). Ném lỗi nếu thiếu cấu hình/API key.
 */
/* -------------------------------- RESOURCES ------------------------------ */

export const listResources = () =>
  supabase.from('resources').select('*')
    .order('position', { ascending: false }).then(ok)

export const createResource = (payload) =>
  supabase.from('resources')
    .insert({ ...payload, position: Date.now() }).select().single().then(ok)

export const updateResource = (id, patch) =>
  supabase.from('resources').update(patch).eq('id', id).select().single().then(ok)

export const deleteResource = (id) =>
  supabase.from('resources').delete().eq('id', id).then(ok)

/* ------------------------------ USER SETTINGS ---------------------------- */

export const getSettings = () =>
  supabase.from('user_settings').select('*').maybeSingle().then(ok)

export const saveSettings = (patch) =>
  supabase.from('user_settings')
    .upsert(patch, { onConflict: 'user_id' }).select().single().then(ok)

/* ------------------------------ DAILY JOURNAL ---------------------------- */

export const listJournal = (fromIso, toIso) =>
  supabase.from('journal_entries').select('*')
    .gte('entry_date', fromIso).lte('entry_date', toIso).then(ok)

export const listAllJournalUpTo = (toIso) =>
  supabase.from('journal_entries').select('*')
    .lte('entry_date', toIso).order('entry_date', { ascending: true }).then(ok)

/** Nội dung rỗng → xoá hẳn dòng ghi chú của ngày đó thay vì để lại dòng trống. */
export const saveJournal = (entryDateIso, content) => {
  const text = content.trim()
  return text
    ? supabase.from('journal_entries')
        .upsert({ entry_date: entryDateIso, content: text }, { onConflict: 'user_id,entry_date' })
        .select().single().then(ok)
    : supabase.from('journal_entries').delete().eq('entry_date', entryDateIso).then(ok)
}

export const triggerReflect = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Chưa đăng nhập')

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weekly-reflect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: '{}',
  })
  if (!res.ok) {
    const body = await res.text()
    let msg = body
    try { msg = JSON.parse(body).error ?? body } catch { /* giữ nguyên text */ }
    throw new Error(msg)
  }
  return res.json()
}

/* --------------------------- HABIT LOGS -------------------------- */

export const listHabitLogs = (from, to) =>
  supabase.from('habit_logs').select('*')
    .gte('occurrence_date', iso(from))
    .lte('occurrence_date', iso(to))
    .then(ok)

export const toggleHabitLog = (habitId, date, on) =>
  on
    ? supabase.from('habit_logs')
        .upsert({ habit_id: habitId, occurrence_date: date },
                { onConflict: 'habit_id,occurrence_date' }).then(ok)
    : supabase.from('habit_logs').delete()
        .eq('habit_id', habitId).eq('occurrence_date', date).then(ok)

/* --------------------------- WEEK PLANS -------------------------- */

export const isWeekPlanned = async (weekStart) => {
  const { data } = await supabase.from('week_plans').select('week_start')
    .eq('week_start', iso(weekStart)).maybeSingle()
  return !!data
}

export const markWeekPlanned = (weekStart) =>
  supabase.from('week_plans')
    .upsert({ week_start: iso(weekStart) }, { onConflict: 'user_id,week_start' })
    .then(ok)

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

/**
 * Chuẩn hoá dữ liệu form → đúng ràng buộc của DB.
 * mode: 'none' | 'single' | 'range' | 'month'
 */
export function normalise(f) {
  const out = { ...f }
  if (f.type === 'habit') {
    out.date_mode = 'none'
    out.start_date = out.end_date = null
    out.repeat_from ??= iso(new Date())
  } else if (f.date_mode === 'single') {
    out.end_date = f.start_date
  } else if (f.date_mode === 'month') {
    const [y, m] = f.month.split('-').map(Number)   // input type="month" → '2026-09'
    out.start_date = iso(new Date(y, m - 1, 1))
    out.end_date = iso(new Date(y, m, 0))
    delete out.month
  } else if (f.date_mode === 'none') {
    out.start_date = out.end_date = null
  }
  return out
}

/* ----------------------------- TOPICS ---------------------------- */

export const listTopics = () =>
  supabase.from('topics').select('*').eq('status', 'open')
    .order('position').then(ok)

export const createTopic = (title) =>
  supabase.from('topics').insert({ title }).select().single().then(ok)

export const archiveTopic = (id) =>
  supabase.from('topics').update({ status: 'archived' }).eq('id', id).then(ok)

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

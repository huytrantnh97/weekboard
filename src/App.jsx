import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/api'
import { toEmail } from './lib/identity'
import Dashboard from './pages/Dashboard'
import Planning from './pages/Planning'
import Done from './pages/Done'
import PullToRefresh from './components/PullToRefresh'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('home')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Kéo xuống để làm mới: remount trang hiện tại → chạy lại toàn bộ tải dữ liệu.
  const refresh = useCallback(async () => {
    setTick((t) => t + 1)
    await new Promise((r) => setTimeout(r, 400))
  }, [])

  if (session === undefined) return <div className="app" style={{ paddingTop: 80 }}>Đang mở…</div>
  if (!session) return <SignIn />

  return (
    <PullToRefresh onRefresh={refresh}>
      {page === 'home' && (
        <Dashboard key={tick} meId={session.user.id}
                   onOpenPlanning={() => setPage('plan')}
                   onOpenDone={() => setPage('done')}
                   onSignOut={() => supabase.auth.signOut()} />
      )}
      {page === 'plan' && (
        <Planning key={tick} onDone={() => { setPage('home'); setTick((t) => t + 1) }} />
      )}
      {page === 'done' && (
        <Done key={tick} meId={session.user.id}
              onBack={() => { setPage('home'); setTick((t) => t + 1) }} />
      )}
    </PullToRefresh>
  )
}

function SignIn() {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(id), password: pw,
    })
    setBusy(false)
    if (error) setErr(error.message)
  }

  const field = {
    font: 'inherit', fontSize: 15, padding: '10px 12px',
    border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)',
    background: 'var(--surface)', color: 'var(--ink)', width: '100%',
  }

  return (
    <div className="app" style={{ maxWidth: 340, paddingTop: 100 }}>
      <div className="eyebrow">WeekBoard</div>
      <h1 style={{ marginBottom: 20 }}>Đăng nhập</h1>

      <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
        <input style={field} autoFocus required autoComplete="username"
               placeholder="Tên đăng nhập"
               value={id} onChange={(e) => setId(e.target.value)} />
        <input style={field} type="password" required autoComplete="current-password"
               placeholder="Mật khẩu"
               value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Đang vào…' : 'Vào app'}
        </button>
      </form>

      {err && (
        <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12 }}>
          {err === 'Invalid login credentials'
            ? 'Sai tên đăng nhập hoặc mật khẩu.'
            : err}
        </p>
      )}
    </div>
  )
}

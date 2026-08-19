import { useEffect, useState } from 'react'
import { supabase, listTopics } from './lib/api'
import Dashboard from './pages/Dashboard'
import Planning from './pages/Planning'
import StuffForm from './components/StuffForm'

// Supabase yêu cầu email. Nếu bạn gõ tên đăng nhập không có "@",
// app tự ghép thêm domain này để thành email hợp lệ.
const DOMAIN = import.meta.env.VITE_LOGIN_DOMAIN || 'weekboard.local'
export const toEmail = (id) => (id.includes('@') ? id : `${id.trim()}@${DOMAIN}`)

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('home')
  const [topics, setTopics] = useState([])
  const [adding, setAdding] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) listTopics().then(setTopics) }, [session])

  if (session === undefined) return <div className="app" style={{ paddingTop: 80 }}>Đang mở…</div>
  if (!session) return <SignIn />

  return (
    <>
      {page === 'home'
        ? <Dashboard key={tick}
                     onOpenPlanning={() => setPage('plan')}
                     onOpenNew={() => setAdding(true)}
                     onSignOut={() => supabase.auth.signOut()} />
        : <Planning onDone={() => { setPage('home'); setTick((t) => t + 1) }} />}

      {adding && (
        <div className="app" style={{ paddingTop: 0 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)',
                        borderRadius: 'var(--r-md)', padding: 20 }}>
            <StuffForm topics={topics}
                       onSaved={() => { setAdding(false); setTick((t) => t + 1) }}
                       onCancel={() => setAdding(false)} />
          </div>
        </div>
      )}
    </>
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

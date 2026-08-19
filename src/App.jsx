import { useEffect, useState } from 'react'
import { supabase, listTopics } from './lib/api'
import Dashboard from './pages/Dashboard'
import Planning from './pages/Planning'
import StuffForm from './components/StuffForm'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('home')
  const [topics, setTopics] = useState([])
  const [adding, setAdding] = useState(false)
  const [tick, setTick] = useState(0)          // ép Dashboard tải lại

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) listTopics().then(setTopics) }, [session])

  if (session === undefined) return <div className="app">Đang tải…</div>
  if (!session) return <SignIn />

  return (
    <>
      {page === 'home'
        ? <Dashboard key={tick}
                     onOpenPlanning={() => setPage('plan')}
                     onOpenNew={() => setAdding(true)} />
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
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const send = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    })
    if (error) alert(error.message); else setSent(true)
  }
  return (
    <div className="app" style={{ maxWidth: 380, paddingTop: 96 }}>
      <div className="eyebrow">WeekBoard</div>
      <h1 style={{ marginBottom: 16 }}>Đăng nhập</h1>
      {sent ? (
        <p>Đã gửi link đăng nhập tới {email}. Mở mail trên chính thiết bị này.</p>
      ) : (
        <form onSubmit={send} style={{ display: 'grid', gap: 8 }}>
          <input className="btn" style={{ textAlign: 'left', fontWeight: 400 }}
                 type="email" required placeholder="email của bạn"
                 value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn primary" type="submit">Gửi link đăng nhập</button>
        </form>
      )}
    </div>
  )
}

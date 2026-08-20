import { useEffect, useState } from 'react'
import { listShares, shareStuff, unshareStuff } from '../lib/api'
import { toEmail } from '../lib/identity'

/** Chỉ hiện trong form sửa, và chỉ cho người tạo — xem StuffForm.jsx (isOwner). */
export default function ShareBox({ stuffId }) {
  const [shares, setShares] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const load = () => listShares(stuffId).then(setShares)
  useEffect(() => { load() }, [stuffId])

  const add = async (e) => {
    e.preventDefault()
    const v = input.trim()
    if (!v) return
    setErr(null)
    setBusy(true)
    try {
      await shareStuff(stuffId, toEmail(v))
      setInput('')
      await load()
    } catch (e2) {
      // Postgres bọc message gốc trong tiền tố dài — cắt lấy phần sau dấu ":" cuối cùng
      const msg = e2.message ?? String(e2)
      setErr(msg.split(': ').pop())
    } finally {
      setBusy(false)
    }
  }

  const remove = async (email) => {
    await unshareStuff(stuffId, email)
    load()
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Chia sẻ với</div>

      {shares.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {shares.map((s) => (
            <span className="share-chip" key={s.shared_with_email}>
              {s.shared_with_email}
              <button type="button" onClick={() => remove(s.shared_with_email)}
                      aria-label={`Bỏ chia sẻ với ${s.shared_with_email}`}>×</button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <input className="field" placeholder="Tên đăng nhập hoặc email…"
               value={input} onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') add(e) }} />
        <button type="button" className="btn" onClick={add} disabled={busy}
                style={{ flex: '0 0 auto' }}>
          {busy ? '…' : 'Chia sẻ'}
        </button>
      </div>

      {err && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{err}</p>}
    </div>
  )
}

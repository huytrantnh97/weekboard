import { useEffect, useState } from 'react'
import {
  listShares, shareStuff, unshareStuff,
  listResourceShares, shareResource, unshareResource,
  notifyShare, listShareTargets,
} from '../lib/api'
import { toEmail } from '../lib/identity'

// Cùng một giao diện chia sẻ, dùng chung cho stuff và resource —
// chỉ khác bộ hàm gọi xuống Supabase.
const API = {
  stuff: { list: listShares, add: shareStuff, remove: unshareStuff },
  resource: { list: listResourceShares, add: shareResource, remove: unshareResource },
}

/** Chỉ hiện trong form sửa, và chỉ cho người tạo (xem isOwner ở nơi gọi). */
export default function ShareBox({ id, kind = 'stuff' }) {
  const api = API[kind]
  const [shares, setShares] = useState([])
  const [targets, setTargets] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const load = () => api.list(id).then(setShares)
  useEffect(() => { load() }, [id, kind])

  // Danh sách user để chọn nhanh. Lỗi (chưa chạy SQL…) thì chỉ mất phần gợi ý,
  // ô nhập tay vẫn dùng được.
  useEffect(() => {
    listShareTargets().then(setTargets).catch((e) => console.warn(e))
  }, [])

  const share = async (value) => {
    const v = value.trim()
    if (!v) return
    setErr(null)
    setBusy(true)
    try {
      const email = toEmail(v)
      await api.add(id, email)

      // Báo Telegram cho người nhận. Bọc riêng vì việc chia sẻ ĐÃ thành công —
      // Telegram hỏng không phải lý do để báo lỗi đỏ cho người dùng.
      try { await notifyShare(kind, id, email) } catch (e3) { console.warn(e3) }

      setInput('')
      await load()
    } catch (e2) {
      // Postgres bọc message gốc trong tiền tố dài — cắt lấy phần sau dấu ":" cuối
      const msg = e2.message ?? String(e2)
      setErr(msg.split(': ').pop())
    } finally {
      setBusy(false)
    }
  }

  const add = (e) => { e.preventDefault(); share(input) }

  const remove = async (email) => {
    await api.remove(id, email)
    load()
  }

  const sharedSet = new Set(shares.map((s) => s.shared_with_email))
  const suggestions = targets.filter((e) => !sharedSet.has(e))

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

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {suggestions.map((email) => (
            <button type="button" key={email} className="btn ghost" disabled={busy}
                    style={{ fontSize: 13, padding: '4px 10px' }}
                    title="Bấm để chia sẻ"
                    onClick={() => share(email)}>
              + {email}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <input className="field" placeholder="Hoặc gõ tên đăng nhập / email…"
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

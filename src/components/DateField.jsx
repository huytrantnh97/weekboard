import { useEffect, useRef, useState } from 'react'
import { format, parse as parseFmt, isValid } from 'date-fns'

const canPick = typeof HTMLInputElement !== 'undefined'
  && 'showPicker' in HTMLInputElement.prototype

/* --------------------------------------------------------------- helpers */

const isoToText = (iso, fmt, out) => {
  if (!iso) return ''
  const d = parseFmt(iso, fmt, new Date())
  return isValid(d) ? format(d, out) : ''
}

/** Chèn dấu "/" tự động theo nhóm chữ số. VD [2,2,4] → dd/mm/yyyy */
const mask = (raw, groups) => {
  const digits = raw.replace(/\D/g, '').slice(0, groups.reduce((a, b) => a + b, 0))
  const parts = []
  let i = 0
  for (const g of groups) {
    if (i >= digits.length) break
    parts.push(digits.slice(i, i + g))
    i += g
  }
  return { text: parts.join('/'), full: digits.length === groups.reduce((a, b) => a + b, 0) }
}

/* ------------------------------------------------------------- DateField */

/** Ô ngày dạng dd/mm/yyyy. value / onChange dùng chuẩn ISO 'yyyy-MM-dd'. */
export function DateField({ value, onChange, style, ...rest }) {
  return (
    <Field
      value={value} onChange={onChange} style={style}
      placeholder="dd/mm/yyyy" groups={[2, 2, 4]}
      textFmt="dd/MM/yyyy" isoFmt="yyyy-MM-dd" nativeType="date"
      {...rest}
    />
  )
}

/** Ô tháng dạng mm/yyyy. value / onChange dùng chuẩn 'yyyy-MM'. */
export function MonthField({ value, onChange, style, ...rest }) {
  return (
    <Field
      value={value} onChange={onChange} style={style}
      placeholder="mm/yyyy" groups={[2, 4]}
      textFmt="MM/yyyy" isoFmt="yyyy-MM" nativeType="month"
      {...rest}
    />
  )
}

function Field({ value, onChange, placeholder, groups, textFmt, isoFmt,
                 nativeType, style, ...rest }) {
  const [text, setText] = useState(() => isoToText(value, isoFmt, textFmt))
  const native = useRef(null)

  // Đồng bộ khi value bị đổi từ bên ngoài
  useEffect(() => { setText(isoToText(value, isoFmt, textFmt)) }, [value])

  const type = (raw) => {
    const { text: t, full } = mask(raw, groups)
    setText(t)
    if (!full) { if (value) onChange(''); return }
    const d = parseFmt(t, textFmt, new Date())
    onChange(isValid(d) ? format(d, isoFmt) : '')
  }

  const openPicker = () => {
    try { native.current?.showPicker() } catch { /* trình duyệt không hỗ trợ */ }
  }

  const bad = text.length === placeholder.length && !value

  return (
    <span className="datefield" style={style}>
      <input
        className={`field ${bad ? 'field-bad' : ''}`}
        inputMode="numeric" autoComplete="off"
        placeholder={placeholder} value={text}
        onChange={(e) => type(e.target.value)}
        {...rest}
      />
      {canPick && (
        <>
          <button type="button" className="datefield-pick" onClick={openPicker}
                  tabIndex={-1} aria-label="Chọn từ lịch">▤</button>
          <input ref={native} type={nativeType} className="datefield-native"
                 tabIndex={-1} aria-hidden="true" value={value || ''}
                 onChange={(e) => onChange(e.target.value)} />
        </>
      )}
    </span>
  )
}

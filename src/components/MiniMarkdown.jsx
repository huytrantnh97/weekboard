/**
 * Bộ dựng markdown tối giản, chỉ để hiện báo cáo Reflect — không kéo thêm
 * thư viện. Hỗ trợ: ## tiêu đề, - gạch đầu dòng, **đậm**, đoạn văn.
 *
 * Duyệt theo TỪNG DÒNG (không tách theo khối cách nhau bởi dòng trống trước),
 * vì Claude thường viết heading rồi xuống dòng liệt kê ngay, không chừa
 * dòng trống — tách theo khối sẽ gộp nhầm heading vào chung đoạn với list.
 */
export default function MiniMarkdown({ text }) {
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n')
  const nodes = []
  let list = null       // gạch đầu dòng đang gom dở
  let para = null        // các dòng văn xuôi đang gom dở

  const flushList = () => { if (list) { nodes.push(list); list = null } }
  const flushPara = () => { if (para) { nodes.push(para); para = null } }

  for (const raw of lines) {
    const line = raw.trim()

    if (line === '') { flushList(); flushPara(); continue }

    const heading = line.match(/^(#{1,3})\s+(.*)/)
    if (heading) {
      flushList(); flushPara()
      const Tag = heading[1].length === 1 ? 'h3' : 'h4'
      nodes.push(<Tag key={nodes.length}>{inline(heading[2])}</Tag>)
      continue
    }

    const bullet = line.match(/^[-*]\s+(.*)/)
    if (bullet) {
      flushPara()
      if (!list) list = { items: [] }
      list.items.push(bullet[1])
      continue
    }

    flushList()
    if (!para) para = { lines: [] }
    para.lines.push(line)
  }
  flushList(); flushPara()

  return (
    <div className="reflect-body">
      {nodes.map((n, i) => {
        if (n?.items) {
          return (
            <ul key={i}>
              {n.items.map((it, j) => <li key={j}>{inline(it)}</li>)}
            </ul>
          )
        }
        if (n?.lines) {
          return (
            <p key={i}>
              {n.lines.map((l, j) => (
                <span key={j}>{inline(l)}{j < n.lines.length - 1 && <br />}</span>
              ))}
            </p>
          )
        }
        return n   // đã là JSX (heading) từ vòng lặp trên
      })}
    </div>
  )
}

function inline(s) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => (
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  ))
}

import { jsPDF } from 'jspdf'
import { format, parseISO, getISODay } from 'date-fns'
import { BE_VIETNAM_PRO_REGULAR_B64 } from './be-vietnam-pro-font'
import { DAY_LABEL } from './dates'

const MARGIN = 18
const LINE_H = 6
const PAGE_H = 297 // A4, mm
const PAGE_W = 210

function newDoc() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.addFileToVFS('BeVietnamPro.ttf', BE_VIETNAM_PRO_REGULAR_B64)
  doc.addFont('BeVietnamPro.ttf', 'BeVietnamPro', 'normal')
  doc.setFont('BeVietnamPro')
  return doc
}

/**
 * Dựng PDF từ danh sách mục { heading, body }.
 * Tự ngắt trang khi hết chỗ, chữ dài tự xuống dòng theo bề rộng trang.
 */
function build(title, sections) {
  const doc = newDoc()
  let y = MARGIN

  const ensureSpace = (needed) => {
    if (y + needed > PAGE_H - MARGIN) { doc.addPage(); y = MARGIN }
  }

  doc.setFontSize(20)
  doc.setTextColor(21, 24, 27)
  doc.text(title, MARGIN, y)
  y += LINE_H * 2.2

  for (const sec of sections) {
    ensureSpace(LINE_H * 2.4)
    doc.setFontSize(12)
    doc.setTextColor(31, 77, 61)   // --pine
    doc.text(sec.heading, MARGIN, y)
    y += LINE_H * 1.1

    doc.setFontSize(11)
    doc.setTextColor(21, 24, 27)   // --ink
    const lines = doc.splitTextToSize(sec.body, PAGE_W - MARGIN * 2)
    for (const line of lines) {
      ensureSpace(LINE_H)
      doc.text(line, MARGIN, y)
      y += LINE_H
    }
    y += LINE_H * 1.1
  }

  return doc
}

/** entries: [{ entry_date: 'yyyy-MM-dd', content }], sắp theo ngày tăng dần. */
export function buildJournalPdf(entries) {
  return build('Nhật ký', entries.map((e) => {
    const d = parseISO(e.entry_date)
    return {
      heading: `${DAY_LABEL[getISODay(d)]} · ${format(d, 'd/M/yyyy')}`,
      body: e.content,
    }
  }))
}

/** reflections: [{ week_start: 'yyyy-MM-dd', content }], sắp theo tuần tăng dần. */
export function buildReflectionsPdf(reflections) {
  return build('Báo cáo Reflect', reflections.map((r) => {
    const d = parseISO(r.week_start)
    return {
      heading: `Tuần bắt đầu ${format(d, 'd/M/yyyy')}`,
      body: stripMarkdown(r.content),
    }
  }))
}

/**
 * Báo cáo do Claude viết ở dạng Markdown. PDF không dựng được markdown,
 * nên chuyển "## Tiêu đề" và "- gạch đầu dòng" về văn bản thuần dễ đọc.
 */
function stripMarkdown(md) {
  return (md ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line
      .replace(/^#{1,6}\s*/, '')      // bỏ dấu # của tiêu đề
      .replace(/^[-*]\s+/, '• ')       // gạch đầu dòng -> bullet
      .replace(/\*\*(.+?)\*\*/g, '$1') // bỏ ** in đậm
      .trim())
    .filter((l, i, arr) => l !== '' || arr[i - 1] !== '')   // gộp dòng trống liên tiếp
    .join('\n')
}

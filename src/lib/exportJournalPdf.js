import { jsPDF } from 'jspdf'
import { format, parseISO, getISODay } from 'date-fns'
import { BE_VIETNAM_PRO_REGULAR_B64 } from './be-vietnam-pro-font'
import { DAY_LABEL } from './dates'

const MARGIN = 18
const LINE_H = 6
const PAGE_H = 297 // A4, mm
const PAGE_W = 210

/**
 * entries: mảng { entry_date: 'yyyy-MM-dd', content: string }, đã sắp theo
 * ngày tăng dần (đúng thứ tự listAllJournalUpTo trả về).
 * Trả về một đối tượng jsPDF — gọi .save(filename) để tải xuống.
 */
export function buildJournalPdf(entries) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.addFileToVFS('BeVietnamPro.ttf', BE_VIETNAM_PRO_REGULAR_B64)
  doc.addFont('BeVietnamPro.ttf', 'BeVietnamPro', 'normal')
  doc.setFont('BeVietnamPro')

  let y = MARGIN

  const ensureSpace = (needed) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
  }

  doc.setFontSize(20)
  doc.setTextColor(21, 24, 27)
  doc.text('Nhật ký', MARGIN, y)
  y += LINE_H * 2.2

  for (const entry of entries) {
    const d = parseISO(entry.entry_date)
    const heading = `${DAY_LABEL[getISODay(d)]} · ${format(d, 'd/M/yyyy')}`

    ensureSpace(LINE_H * 2.4)
    doc.setFontSize(12)
    doc.setTextColor(31, 77, 61)   // --pine
    doc.text(heading, MARGIN, y)
    y += LINE_H * 1.1

    doc.setFontSize(11)
    doc.setTextColor(21, 24, 27)   // --ink
    const lines = doc.splitTextToSize(entry.content, PAGE_W - MARGIN * 2)
    for (const line of lines) {
      ensureSpace(LINE_H)
      doc.text(line, MARGIN, y)
      y += LINE_H
    }
    y += LINE_H * 1.1   // khoảng cách giữa các ngày
  }

  return doc
}

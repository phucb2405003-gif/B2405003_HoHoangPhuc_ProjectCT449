function parseEventDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value !== 'string' || !value.trim()) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatEventTime(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

export function buildRecentActivity({ borrows = [], details = [], readers = [], books = [], limit = 6 }) {
  const events = []
  const readersByCode = new Map(readers.map((reader) => [reader.maDocGia, reader]))
  const booksByCode = new Map(books.map((book) => [book.maSach, book]))
  const borrowsByCode = new Map(borrows.map((borrow) => [borrow.maPhieu, borrow]))

  function addEvent({ borrow, event, date, type, description = '' }) {
    const parsed = parseEventDate(date)
    if (!parsed) return
    const timestamp = parsed.getTime()
    const time = formatEventTime(parsed)
    const readerName = readersByCode.get(borrow.maDocGia)?.hoTen || borrow.maDocGia || 'Độc giả không xác định'
    events.push({
      key: `${event}-${borrow.maPhieu}-${description}-${timestamp}`,
      title: event,
      description: `${borrow.maPhieu} · ${readerName}${description ? ` · ${description}` : ''}`,
      time,
      timestamp,
      type,
    })
  }

  for (const borrow of borrows) {
    if (borrow.ngayYeuCau) {
      addEvent({ borrow, event: 'Tạo phiếu mượn', date: borrow.ngayYeuCau, type: 'default' })
    } else if (borrow.ngayYeuCau === null && borrow.maNhanVien && borrow.ngayMuon) {
      addEvent({ borrow, event: 'Tạo phiếu mượn tại quầy', date: borrow.ngayMuon, type: 'default', description: `Nhân viên ${borrow.maNhanVien}` })
    }

    if (borrow.trangThai === 'Đã duyệt' && borrow.ngayYeuCau && borrow.ngayMuon) {
      addEvent({ borrow, event: 'Duyệt phiếu mượn', date: borrow.ngayMuon, type: 'success', description: borrow.maNhanVien ? `Nhân viên ${borrow.maNhanVien}` : '' })
    } else if (borrow.trangThai === 'Từ chối' && borrow.ngayHuy) {
      addEvent({ borrow, event: 'Từ chối phiếu mượn', date: borrow.ngayHuy, type: 'warning', description: borrow.maNhanVien ? `Nhân viên ${borrow.maNhanVien}` : '' })
    } else if (borrow.trangThai === 'Hủy' && borrow.ngayHuy) {
      const actor = borrow.lyDo === 'Độc giả đã hủy phiếu' ? 'Độc giả hủy phiếu' : borrow.maNhanVien ? `Nhân viên ${borrow.maNhanVien}` : 'Phiếu bị hủy'
      addEvent({ borrow, event: 'Hủy phiếu mượn', date: borrow.ngayHuy, type: 'warning', description: actor })
    }
  }

  for (const detail of details) {
    if (detail.trangThai !== 'Đã trả' || !detail.ngayTra) continue
    const borrow = borrowsByCode.get(detail.maPhieu)
    if (!borrow) continue
    const bookName = booksByCode.get(detail.maSach)?.tenSach || detail.maSach || 'Sách không xác định'
    addEvent({ borrow, event: 'Ghi nhận trả sách', date: detail.ngayTra, type: 'success', description: `${bookName} (${detail.maSach || 'không rõ mã'})` })
  }

  return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, Math.max(0, limit))
}

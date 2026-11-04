export function vietnamDayKey(value) {
  if (typeof value === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (dateOnly) {
      const year = Number(dateOnly[1])
      const month = Number(dateOnly[2])
      const day = Number(dateOnly[3])
      const check = new Date(year, month - 1, day)
      return check.getFullYear() === year && check.getMonth() === month - 1 && check.getDate() === day
        ? `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`
        : null
    }
  }

  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const fields = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return `${fields.year}-${fields.month}-${fields.day}`
}

export function formatVietnamCalendarDate(value) {
  const dayKey = vietnamDayKey(value)
  if (!dayKey) return 'Chưa cập nhật'
  const [year, month, day] = dayKey.split('-')
  return `${day}/${month}/${year}`
}

export function isOverdueBorrowDetail(detail, now = new Date()) {
  if (detail?.trangThai !== 'Đang mượn') return false
  const dueDay = vietnamDayKey(detail.hanTra)
  const today = vietnamDayKey(now)
  return Boolean(dueDay && today && dueDay < today)
}

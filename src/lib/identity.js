// Supabase yêu cầu email. Nếu bạn gõ tên đăng nhập không có "@",
// app tự ghép thêm domain này để thành email hợp lệ. Dùng chung ở màn
// đăng nhập và ở ô "Chia sẻ với" để cả hai hiểu cùng một quy ước.
const DOMAIN = import.meta.env.VITE_LOGIN_DOMAIN || 'weekboard.local'

export const toEmail = (id) => (id.includes('@') ? id.trim() : `${id.trim()}@${DOMAIN}`)

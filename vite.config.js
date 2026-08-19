import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base PHẢI trùng tên repository trên GitHub.
// Nếu repo của bạn tên khác 'weekboard' thì sửa dòng dưới.
export default defineConfig({
  plugins: [react()],
  base: '/weekboard/',
})

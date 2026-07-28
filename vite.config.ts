import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 项目页面部署在 /<repo>/ 子路径下，需要匹配的 base
  base: '/book-crawl-mock/',
  plugins: [react()],
})

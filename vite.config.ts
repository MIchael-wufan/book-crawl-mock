import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    // 单文件模式下不需要拆分 chunk，也不需要生成 sourcemap 内联体积
    cssCodeSplit: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER, // 所有资源（图片/字体）都内联为 base64
  },
})

import "./global.css"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import AppLayout from './layouts/AppLayout'
import BookList from './pages/BookList'
import BookCrawl from './pages/BookCrawl'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1890ff' } }}>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/online-copy" replace />} />
            <Route path="/online-copy" element={<BookList />} />
            <Route path="/book-crawl" element={<Navigate to="/book-crawl/list" replace />} />
            <Route path="/book-crawl/list" element={<BookCrawl />} />
            {/* 占位页 */}
            <Route path="/exam-platform" element={<Placeholder title="试卷平台" />} />
            <Route path="/exercise-bank" element={<Placeholder title="练习题库" />} />
            <Route path="/human-qa" element={<Placeholder title="人工问答" />} />
            <Route path="*" element={<Navigate to="/online-copy" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ConfigProvider>
  </StrictMode>
)

function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, color: '#999', fontSize: 16 }}>
      {title}（待开发）
    </div>
  )
}

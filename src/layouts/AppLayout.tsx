import { Layout, Menu } from 'antd'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'

const { Header, Content } = Layout

const NAV_ITEMS = [
  { key: '/exam-platform', label: '试卷平台' },
  { key: '/exercise-bank', label: '练习题库' },
  { key: '/online-copy',   label: '在线抄写' },
  { key: '/human-qa',      label: '人工问答' },
  {
    key: '/book-crawl',
    label: '图书抓取',
    children: [
      { key: '/book-crawl/batches', label: '任务块列表' },
      { key: '/book-crawl/list',    label: '任务列表'   },
    ],
  },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeKey = location.pathname

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#1d2433',
          padding: '0 40px',
          height: 48,
          lineHeight: '48px',
        }}
      >
        <Menu
          mode="horizontal"
          selectedKeys={[activeKey]}
          onClick={({ key }) => navigate(key)}
          items={NAV_ITEMS}
          style={{
            background: 'transparent',
            borderBottom: 'none',
            flex: 1,
          }}
          theme="dark"
          triggerSubMenuAction="hover"
        />
        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>182****4390</span>
      </Header>

      <Content style={{ padding: '0 28px' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}

import { ConfigProvider, Layout, Menu, Breadcrumb } from 'antd'
import {
  UnorderedListOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'

const { Sider, Content } = Layout

const SIDER_MENU = [
  {
    key: 'crawl-group',
    label: '抓取',
    icon: <AppstoreOutlined />,
    children: [
      { key: '/book-crawl/list', label: '抓取任务列表', icon: <UnorderedListOutlined /> },
    ],
  },
]

const SIDER_BG = '#1a1f2e'

export default function CrawlLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#fa8c16' } }}>
      <Layout style={{ minHeight: '100vh' }}>
        {/* 左侧 Sider */}
        <Sider
          width={200}
          style={{
            background: SIDER_BG,
            position: 'fixed',
            top: 48,        // 和顶部 AppLayout Header 对齐
            left: 0,
            bottom: 0,
            overflow: 'auto',
            zIndex: 100,
          }}
        >
          {/* Logo 区域 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '16px 20px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: '#fa8c16',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              抓
            </div>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
              图书抓取中心
            </span>
          </div>

          <Menu
            mode="inline"
            theme="dark"
            selectedKeys={[location.pathname]}
            defaultOpenKeys={['crawl-group']}
            onClick={({ key }) => navigate(key)}
            items={SIDER_MENU}
            style={{
              background: SIDER_BG,
              border: 'none',
              marginTop: 4,
            }}
          />
        </Sider>

        {/* 右侧主体 */}
        <Layout style={{ marginLeft: 200, minHeight: '100vh', background: '#f0f2f5' }}>
          {/* Breadcrumb 标签栏 */}
          <div
            style={{
              background: '#fff',
              padding: '0 16px',
              height: 40,
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid #f0f0f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            {/* Tab 标签 */}
            <div
              style={{
                display: 'flex',
                gap: 4,
                alignItems: 'center',
                height: '100%',
              }}
            >
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 14px',
                  fontSize: 13,
                  color: '#fa8c16',
                  borderBottom: '2px solid #fa8c16',
                  cursor: 'default',
                  fontWeight: 500,
                  gap: 6,
                }}
              >
                <UnorderedListOutlined style={{ fontSize: 12 }} />
                抓取任务列表
              </div>
            </div>
            {/* 右侧面包屑 */}
            <Breadcrumb
              style={{ marginLeft: 'auto', fontSize: 12 }}
              items={[
                { title: 'Dashboard' },
                { title: '图书抓取中心' },
                { title: '抓取任务列表' },
              ]}
            />
          </div>

          <Content style={{ padding: '0 16px 24px' }}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}

import { useEffect } from 'react'
import {
  Card, Table, Button, Input, Select, DatePicker, Space, Tag, Form, Typography,
} from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import type { CrawlTask, CrawlTaskStatus, CrawlPriority, CrawlSource } from '../../types/book'
import { useCrawlStore } from '../../stores/bookStore'
import { useSearchParams } from 'react-router-dom'

const { RangePicker } = DatePicker
const { Link } = Typography

const BOOK_DETAIL_URL = (bookId: number) =>
  `https://merc.yuanfudao.com/mark-qs/book/list?source=1&ids=${bookId}`

const STATUS_CONFIG: Record<CrawlTaskStatus, { color: string; label: string }> = {
  pending:   { color: 'default',   label: '等待中' },
  running:   { color: 'processing', label: '抓取中' },
  success:   { color: 'success',   label: '成功'   },
  failed:    { color: 'error',     label: '失败'   },
  cancelled: { color: 'warning',   label: '已终止' },
}

const PRIORITY_CONFIG: Record<CrawlPriority, { color: string; label: string }> = {
  high: { color: 'red',     label: '高优' },
  low:  { color: 'default', label: '普通' },
}

const BATCH_STATUS_OPTIONS = [
  { value: 'all',       label: '全部' },
  { value: 'running',   label: '抓取中' },
  { value: 'completed', label: '已完成' },
]

const SOURCE_OPTIONS: { value: CrawlSource | 'all'; label: string }[] = [
  { value: 'all',  label: '全部' },
  { value: 'kd',   label: 'kd'   },
  { value: 'kk',   label: 'kk'   },
  { value: 'zyjl', label: 'zyjl' },
]

// ── 筛选区 ────────────────────────────────────────────────────────
function FilterBar({ initBatchId }: { initBatchId?: string }) {
  const { setFilter } = useCrawlStore()
  const [form] = Form.useForm()

  // 若从任务块列表跳转过来，预填 batchId
  useEffect(() => {
    if (initBatchId) {
      form.setFieldsValue({ batchId: initBatchId })
      setFilter({ batchId: initBatchId })
    }
  // 只在首次挂载时执行
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const labelStyle = { width: 90, textAlign: 'right' as const, color: 'rgba(0,0,0,0.88)' }
  const inputStyle = { width: 280 }
  const GROUP_GAP = 40
  const ROW_GAP = 12

  const handleSearch = () => {
    const v = form.getFieldsValue()
    const [start, end] = v.createdAtRange ?? [null, null]
    setFilter({
      taskId:         v.taskId      || undefined,
      batchId:        v.batchId     || undefined,
      isbn:           v.isbn        || undefined,
      source:         v.source      ?? 'all',
      status:         v.status      ?? 'all',
      priority:       v.priority    ?? 'all',
      bookId:         v.bookId      || undefined,
      batchStatus:    v.batchStatus ?? 'all',
      createdAtStart: start         || undefined,
      createdAtEnd:   end           || undefined,
    })
  }

  const handleReset = () => {
    form.resetFields()
    setFilter({
      taskId: undefined, batchId: undefined, isbn: undefined,
      source: 'all', status: 'all', priority: 'all',
      bookId: undefined, batchStatus: 'all',
      createdAtStart: undefined, createdAtEnd: undefined,
    })
  }

  return (
    <Card bordered={false} style={{ margin: '12px 0 0', borderRadius: 4 }} bodyStyle={{ padding: '16px 24px' }}>
      <Form form={form} layout="horizontal" colon>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'max-content max-content', columnGap: GROUP_GAP, rowGap: ROW_GAP }}>
            <Form.Item label={<span style={labelStyle}>任务ID</span>} name="taskId" style={{ margin: 0 }}>
              <Input placeholder="请输入任务ID，多个用空格分隔" style={inputStyle} allowClear />
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>任务块ID</span>} name="batchId" style={{ margin: 0 }}>
              <Input placeholder="请输入任务块ID" style={inputStyle} allowClear />
            </Form.Item>

            <Form.Item label={<span style={labelStyle}>ISBN</span>} name="isbn" style={{ margin: 0 }}>
              <Input placeholder="请输入ISBN，多个用空格分隔" style={inputStyle} allowClear />
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>抓取来源</span>} name="source" initialValue="all" style={{ margin: 0 }}>
              <Select style={inputStyle} options={SOURCE_OPTIONS} />
            </Form.Item>

            <Form.Item label={<span style={labelStyle}>抓取状态</span>} name="status" initialValue="all" style={{ margin: 0 }}>
              <Select
                style={inputStyle}
                options={[
                  { value: 'all', label: '全部' },
                  ...Object.entries(STATUS_CONFIG)
                    .filter(([v]) => v !== 'pending')
                    .map(([v, c]) => ({ value: v, label: c.label })),
                ]}
              />
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>抓取优先级</span>} name="priority" initialValue="all" style={{ margin: 0 }}>
              <Select
                style={inputStyle}
                options={[
                  { value: 'all', label: '全部' },
                  ...Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({ value: v, label: c.label })),
                ]}
              />
            </Form.Item>

            <Form.Item label={<span style={labelStyle}>图书ID</span>} name="bookId" style={{ margin: 0 }}>
              <Input placeholder="请输入图书ID，多个用空格分隔" style={inputStyle} allowClear />
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>任务块状态</span>} name="batchStatus" initialValue="all" style={{ margin: 0 }}>
              <Select style={inputStyle} options={BATCH_STATUS_OPTIONS} />
            </Form.Item>

            <Form.Item label={<span style={labelStyle}>创建日期</span>} name="createdAtRange" style={{ margin: 0 }}>
              <RangePicker placeholder={['开始日期', '结束日期']} style={{ width: inputStyle.width + 60 }} />
            </Form.Item>
          </div>
          <div>
            <Space>
              <Button type="primary" onClick={handleSearch}>查询</Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </div>
        </div>
      </Form>
    </Card>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────
export default function BookCrawl() {
  const { filteredTasks } = useCrawlStore()
  const [searchParams] = useSearchParams()
  const initBatchId = searchParams.get('batchId') ?? undefined

  const displayTasks = filteredTasks()

  const handleExport = () => {
    const header = '任务ID,任务块ID,抓取来源,创建时间,ISBN,抓取状态,图书ID'
    const rows = displayTasks.map(t =>
      [t.id, t.batchId, t.source, t.createdAt, t.isbn, STATUS_CONFIG[t.status].label, t.bookId ?? ''].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `crawl-tasks-${Date.now()}.csv`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  const columns: TableColumnsType<CrawlTask> = [
    { title: '任务块ID', dataIndex: 'batchId', width: 100 },
    { title: '任务ID',   dataIndex: 'id',       width: 90  },
    { title: '抓取来源', dataIndex: 'source',          width: 100 },
    { title: '库内状态', dataIndex: 'inventoryStatus', width: 100, render: (v?: string) => v || '无资源' },
    { title: '创建时间', dataIndex: 'createdAt',       width: 160 },
    { title: 'ISBN',     dataIndex: 'isbn',       width: 150 },
    {
      title: '抓取优先级', dataIndex: 'priority', width: 110,
      render: (v: CrawlPriority) => <Tag color={PRIORITY_CONFIG[v].color}>{PRIORITY_CONFIG[v].label}</Tag>,
    },
    {
      title: '抓取状态', dataIndex: 'status', width: 100,
      render: (v: CrawlTaskStatus) => <Tag color={STATUS_CONFIG[v].color}>{STATUS_CONFIG[v].label}</Tag>,
    },
    {
      title: '图书ID', dataIndex: 'bookId', width: 120,
      render: (bookId?: number) => bookId
        ? <Link href={BOOK_DETAIL_URL(bookId)} target="_blank" style={{ color: '#1890ff' }}>{bookId}</Link>
        : '-',
    },
  ]

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0' }}>
        <span style={{ fontWeight: 600, fontSize: 18 }}>任务列表</span>
      </div>

      <FilterBar initBatchId={initBatchId} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 8px' }}>
        <Button icon={<ExportOutlined />} onClick={handleExport}>批量导出</Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 4 }} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={displayTasks}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `共${t}条数据` }}
        />
      </Card>
    </div>
  )
}

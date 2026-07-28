import { useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Card, Table, Button, Input, Select, DatePicker, Space, Tag, Form,
  Modal, Tabs, Radio, Upload, message, Typography,
} from 'antd'
import { PlusOutlined, ExportOutlined, InboxOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import type { CrawlTask, CrawlTaskStatus, CrawlPriority } from '../../types/book'
import { useCrawlStore } from '../../stores/bookStore'

const { RangePicker } = DatePicker
const { Dragger } = Upload
const { Link } = Typography

const BOOK_DETAIL_URL = (bookId: number) =>
  `https://merc.yuanfudao.com/mark-qs/book/list?source=1&ids=${bookId}`

const STATUS_CONFIG: Record<CrawlTaskStatus, { color: string; label: string }> = {
  pending: { color: 'default',    label: '等待中' },
  running: { color: 'processing', label: '抓取中' },
  success: { color: 'success',    label: '成功'   },
  failed:  { color: 'error',      label: '失败'   },
}

const PRIORITY_CONFIG: Record<CrawlPriority, { color: string; label: string }> = {
  high: { color: 'red',     label: '高优' },
  low:  { color: 'default', label: '普通' },
}

// 统一用 xlsx 解析：xlsx / csv / tsv 均支持
// 期望首行为 ISBN, 抓取优先级（顺序不限，也兼容无表头的纯 ISBN 列）
const parseBatchFile = (buffer: ArrayBuffer): Array<{ isbn: string; priority: CrawlPriority }> => {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  // sheet_to_json header:1 → 二维数组，避免依赖具体表头名称
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
  if (!rows.length) return []

  // 判断首行是否为表头（含字母则跳过）
  const firstCell = String(rows[0][0] ?? '')
  const hasHeader = /[^\d]/.test(firstCell)
  const dataRows = hasHeader ? rows.slice(1) : rows

  return dataRows
    .filter(r => String(r[0] ?? '').trim())
    .map(r => ({
      isbn:     String(r[0]).trim(),
      priority: String(r[1] ?? '').includes('高') ? 'high' : 'low',
    }))
}

// ── 筛选区（与 BookList SearchForm 结构对齐）──────────────────────
function FilterBar() {
  const { setFilter } = useCrawlStore()
  const [form] = Form.useForm()

  const labelStyle = { width: 90, textAlign: 'right' as const, color: 'rgba(0,0,0,0.88)' }
  const inputStyle = { width: 280 }
  const GROUP_GAP = 40
  const ROW_GAP = 12

  const handleSearch = () => {
    const v = form.getFieldsValue()
    const [start, end] = v.createdAtRange ?? [null, null]
    setFilter({
      taskId:         v.taskId   || undefined,
      isbn:           v.isbn     || undefined,
      status:         v.status   ?? 'all',
      priority:       v.priority ?? 'all',
      bookId:         v.bookId   || undefined,
      createdAtStart: start      || undefined,
      createdAtEnd:   end        || undefined,
    })
  }

  const handleReset = () => {
    form.resetFields()
    setFilter({ taskId: undefined, isbn: undefined, status: 'all', priority: 'all', bookId: undefined, createdAtStart: undefined, createdAtEnd: undefined })
  }

  return (
    <Card bordered={false} style={{ margin: '12px 0 0', borderRadius: 4 }} bodyStyle={{ padding: '16px 24px' }}>
      <Form form={form} layout="horizontal" colon>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'max-content max-content',
              columnGap: GROUP_GAP,
              rowGap: ROW_GAP,
            }}
          >
            <Form.Item label={<span style={labelStyle}>任务ID</span>} name="taskId" style={{ margin: 0 }}>
              <Input placeholder="请输入任务ID，多个用空格分隔" style={inputStyle} allowClear />
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>ISBN</span>} name="isbn" style={{ margin: 0 }}>
              <Input placeholder="请输入ISBN，多个用空格分隔" style={inputStyle} allowClear />
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
            <Form.Item label={<span style={labelStyle}>创建日期</span>} name="createdAtRange" style={{ margin: 0 }}>
              <RangePicker placeholder={['开始日期', '结束日期']} style={{ width: inputStyle.width + 60 }} />
            </Form.Item>
          </div>

          {/* 按钮行：左下角 */}
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

// ── 手动导入：多行 ISBN + 优先级列表 ─────────────────────────────
type ManualRow = { isbn: string; priority: CrawlPriority }

const DEFAULT_ROW: ManualRow = { isbn: '', priority: 'high' }

function ManualRows({
  rows,
  onChange,
}: {
  rows: ManualRow[]
  onChange: (rows: ManualRow[]) => void
}) {
  const update = (i: number, patch: Partial<ManualRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => onChange([...rows, { ...DEFAULT_ROW }])
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i))

  return (
    <div style={{ marginTop: 8 }}>
      {/* 表头 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 4, color: '#666', fontSize: 13, fontWeight: 500 }}>
        <span style={{ flex: 1 }}>ISBN <span style={{ color: '#ff4d4f' }}>*</span></span>
        <span style={{ width: 140 }}>抓取优先级 <span style={{ color: '#ff4d4f' }}>*</span></span>
        <span style={{ width: 32 }} />
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <Input
            style={{ flex: 1 }}
            value={row.isbn}
            placeholder="请输入ISBN（10或13位）"
            onChange={e => update(i, { isbn: e.target.value })}
          />
          <Radio.Group
            style={{ width: 140, whiteSpace: 'nowrap' }}
            value={row.priority}
            onChange={e => update(i, { priority: e.target.value })}
          >
            <Radio value="high">高优</Radio>
            <Radio value="low">普通</Radio>
          </Radio.Group>
          <Button
            type="text"
            size="small"
            danger
            disabled={rows.length === 1}
            style={{ width: 32, padding: 0 }}
            onClick={() => removeRow(i)}
          >
            ✕
          </Button>
        </div>
      ))}
      <Button type="dashed" block onClick={addRow} style={{ marginTop: 4 }}>
        + 添加一行
      </Button>
    </div>
  )
}

// ── 添加任务弹窗 ──────────────────────────────────────────────────
function AddTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addTasksBatch } = useCrawlStore()
  const [activeTab, setActiveTab] = useState<'manual' | 'batch'>('manual')
  const [manualRows, setManualRows] = useState<ManualRow[]>([{ ...DEFAULT_ROW }])
  const [batchRows, setBatchRows] = useState<Array<{ isbn: string; priority: CrawlPriority }>>([])
  const [fileName, setFileName] = useState('')

  const handleOk = () => {
    if (activeTab === 'manual') {
      const isbnRe = /^\d{10}(\d{3})?$/
      const invalid = manualRows.find(r => !r.isbn || !isbnRe.test(r.isbn))
      if (invalid) { message.error('存在 ISBN 为空或格式不正确（须为10或13位数字）'); return }
      addTasksBatch(manualRows)
      message.success(`已加入 ${manualRows.length} 条任务`)
      setManualRows([{ ...DEFAULT_ROW }])
      onClose()
    } else {
      if (!batchRows.length) { message.warning('请先上传文件'); return }
      addTasksBatch(batchRows)
      message.success(`已加入 ${batchRows.length} 条任务`)
      setBatchRows([]); setFileName(''); onClose()
    }
  }

  const handleCancel = () => {
    setManualRows([{ ...DEFAULT_ROW }]); setBatchRows([]); setFileName(''); onClose()
  }

  const tabItems = [
    {
      key: 'manual',
      label: '手动导入',
      children: (
        <ManualRows rows={manualRows} onChange={setManualRows} />
      ),
    },
    {
      key: 'batch',
      label: '批量导入',
      children: (
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 8, fontSize: 12, color: '#888' }}>
            文件表头：<code>ISBN,抓取优先级</code>，优先级填「高优」或「普通」，支持 XLSX / CSV / TSV
          </div>
          <Dragger
            accept=".xlsx,.csv,.tsv,.txt"
            showUploadList={false}
            beforeUpload={file => {
              const reader = new FileReader()
              reader.onload = e => {
                const rows = parseBatchFile(e.target?.result as ArrayBuffer)
                if (!rows.length) { message.error('文件内容为空或格式不正确'); return }
                setBatchRows(rows); setFileName(file.name)
                message.success(`已解析 ${rows.length} 条记录`)
              }
              reader.readAsArrayBuffer(file)
              return false
            }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">点击或拖拽文件至此区域</p>
            <p className="ant-upload-hint">支持单次上传，XLSX / CSV / TSV 格式</p>
          </Dragger>
          {fileName && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#52c41a' }}>
              已选文件：{fileName}（{batchRows.length} 条）
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <Modal
      title="添加抓取任务" open={open} onOk={handleOk} onCancel={handleCancel}
      okText="确认" cancelText="取消" width={480} destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={k => setActiveTab(k as 'manual' | 'batch')} items={tabItems} />
    </Modal>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────
export default function BookCrawl() {
  const { filteredTasks } = useCrawlStore()
  const [modalOpen, setModalOpen] = useState(false)

  const displayTasks = filteredTasks()

  const handleExport = () => {
    const header = '任务ID,创建时间,ISBN,抓取状态,图书ID'
    const rows = displayTasks.map(t =>
      [t.id, t.createdAt, t.isbn, STATUS_CONFIG[t.status].label, t.bookId ?? ''].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `crawl-tasks-${Date.now()}.csv`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  const columns: TableColumnsType<CrawlTask> = [
    { title: '任务ID',   dataIndex: 'id',        width: 90  },
    { title: '创建时间', dataIndex: 'createdAt',  width: 160 },
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
      {/* 页面标题栏 */}
      <div style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0' }}>
        <span style={{ fontWeight: 600, fontSize: 18 }}>抓取列表</span>
      </div>

      {/* 筛选表单 */}
      <FilterBar />

      {/* 操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 8px' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            添加抓取任务
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            批量导出
          </Button>
        </Space>
      </div>

      {/* 列表 */}
      <Card bordered={false} style={{ margin: '0', borderRadius: 4 }} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={displayTasks}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `共${t}条数据` }}
        />
      </Card>

      <AddTaskModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

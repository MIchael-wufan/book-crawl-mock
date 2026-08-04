import { useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Card, Table, Button, Input, Select, DatePicker, Space, Tag, Form,
  Modal, Tabs, Radio, Upload, message,
} from 'antd'
import { ExportOutlined, PlusOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import type { CrawlTask, CrawlTaskStatus, CrawlPriority, CrawlSource } from '../../types/book'
import { useCrawlStore } from '../../stores/bookStore'

const { RangePicker } = DatePicker
const { Dragger } = Upload

const STATUS_CONFIG: Record<CrawlTaskStatus, { color: string; label: string }> = {
  pending:   { color: 'default',    label: '队列中' },
  running:   { color: 'processing', label: '抓取中' },
  success:   { color: 'success',    label: '成功'   },
  failed:    { color: 'error',      label: '失败'   },
  cancelled: { color: 'warning',    label: '已取消' },
}

const PRIORITY_CONFIG: Record<CrawlPriority, { color: string; label: string }> = {
  high:   { color: 'red',     label: '高优' },
  low:    { color: 'orange',  label: '普通' },
  lowest: { color: 'default', label: '低优' },
}

const SOURCE_OPTIONS: { value: CrawlSource | 'all'; label: string }[] = [
  { value: 'all',       label: '全部' },
  { value: 'unlimited', label: '不限' },
  { value: 'kd',        label: 'kd'   },
  { value: 'kk',        label: 'kk'   },
  { value: 'zyjl',      label: 'zyjl' },
]

// ── 解析批量导入文件 ──────────────────────────────────────────────
const parseBatchFile = (
  buffer: ArrayBuffer
): Array<{ isbn: string; priority: CrawlPriority; inventoryStatus: string }> => {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
  if (!rows.length) return []
  const firstCell = String(rows[0][0] ?? '')
  const dataRows = /[^\d]/.test(firstCell) ? rows.slice(1) : rows
  return dataRows
    .filter(r => String(r[0] ?? '').trim())
    .map(r => ({
      isbn:            String(r[0]).trim(),
      priority:        String(r[1] ?? '').includes('高') ? 'high'
                     : String(r[1] ?? '').includes('低') ? 'lowest'
                     : 'low' as CrawlPriority,
      inventoryStatus: String(r[2] ?? '').trim(),
    }))
}

// ── 手动录入行组件 ───────────────────────────────────────────────
type ManualRow = { isbn: string; priority: CrawlPriority; inventoryStatus: string }
const DEFAULT_ROW: ManualRow = { isbn: '', priority: 'high', inventoryStatus: '' }

const INVENTORY_OPTIONS = [
  { value: 'none', label: '无资源' },
  ...Array.from({ length: 5 }, (_, i) => {
    const y = String(new Date().getFullYear() - i)
    return { value: y, label: y }
  }),
]

function ManualRows({ rows, onChange }: { rows: ManualRow[]; onChange: (rows: ManualRow[]) => void }) {
  const update   = (i: number, patch: Partial<ManualRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow    = () => onChange([...rows, { ...DEFAULT_ROW }])
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i))

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 4, color: '#666', fontSize: 13, fontWeight: 500 }}>
        <span style={{ flex: 1 }}>ISBN <span style={{ color: '#ff4d4f' }}>*</span></span>
        <span style={{ width: 190 }}>抓取优先级 <span style={{ color: '#ff4d4f' }}>*</span></span>
        <span style={{ width: 120 }}>库内状态 <span style={{ color: '#ff4d4f' }}>*</span></span>
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
            style={{ width: 190, whiteSpace: 'nowrap' }}
            value={row.priority}
            onChange={e => update(i, { priority: e.target.value })}
          >
            <Radio value="high">高优</Radio>
            <Radio value="low">普通</Radio>
            <Radio value="lowest">低优</Radio>
          </Radio.Group>
          <Select
            style={{ width: 120 }}
            value={row.inventoryStatus}
            onChange={v => update(i, { inventoryStatus: v })}
            options={INVENTORY_OPTIONS}
          />
          <Button
            type="text" size="small" danger disabled={rows.length === 1}
            style={{ width: 32, padding: 0 }} onClick={() => removeRow(i)}
          >✕</Button>
        </div>
      ))}
      <Button type="dashed" block onClick={addRow} style={{ marginTop: 4 }}>+ 添加一行</Button>
    </div>
  )
}

// ── 添加任务弹窗 ─────────────────────────────────────────────────
function AddTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addTasksBatch } = useCrawlStore()
  const [activeTab, setActiveTab]   = useState<'manual' | 'batch'>('manual')
  const [taskName, setTaskName]     = useState('')
  const [source, setSource]         = useState<CrawlSource | undefined>(undefined)
  const [manualRows, setManualRows] = useState<ManualRow[]>([{ ...DEFAULT_ROW }])
  const [batchRows, setBatchRows]   = useState<Array<{ isbn: string; priority: CrawlPriority; inventoryStatus: string }>>([])
  const [fileName, setFileName]     = useState('')

  const resetAndClose = () => {
    setTaskName(''); setManualRows([{ ...DEFAULT_ROW }])
    setBatchRows([]); setFileName(''); setSource(undefined); onClose()
  }

  const handleOk = () => {
    if (!source) { message.error('请选择抓取来源'); return }
    if (activeTab === 'manual') {
      const isbnRe = /^\d{10}(\d{3})?$/
      const invalid = manualRows.find(r => !r.isbn || !isbnRe.test(r.isbn))
      if (invalid) { message.error('存在 ISBN 为空或格式不正确（须为10或13位数字）'); return }
      addTasksBatch(manualRows, source, taskName)
      message.success(`已加入 ${manualRows.length} 条任务`)
      resetAndClose()
    } else {
      if (!batchRows.length) { message.warning('请先上传文件'); return }
      addTasksBatch(batchRows, source, taskName)
      message.success(`已加入 ${batchRows.length} 条任务`)
      resetAndClose()
    }
  }

  const tabItems = [
    {
      key: 'manual',
      label: '手动导入',
      children: <ManualRows rows={manualRows} onChange={setManualRows} />,
    },
    {
      key: 'batch',
      label: '批量导入',
      children: (
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 8, fontSize: 12, color: '#888' }}>
            文件表头：<code>ISBN,抓取优先级,库内状态</code>，优先级填「高优」、「普通」或「低优」，库内状态填「无资源」或年份（如 2025），支持 XLSX / CSV / TSV
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
            <p className="ant-upload-drag-icon" />
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
      title="添加抓取任务" open={open} onOk={handleOk} onCancel={resetAndClose}
      okText="确认" cancelText="取消" width={580} destroyOnClose
    >
      <Form layout="horizontal" colon style={{ marginBottom: 8 }}>
        <Form.Item label="任务名称" style={{ margin: '8px 0 4px' }}>
          <Input
            style={{ width: 340 }}
            placeholder="可选，用于后续筛选（如：2024暑期数学专项）"
            value={taskName}
            onChange={e => setTaskName(e.target.value)}
            maxLength={50}
            allowClear
          />
        </Form.Item>
        <Form.Item label="指定抓取来源" required style={{ margin: '8px 0 4px' }}>
          <Select
            style={{ width: 200 }}
            placeholder="请选择来源"
            value={source}
            onChange={v => setSource(v)}
            options={SOURCE_OPTIONS.filter(o => o.value !== 'all')}
          />
        </Form.Item>
      </Form>
      <Tabs activeKey={activeTab} onChange={k => setActiveTab(k as 'manual' | 'batch')} items={tabItems} />
    </Modal>
  )
}

// ── 筛选区 ───────────────────────────────────────────────────────
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
      taskId:         v.taskId      || undefined,
      batchName:      v.batchName   || undefined,
      isbn:           v.isbn        || undefined,
      source:         v.source      ?? 'all',
      status:         v.status      ?? 'all',
      priority:       v.priority    ?? 'all',
      bookId:         undefined,
      createdAtStart: start         || undefined,
      createdAtEnd:   end           || undefined,
    })
  }

  const handleReset = () => {
    form.resetFields()
    setFilter({
      taskId: undefined, batchName: undefined, isbn: undefined,
      source: 'all', status: 'all', priority: 'all',
      bookId: undefined, createdAtStart: undefined, createdAtEnd: undefined,
    })
  }

  return (
    <Card bordered={false} style={{ margin: '12px 0 0', borderRadius: 4 }} bodyStyle={{ padding: '16px 24px' }}>
      <Form form={form} layout="horizontal" colon>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'max-content max-content', columnGap: GROUP_GAP, rowGap: ROW_GAP }}>
            <Form.Item label={<span style={labelStyle}>任务名称</span>} name="batchName" style={{ margin: 0 }}>
              <Input placeholder="请输入任务名称关键字" style={inputStyle} allowClear />
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>子任务ID</span>} name="taskId" style={{ margin: 0 }}>
              <Input placeholder="请输入子任务ID，多个用空格分隔" style={inputStyle} allowClear />
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
                  ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label })),
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

// ── 主页面 ───────────────────────────────────────────────────────
export default function BookCrawl() {
  const { filteredTasks, batches } = useCrawlStore()
  const [modalOpen, setModalOpen] = useState(false)

  const displayTasks = filteredTasks()
  // batchId → name 查找表，用于列表展示任务名称
  const batchNameMap = new Map(batches.map(b => [b.id, b.name]))

  const handleExport = () => {
    const header = '子任务ID,任务名称,抓取来源,创建时间,ISBN,抓取状态'
    const rows = displayTasks.map(t =>
      [t.id, batchNameMap.get(t.batchId) ?? '', t.source, t.createdAt, t.isbn, STATUS_CONFIG[t.status].label].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n'), ], { type: 'text/csv;charset=utf-8;' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `crawl-tasks-${Date.now()}.csv`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  const columns: TableColumnsType<CrawlTask> = [
    {
      title: '任务名称', dataIndex: 'batchId', key: 'batchName', width: 160,
      render: (batchId: number) => batchNameMap.get(batchId) ?? '-',
    },
    { title: '子任务ID', dataIndex: 'id',       width: 90  },
    { title: '抓取来源', dataIndex: 'source',          width: 100 },
    { title: '库内状态', dataIndex: 'inventoryStatus', width: 100, render: (v?: string) => v || '无资源' },
    { title: '创建时间', dataIndex: 'createdAt',       width: 160 },
    { title: 'ISBN',     dataIndex: 'isbn',            width: 150 },
    {
      title: '抓取优先级', dataIndex: 'priority', width: 110,
      render: (v: CrawlPriority) => <Tag color={PRIORITY_CONFIG[v].color}>{PRIORITY_CONFIG[v].label}</Tag>,
    },
    {
      title: '抓取状态', dataIndex: 'status', width: 100,
      render: (v: CrawlTaskStatus) => <Tag color={STATUS_CONFIG[v].color}>{STATUS_CONFIG[v].label}</Tag>,
    },
    {
      title: '图书标题', dataIndex: 'bookTitle', width: 180,
      render: (v?: string) => v
        ? <span style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>{v}</span>
        : '-',
    },
    {
      title: '图书年份', dataIndex: 'bookYear', width: 90,
      render: (v?: string) => v ?? '-',
    },
  ]

  return (
    <div style={{ padding: '12px 0 24px' }}>
      <FilterBar />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 0 8px' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          添加抓取任务
        </Button>
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

      <AddTaskModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
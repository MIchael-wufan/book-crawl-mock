import { useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Card, Table, Button, Input, Select, DatePicker, Space, Tag, Form,
  Modal, Tabs, Radio, Upload, message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import type { CrawlBatch, CrawlBatchStatus, CrawlPriority, CrawlSource } from '../../types/book'
import { useCrawlStore } from '../../stores/bookStore'
import { useNavigate } from 'react-router-dom'

const { RangePicker } = DatePicker
const { Dragger } = Upload

const SOURCE_OPTIONS: { value: CrawlSource | 'all'; label: string }[] = [
  { value: 'all',  label: '全部' },
  { value: 'kd',   label: 'kd'   },
  { value: 'kk',   label: 'kk'   },
  { value: 'zyjl', label: 'zyjl' },
]

const BATCH_STATUS_CONFIG: Record<CrawlBatchStatus, { color: string; label: string }> = {
  running:   { color: 'processing', label: '抓取中' },
  completed: { color: 'success',    label: '已完成' },
}

const parseBatchFile = (buffer: ArrayBuffer): Array<{ isbn: string; priority: CrawlPriority; inventoryStatus: string }> => {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
  if (!rows.length) return []
  const firstCell = String(rows[0][0] ?? '')
  const hasHeader = /[^\d]/.test(firstCell)
  const dataRows = hasHeader ? rows.slice(1) : rows
  return dataRows
    .filter(r => String(r[0] ?? '').trim())
    .map(r => ({
      isbn:            String(r[0]).trim(),
      priority:        String(r[1] ?? '').includes('高') ? 'high' : ('low' as CrawlPriority),
      inventoryStatus: String(r[2] ?? '').trim(),
    }))
}

// ── 筛选区 ────────────────────────────────────────────────────────
function FilterBar() {
  const { setBatchFilter } = useCrawlStore()
  const [form] = Form.useForm()

  const labelStyle = { width: 90, textAlign: 'right' as const, color: 'rgba(0,0,0,0.88)' }
  const inputStyle = { width: 280 }
  const GROUP_GAP = 40
  const ROW_GAP = 12

  const handleSearch = () => {
    const v = form.getFieldsValue()
    const [start, end] = v.createdAtRange ?? [null, null]
    setBatchFilter({
      batchId:        v.batchId     || undefined,
      batchStatus:    v.batchStatus ?? 'all',
      source:         v.source      ?? 'all',
      createdAtStart: start || undefined,
      createdAtEnd:   end   || undefined,
    })
  }

  const handleReset = () => {
    form.resetFields()
    setBatchFilter({ batchId: undefined, batchStatus: 'all', source: 'all', createdAtStart: undefined, createdAtEnd: undefined })
  }

  return (
    <Card bordered={false} style={{ margin: '12px 0 0', borderRadius: 4 }} bodyStyle={{ padding: '16px 24px' }}>
      <Form form={form} layout="horizontal" colon>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'max-content max-content', columnGap: GROUP_GAP, rowGap: ROW_GAP }}>
            <Form.Item label={<span style={labelStyle}>任务块ID</span>} name="batchId" style={{ margin: 0 }}>
              <Input placeholder="请输入任务块ID" style={inputStyle} allowClear />
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>任务块状态</span>} name="batchStatus" initialValue="all" style={{ margin: 0 }}>
              <Select style={inputStyle} options={[
                { value: 'all', label: '全部' },
                ...Object.entries(BATCH_STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label })),
              ]} />
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>抓取来源</span>} name="source" initialValue="all" style={{ margin: 0 }}>
              <Select style={inputStyle} options={SOURCE_OPTIONS} />
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

// ── 手动导入行 ────────────────────────────────────────────────────
type ManualRow = { isbn: string; priority: CrawlPriority; inventoryStatus: string }
const DEFAULT_ROW: ManualRow = { isbn: '', priority: 'high', inventoryStatus: '' }

// 库内状态选项：无资源 + 近5年年份
const INVENTORY_OPTIONS = [
  { value: '',     label: '无资源' },
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
        <span style={{ width: 140 }}>抓取优先级 <span style={{ color: '#ff4d4f' }}>*</span></span>
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
            style={{ width: 140, whiteSpace: 'nowrap' }}
            value={row.priority}
            onChange={e => update(i, { priority: e.target.value })}
          >
            <Radio value="high">高优</Radio>
            <Radio value="low">普通</Radio>
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

// ── 添加任务弹窗 ──────────────────────────────────────────────────
function AddTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addTasksBatch } = useCrawlStore()
  const [activeTab, setActiveTab]   = useState<'manual' | 'batch'>('manual')
  const [source, setSource]         = useState<CrawlSource | undefined>(undefined)
  const [manualRows, setManualRows] = useState<ManualRow[]>([{ ...DEFAULT_ROW }])
  const [batchRows, setBatchRows]   = useState<Array<{ isbn: string; priority: CrawlPriority; inventoryStatus: string }>>([])
  const [fileName, setFileName]     = useState('')

  const resetAndClose = () => {
    setManualRows([{ ...DEFAULT_ROW }]); setBatchRows([]); setFileName(''); setSource(undefined); onClose()
  }

  const handleOk = () => {
    if (!source) { message.error('请选择抓取来源'); return }
    if (activeTab === 'manual') {
      const isbnRe = /^\d{10}(\d{3})?$/
      const invalid = manualRows.find(r => !r.isbn || !isbnRe.test(r.isbn))
      if (invalid) { message.error('存在 ISBN 为空或格式不正确（须为10或13位数字）'); return }
      addTasksBatch(manualRows, source)
      message.success(`已加入 ${manualRows.length} 条任务`)
      resetAndClose()
    } else {
      if (!batchRows.length) { message.warning('请先上传文件'); return }
      addTasksBatch(batchRows, source)
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
            文件表头：<code>ISBN,抓取优先级,库内状态</code>，优先级填「高优」或「普通」，库内状态填「无资源」或年份（如 2025），支持 XLSX / CSV / TSV
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
      okText="确认" cancelText="取消" width={480} destroyOnClose
    >
      <Form layout="horizontal" colon style={{ marginBottom: 8 }}>
        <Form.Item label="抓取来源" required style={{ margin: '8px 0 4px' }}>
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

// ── 主页面 ────────────────────────────────────────────────────────
export default function BatchList() {
  const { filteredBatches, cancelBatch, tasks } = useCrawlStore()
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()

  const displayBatches = filteredBatches()

  const handleExportBatch = (batchId: number) => {
    const batchTasks = tasks.filter(t => t.batchId === batchId)
    const header = '任务ID,任务块ID,创建时间,ISBN,抓取状态,图书ID'
    const rows = batchTasks.map(t =>
      [t.id, t.batchId, t.createdAt, t.isbn, t.status, t.bookId ?? ''].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `batch-${batchId}-${Date.now()}.csv`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  const columns: TableColumnsType<CrawlBatch & { status: CrawlBatchStatus; taskCount: number }> = [
    {
      title: '任务块ID', dataIndex: 'id', width: 100,
      render: (id: number) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/book-crawl/list?batchId=${id}`)}>
          {id}
        </Button>
      ),
    },
    { title: '抓取来源', dataIndex: 'source', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt',  width: 160 },
    { title: '完成时间', dataIndex: 'finishedAt', width: 160, render: (v?: string) => v ?? '-' },
    { title: '任务数',   dataIndex: 'taskCount',  width: 80  },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: CrawlBatchStatus) => <Tag color={BATCH_STATUS_CONFIG[v].color}>{BATCH_STATUS_CONFIG[v].label}</Tag>,
    },
    {
      title: '操作', width: 120,
      render: (_, record) => record.status === 'running'
        ? <Button size="small" danger onClick={() => cancelBatch(record.id)}>取消任务</Button>
        : <Button size="small" onClick={() => handleExportBatch(record.id)}>导出任务</Button>,
    },
  ]

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0' }}>
        <span style={{ fontWeight: 600, fontSize: 18 }}>任务块列表</span>
      </div>

      <FilterBar />

      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 8px' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          添加抓取任务
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 4 }} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={displayBatches}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `共${t}条数据` }}
        />
      </Card>

      <AddTaskModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

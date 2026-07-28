import type { TableColumnsType } from 'antd'
import { Tag, Image, Progress } from 'antd'
import type { Book, OnlineStatus, BookStatus, FinishStatus } from '../../types/book'

const statusColor: Record<BookStatus, string> = {
  '已购买': 'blue',
  '已收货': 'cyan',
  '已退货': 'red',
  '已上传': 'green',
}

const onlineColor: Record<OnlineStatus, string> = {
  '上线': 'success',
  '下线': 'default',
}

const finishColor: Record<FinishStatus, string> = {
  '未完成': 'warning',
  '已完成': 'success',
}

export const bookColumns: TableColumnsType<Book> = [
  { title: 'ID', dataIndex: 'id', width: 60, fixed: 'left' },
  {
    title: '添加时间', dataIndex: 'addedAt', width: 100,
  },
  { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '语种', dataIndex: 'language', width: 90 },
  { title: '年级', dataIndex: 'grade', width: 70 },
  { title: '教材版本', dataIndex: 'textbookVersion', width: 90, render: v => v ?? '-' },
  { title: '科目', dataIndex: 'subject', width: 70 },
  { title: '图书类型', dataIndex: 'bookType', width: 90 },
  {
    title: '封面', dataIndex: 'cover', width: 70,
    render: (url: string) => <Image src={url} width={36} height={48} style={{ objectFit: 'cover' }} preview={false} />,
  },
  { title: '优先级', dataIndex: 'priority', width: 70 },
  { title: '图书学季', dataIndex: 'season', width: 80 },
  {
    title: '状态', dataIndex: 'status', width: 80,
    render: (v: BookStatus) => <Tag color={statusColor[v]}>{v}</Tag>,
  },
  {
    title: '已完成/总页数', key: 'pages', width: 130,
    render: (_, r) => (
      <span>
        {r.finishedPages}/{r.totalPages}
        <Progress percent={Math.round(r.finishedPages / r.totalPages * 100)} size="small" showInfo={false} style={{ width: 60, display: 'inline-block', marginLeft: 6 }} />
      </span>
    ),
  },
  {
    title: '完成情况', dataIndex: 'finishStatus', width: 90,
    render: (v: FinishStatus) => <Tag color={finishColor[v]}>{v}</Tag>,
  },
  { title: '补充描述', dataIndex: 'supplement', width: 90, render: v => v || '-' },
  { title: '年份', dataIndex: 'year', width: 70 },
  {
    title: '是否判断', dataIndex: 'isJudged', width: 80,
    render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '是' : '否'}</Tag>,
  },
  {
    title: '上下线状态', dataIndex: 'onlineStatus', width: 90,
    render: (v: OnlineStatus) => <Tag color={onlineColor[v]}>{v}</Tag>,
  },
  {
    title: '操作', key: 'action', width: 80, fixed: 'right',
    render: () => <a style={{ color: '#1890ff' }}>标注任务</a>,
  },
]

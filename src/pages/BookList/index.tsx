import { useEffect } from 'react'
import { Card, Table, Button, Space, message } from 'antd'
import { PlusOutlined, EditOutlined, ExportOutlined, UploadOutlined } from '@ant-design/icons'
import type { BookSearchParams } from '../../types/book'
import { useBookStore } from '../../stores/bookStore'
import SearchForm from './SearchForm'
import { bookColumns } from './columns'

export default function BookList() {
  const {
    list, total, page, pageSize, loading, selectedIds,
    setSearchParams, setPage, setSelectedIds, fetch,
  } = useBookStore()

  useEffect(() => { fetch() }, [])

  const handleSearch = (p: BookSearchParams) => {
    setSearchParams(p)
    setTimeout(fetch, 0)
  }

  const handleReset = () => {
    setSearchParams({ grade: 'all', status: 'all', finishStatus: 'all', season: 'all', source: 'all', onlineStatus: 'all' })
    setTimeout(fetch, 0)
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* 页面标题栏 */}
      <div style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>图书列表</span>
        <span style={{ color: '#999', fontSize: 13 }}>○ 旧标注任务请去→</span>
        <a href="#" style={{ fontSize: 13 }}>抄写平台</a>
      </div>

      {/* 搜索表单 */}
      <Card bordered={false} style={{ margin: '12px 0 0', borderRadius: 4 }} bodyStyle={{ padding: 0 }}>
        <SearchForm onSearch={handleSearch} onReset={handleReset} />
      </Card>

      {/* 工具栏 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 8px' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('添加图书')}>
            添加图书
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => message.info('批量添加图书')} style={{ background: '#1890ff', color: '#fff', borderColor: '#1890ff' }}>
            批量添加图书
          </Button>
          <Button icon={<EditOutlined />} onClick={() => message.info('批量更新')}>
            批量更新
          </Button>
          <Button icon={<ExportOutlined />} onClick={() => message.info('批量导出')}>
            批量导出
          </Button>
        </Space>
      </div>

      {/* 表格 */}
      <Card bordered={false} style={{ margin: '0', borderRadius: 4 }} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={bookColumns}
          dataSource={list}
          loading={loading}
          scroll={{ x: 1600 }}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys as number[]),
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共${t}条数据`,
            onChange: (p, ps) => {
              setPage(p, ps)
              setTimeout(fetch, 0)
            },
          }}
          footer={() => (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#666', fontSize: 13 }}>选中{selectedIds.length}条数据</span>
              <Space>
                <Button size="small" onClick={() => message.info('批量上线')}>批量上线</Button>
                <Button size="small" onClick={() => message.info('批量下线')}>批量下线</Button>
                <Button size="small" onClick={() => message.info('批量删除')}>批量删除</Button>
                <Button size="small" onClick={() => message.info('批量编辑')}>批量编辑</Button>
              </Space>
            </div>
          )}
        />
      </Card>
    </div>
  )
}

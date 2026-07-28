import { Form, Input, Select, Radio, DatePicker, Button, Row, Col } from 'antd'
import type { BookSearchParams } from '../../types/book'

const { RangePicker } = DatePicker

interface Props {
  onSearch: (p: BookSearchParams) => void
  onReset: () => void
}

const LANGUAGES = ['人教版', '北师大版', '苏教版', '粤教版']
const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治']
const BOOK_TYPES = ['教材', '练习册', '教辅']
const YEARS = ['2020', '2021', '2022', '2023', '2024']
const TEXTBOOK_VERSIONS = ['A版', 'B版', 'C版']
const INTEREST_RANGES = ['小学', '初中', '高中']

const toOpts = (arr: string[]) => arr.map(v => ({ value: v, label: v }))

export default function SearchForm({ onSearch, onReset }: Props) {
  const [form] = Form.useForm<BookSearchParams & { addedAtRange?: [any, any] }>()

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const { addedAtRange, ...rest } = values
    const params: BookSearchParams = { ...rest }
    if (addedAtRange?.[0]) params.addedAtStart = addedAtRange[0].format('YYYY-MM-DD')
    if (addedAtRange?.[1]) params.addedAtEnd = addedAtRange[1].format('YYYY-MM-DD')
    onSearch(params)
  }

  const handleReset = () => {
    form.resetFields()
    onReset()
  }

  const labelStyle = { minWidth: 70 }
  const inputStyle = { width: '100%' }

  return (
    <Form form={form} layout="inline" style={{ padding: '16px 24px 0' }}>
      <Row gutter={[0, 12]} style={{ width: '100%' }}>
        {/* Row 1 */}
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>ID</span>} name="ids">
            <Input placeholder="请输入ID，多个ID空格/英文逗号等分隔" style={inputStyle} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>名称</span>} name="name">
            <Input placeholder="请输入名称" style={inputStyle} />
          </Form.Item>
        </Col>

        {/* Row 2 */}
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>ISBN</span>} name="isbn">
            <Input placeholder="请输入ISBN" style={inputStyle} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>为部识别码</span>} name="departmentCode">
            <Input placeholder="请输入为部识别码" style={inputStyle} />
          </Form.Item>
        </Col>

        {/* Row 3 */}
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>语言</span>} name="language">
            <Select placeholder="请选择" allowClear options={toOpts(LANGUAGES)} style={inputStyle} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>年级</span>} name="grade" initialValue="all">
            <Select options={[{ value: 'all', label: '请选择' }, ...toOpts(['上册', '下册', '全册'])]} style={inputStyle} />
          </Form.Item>
        </Col>

        {/* Row 4 */}
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>版次</span>} name="grade" initialValue="all">
            <Radio.Group>
              <Radio value="all">全部</Radio>
              <Radio value="上册">上册</Radio>
              <Radio value="下册">下册</Radio>
              <Radio value="全册">全册</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>科目</span>} name="subject">
            <Select placeholder="请选择" allowClear options={toOpts(SUBJECTS)} style={inputStyle} />
          </Form.Item>
        </Col>

        {/* Row 5 */}
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>图书类型</span>} name="bookType">
            <Select placeholder="请选择" allowClear options={toOpts(BOOK_TYPES)} style={inputStyle} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>兴趣来源</span>} name="interestRange">
            <Select placeholder="请选择" allowClear options={toOpts(INTEREST_RANGES)} style={inputStyle} />
          </Form.Item>
        </Col>

        {/* Row 6 */}
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>状态</span>} name="status" initialValue="all">
            <Radio.Group>
              <Radio value="all">全部</Radio>
              <Radio value="已购买">已购买</Radio>
              <Radio value="已收货">已收货</Radio>
              <Radio value="已退货">已退货</Radio>
              <Radio value="已上传">已上传</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>完成情况</span>} name="finishStatus" initialValue="all">
            <Radio.Group>
              <Radio value="all">全部</Radio>
              <Radio value="未完成">未完成</Radio>
              <Radio value="已完成">已完成</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>

        {/* Row 7 */}
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>图书学季</span>} name="season" initialValue="all">
            <Radio.Group>
              <Radio value="all">全部</Radio>
              <Radio value="春季">春季</Radio>
              <Radio value="秋季">秋季</Radio>
              <Radio value="无">无</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>添加时间</span>} name="addedAtRange">
            <RangePicker placeholder={['开始日期', '截至日期']} style={inputStyle} />
          </Form.Item>
        </Col>

        {/* Row 8 */}
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>来源</span>} name="source" initialValue="all">
            <Radio.Group>
              <Radio value="all">全部</Radio>
              <Radio value="内容平台">内容平台</Radio>
              <Radio value="客户站">客户站</Radio>
              <Radio value="结构化">结构化</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>年份</span>} name="year">
            <Select placeholder="请选择" allowClear options={toOpts(YEARS)} style={inputStyle} />
          </Form.Item>
        </Col>

        {/* Row 9 */}
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>上下线状态</span>} name="onlineStatus" initialValue="all">
            <Radio.Group>
              <Radio value="all">全部</Radio>
              <Radio value="上线">上线</Radio>
              <Radio value="下线">下线</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<span style={labelStyle}>教材版本</span>} name="textbookVersion">
            <Select placeholder="请选择" allowClear options={toOpts(TEXTBOOK_VERSIONS)} style={inputStyle} />
          </Form.Item>
        </Col>

        {/* 按钮行 */}
        <Col span={24} style={{ paddingBottom: 16 }}>
          <Button type="primary" onClick={handleSearch} style={{ marginRight: 8 }}>查询</Button>
          <Button onClick={handleReset}>重置</Button>
        </Col>
      </Row>
    </Form>
  )
}

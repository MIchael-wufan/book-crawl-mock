import type { Book, CrawlTask } from '../types/book'

// ── 图书列表 mock（10 条典型 case）────────────────────────────────
export const MOCK_BOOKS: Book[] = [
  { id: 1,  name: '语文七年级上册', isbn: '9787107321456', language: '人教版', grade: '上册', subject: '语文',  bookType: '教材',  cover: 'https://picsum.photos/seed/1/60/80',  priority: 8, season: '秋季', status: '已上传', finishedPages: 280, totalPages: 280, finishStatus: '已完成', supplement: '',      year: '2023', isJudged: true,  onlineStatus: '上线', source: '内容平台', addedAt: '2023-08-10', interestRange: '初中', textbookVersion: 'A版' },
  { id: 2,  name: '数学八年级下册', isbn: '9787107298745', language: '人教版', grade: '下册', subject: '数学',  bookType: '教材',  cover: 'https://picsum.photos/seed/2/60/80',  priority: 7, season: '春季', status: '已上传', finishedPages: 210, totalPages: 240, finishStatus: '未完成', supplement: '需补充', year: '2023', isJudged: false, onlineStatus: '上线', source: '内容平台', addedAt: '2023-02-15', interestRange: '初中', textbookVersion: 'B版' },
  { id: 3,  name: '英语高一全册',   isbn: '9787107256301', language: '北师大版', grade: '全册', subject: '英语',  bookType: '教材',  cover: 'https://picsum.photos/seed/3/60/80',  priority: 9, season: '无',  status: '已收货', finishedPages: 0,   totalPages: 320, finishStatus: '未完成', supplement: '',      year: '2024', isJudged: false, onlineStatus: '下线', source: '客户站',  addedAt: '2024-01-20', interestRange: '高中' },
  { id: 4,  name: '物理九年级上册', isbn: '9787107312789', language: '人教版', grade: '上册', subject: '物理',  bookType: '练习册', cover: 'https://picsum.photos/seed/4/60/80',  priority: 5, season: '秋季', status: '已购买', finishedPages: 0,   totalPages: 180, finishStatus: '未完成', supplement: '',      year: '2023', isJudged: false, onlineStatus: '下线', source: '结构化',  addedAt: '2023-07-01' },
  { id: 5,  name: '化学高二下册',   isbn: '9787107334512', language: '苏教版', grade: '下册', subject: '化学',  bookType: '教材',  cover: 'https://picsum.photos/seed/5/60/80',  priority: 6, season: '春季', status: '已上传', finishedPages: 160, totalPages: 160, finishStatus: '已完成', supplement: '',      year: '2024', isJudged: true,  onlineStatus: '上线', source: '内容平台', addedAt: '2024-03-05', textbookVersion: 'A版' },
  { id: 6,  name: '生物八年级上册', isbn: '9787107278934', language: '人教版', grade: '上册', subject: '生物',  bookType: '教辅',  cover: 'https://picsum.photos/seed/6/60/80',  priority: 4, season: '秋季', status: '已退货', finishedPages: 0,   totalPages: 150, finishStatus: '未完成', supplement: '需补充', year: '2022', isJudged: false, onlineStatus: '下线', source: '客户站',  addedAt: '2022-09-10' },
  { id: 7,  name: '历史七年级下册', isbn: '9787107245678', language: '人教版', grade: '下册', subject: '历史',  bookType: '教材',  cover: 'https://picsum.photos/seed/7/60/80',  priority: 3, season: '春季', status: '已上传', finishedPages: 200, totalPages: 200, finishStatus: '已完成', supplement: '',      year: '2023', isJudged: true,  onlineStatus: '上线', source: '内容平台', addedAt: '2023-01-18', interestRange: '初中' },
  { id: 8,  name: '地理高一上册',   isbn: '9787107356789', language: '粤教版', grade: '上册', subject: '地理',  bookType: '教材',  cover: 'https://picsum.photos/seed/8/60/80',  priority: 5, season: '秋季', status: '已收货', finishedPages: 60,  totalPages: 190, finishStatus: '未完成', supplement: '',      year: '2024', isJudged: false, onlineStatus: '下线', source: '结构化',  addedAt: '2024-08-01', interestRange: '高中', textbookVersion: 'C版' },
  { id: 9,  name: '政治九年级全册', isbn: '9787107301234', language: '人教版', grade: '全册', subject: '政治',  bookType: '教材',  cover: 'https://picsum.photos/seed/9/60/80',  priority: 7, season: '无',  status: '已上传', finishedPages: 220, totalPages: 220, finishStatus: '已完成', supplement: '',      year: '2023', isJudged: true,  onlineStatus: '上线', source: '内容平台', addedAt: '2023-05-22' },
  { id: 10, name: '数学高三练习册', isbn: '9787107389012', language: '北师大版', grade: '全册', subject: '数学',  bookType: '练习册', cover: 'https://picsum.photos/seed/10/60/80', priority: 10, season: '无', status: '已上传', finishedPages: 400, totalPages: 400, finishStatus: '已完成', supplement: '',      year: '2024', isJudged: true,  onlineStatus: '上线', source: '内容平台', addedAt: '2024-06-15', interestRange: '高中', textbookVersion: 'B版' },
]

export const queryBooks = (
  params: Record<string, string | undefined>,
  page: number,
  pageSize: number
): { list: Book[]; total: number } => {
  let list = [...MOCK_BOOKS]
  if (params.ids) {
    const ids = params.ids.split(/[\s,，]+/).filter(Boolean).map(Number)
    list = list.filter(b => ids.includes(b.id))
  }
  if (params.name) list = list.filter(b => b.name.includes(params.name!))
  if (params.isbn) list = list.filter(b => b.isbn.includes(params.isbn!))
  if (params.language) list = list.filter(b => b.language === params.language)
  if (params.grade && params.grade !== 'all') list = list.filter(b => b.grade === params.grade)
  if (params.subject) list = list.filter(b => b.subject === params.subject)
  if (params.bookType) list = list.filter(b => b.bookType === params.bookType)
  if (params.status && params.status !== 'all') list = list.filter(b => b.status === params.status)
  if (params.finishStatus && params.finishStatus !== 'all') list = list.filter(b => b.finishStatus === params.finishStatus)
  if (params.season && params.season !== 'all') list = list.filter(b => b.season === params.season)
  if (params.source && params.source !== 'all') list = list.filter(b => b.source === params.source)
  if (params.onlineStatus && params.onlineStatus !== 'all') list = list.filter(b => b.onlineStatus === params.onlineStatus)
  if (params.year) list = list.filter(b => b.year === params.year)
  const total = list.length
  const start = (page - 1) * pageSize
  return { list: list.slice(start, start + pageSize), total }
}

// ── 抓取任务 mock（6 个典型 case，无「等待中」）────────────────────
export const MOCK_CRAWL_TASKS: CrawlTask[] = [
  {
    id: 1001, isbn: '9787107321456', status: 'running', priority: 'high',
    createdAt: '2024-07-25 10:00',
  },
  {
    id: 1002, isbn: '9787107298745', status: 'success', priority: 'high',
    bookId: 4785173,
    createdAt: '2024-07-24 14:30', finishedAt: '2024-07-24 14:35',
  },
  {
    id: 1003, isbn: '9787107256301', status: 'success', priority: 'low',
    bookId: 4801022,
    createdAt: '2024-07-23 09:15', finishedAt: '2024-07-23 09:18',
  },
  {
    id: 1004, isbn: '9787107312789', status: 'failed', priority: 'high',
    createdAt: '2024-07-22 16:45', finishedAt: '2024-07-22 16:50',
    errorMsg: '网络超时，请重试',
  },
  {
    id: 1005, isbn: '9787107334512', status: 'failed', priority: 'low',
    createdAt: '2024-07-21 11:00', finishedAt: '2024-07-21 11:02',
    errorMsg: 'ISBN 在数据源中未找到',
  },
  {
    id: 1006, isbn: '9787107278934', status: 'running', priority: 'low',
    createdAt: '2024-07-25 09:50',
  },
]

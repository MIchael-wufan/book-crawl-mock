export type BookSeason = '春季' | '秋季' | '无'
export type BookSource = '内容平台' | '客户站' | '结构化'
export type BookStatus = '已购买' | '已收货' | '已退货' | '已上传'
export type OnlineStatus = '上线' | '下线'
export type FinishStatus = '未完成' | '已完成'
export type BookGrade = '上册' | '下册' | '全册'

export interface Book {
  id: number
  name: string
  isbn: string
  language: string
  grade: BookGrade
  subject: string
  bookType: string
  cover: string
  priority: number
  season: BookSeason
  status: BookStatus
  finishedPages: number
  totalPages: number
  finishStatus: FinishStatus
  supplement: string
  year: string
  isJudged: boolean
  onlineStatus: OnlineStatus
  source: BookSource
  addedAt: string
  interestRange?: string
  textbookVersion?: string
}

export interface BookSearchParams {
  ids?: string
  name?: string
  isbn?: string
  departmentCode?: string
  language?: string
  grade?: BookGrade | 'all'
  subject?: string
  bookType?: string
  interestRange?: string
  status?: BookStatus | 'all'
  finishStatus?: FinishStatus | 'all'
  season?: BookSeason | 'all'
  source?: BookSource | 'all'
  onlineStatus?: OnlineStatus | 'all'
  year?: string
  textbookVersion?: string
  addedAtStart?: string
  addedAtEnd?: string
}

export type CrawlTaskStatus = 'pending' | 'running' | 'success' | 'failed'
export type CrawlPriority = 'high' | 'low'
export type CrawlSource = 'kd' | 'kk' | 'zyjl'
/** 任务块状态：由所属任务推导，不落盘 */
export type CrawlBatchStatus = 'running' | 'completed'

export interface CrawlBatch {
  id: number
  source: CrawlSource
  createdAt: string
  finishedAt?: string
}

export interface CrawlTask {
  id: number
  isbn: string
  status: CrawlTaskStatus
  priority: CrawlPriority
  batchId: number
  source: CrawlSource
  /** 抓取成功后由后端返回的图书 ID */
  bookId?: number
  createdAt: string
  finishedAt?: string
  errorMsg?: string
}

/** 任务列表筛选参数 */
export interface CrawlFilterParams {
  taskId?: string
  isbn?: string
  status?: CrawlTaskStatus | 'all'
  priority?: CrawlPriority | 'all'
  source?: CrawlSource | 'all'
  batchId?: string
  batchStatus?: CrawlBatchStatus | 'all'
  bookId?: string
  createdAtStart?: string
  createdAtEnd?: string
}

/** 任务块列表筛选参数 */
export interface CrawlBatchFilterParams {
  batchId?: string
  batchStatus?: CrawlBatchStatus | 'all'
  source?: CrawlSource | 'all'
  createdAtStart?: string
  createdAtEnd?: string
}

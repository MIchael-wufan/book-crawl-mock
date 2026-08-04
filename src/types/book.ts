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

/**
 * not_updated: 抓取成功，但抓取到的图书年份 <= 提交时填写的库内状态年份，内容未更新
 */
export type CrawlTaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'not_updated'
export type CrawlPriority = 'high' | 'low' | 'lowest'
export type CrawlSource = 'unlimited' | 'kd' | 'kk' | 'zyjl'
/** 任务块状态：由所属任务推导，不落盘 */
export type CrawlBatchStatus = 'running' | 'cancelling' | 'completed' | 'cancelled'

export interface CrawlBatch {
  id: number
  /** 运营提交时设定的任务名称 */
  name?: string
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
  /** 库内状态：无资源 | 年份字符串（如 "2025"） */
  inventoryStatus?: string
  /** 抓取成功后由后端返回的图书 ID */
  bookId?: number
  /** 抓取成功后返回的图书标题 */
  bookTitle?: string
  /** 抓取成功后返回的图书年份 */
  bookYear?: string
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
  inventoryStatus?: string  // 'all' | 'none' | 年份字符串
  batchId?: string
  /** 按任务块名称模糊筛选 */
  batchName?: string
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

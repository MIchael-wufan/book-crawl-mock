import { create } from 'zustand'
import type {
  Book, CrawlTask, CrawlBatch, CrawlPriority, CrawlSource,
  BookSearchParams, CrawlFilterParams, CrawlBatchFilterParams, CrawlBatchStatus,
} from '../types/book'
import { queryBooks, MOCK_CRAWL_TASKS, MOCK_CRAWL_BATCHES } from '../mock/books'
import { faker } from '@faker-js/faker/locale/zh_CN'

// ── 图书列表 store ──────────────────────────────────────────────
interface BookListState {
  list: Book[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  selectedIds: number[]
  searchParams: BookSearchParams
  setSearchParams: (p: Partial<BookSearchParams>) => void
  setPage: (page: number, pageSize?: number) => void
  setSelectedIds: (ids: number[]) => void
  fetch: () => void
}

export const useBookStore = create<BookListState>((set, get) => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  selectedIds: [],
  searchParams: { grade: 'all', status: 'all', finishStatus: 'all', season: 'all', source: 'all', onlineStatus: 'all' },

  setSearchParams: (p) => set(s => ({ searchParams: { ...s.searchParams, ...p }, page: 1 })),
  setPage: (page, pageSize) => set(s => ({ page, pageSize: pageSize ?? s.pageSize })),
  setSelectedIds: (ids) => set({ selectedIds: ids }),

  fetch: () => {
    set({ loading: true })
    setTimeout(() => {
      const { searchParams, page, pageSize } = get()
      const result = queryBooks(searchParams as Record<string, string | undefined>, page, pageSize)
      set({ list: result.list, total: result.total, loading: false })
    }, 300)
  },
}))

// ── 抓取任务 store ──────────────────────────────────────────────
interface CrawlState {
  tasks: CrawlTask[]
  batches: CrawlBatch[]
  filter: CrawlFilterParams
  batchFilter: CrawlBatchFilterParams
  setFilter: (f: Partial<CrawlFilterParams>) => void
  setBatchFilter: (f: Partial<CrawlBatchFilterParams>) => void
  addTasksBatch: (rows: Array<{ isbn: string; priority: CrawlPriority }>, source: CrawlSource) => void
  cancelBatch: (batchId: number) => void
}

let nextCrawlId = MOCK_CRAWL_TASKS.length + 1001 + 1
let nextBatchId = MOCK_CRAWL_BATCHES.length + 2001 + 1

// 已取消的任务 ID，simulateProgress 检查此集合决定是否继续推进
const cancelledTaskIds = new Set<number>()

// 支持空格 / 英文逗号 / 中文逗号分隔的多值输入，token 间为「任一命中」
const splitTokens = (raw: string): string[] => raw.split(/[\s,，]+/).filter(Boolean)
const matchesAny = (value: string, raw: string): boolean => {
  const tokens = splitTokens(raw)
  return tokens.length === 0 || tokens.some(token => value.includes(token))
}

const deriveBatchStatus = (tasks: CrawlTask[], batchId: number): CrawlBatchStatus =>
  tasks.filter(t => t.batchId === batchId).some(t => t.status === 'pending' || t.status === 'running')
    ? 'running' : 'completed'

const applyFilter = (tasks: CrawlTask[], batches: CrawlBatch[], f: CrawlFilterParams): CrawlTask[] => {
  let list = [...tasks]
  if (f.taskId)   list = list.filter(t => matchesAny(String(t.id), f.taskId!))
  if (f.isbn)     list = list.filter(t => matchesAny(t.isbn, f.isbn!))
  if (f.status && f.status !== 'all')   list = list.filter(t => t.status === f.status)
  if (f.priority && f.priority !== 'all') list = list.filter(t => t.priority === f.priority)
  if (f.source && f.source !== 'all')   list = list.filter(t => t.source === f.source)
  if (f.bookId)   list = list.filter(t => t.bookId != null && matchesAny(String(t.bookId), f.bookId!))
  if (f.batchId)  list = list.filter(t => matchesAny(String(t.batchId), f.batchId!))
  if (f.batchStatus && f.batchStatus !== 'all') {
    const batchIds = new Set(
      batches
        .filter(b => deriveBatchStatus(tasks, b.id) === f.batchStatus)
        .map(b => b.id)
    )
    list = list.filter(t => batchIds.has(t.batchId))
  }
  if (f.createdAtStart) list = list.filter(t => t.createdAt >= f.createdAtStart!)
  if (f.createdAtEnd)   list = list.filter(t => t.createdAt <= f.createdAtEnd! + ' 23:59')
  return list
}

const applyBatchFilter = (
  batches: CrawlBatch[],
  tasks: CrawlTask[],
  f: CrawlBatchFilterParams
): Array<CrawlBatch & { status: CrawlBatchStatus; taskCount: number }> => {
  let list = batches.map(b => ({
    ...b,
    status: deriveBatchStatus(tasks, b.id),
    taskCount: tasks.filter(t => t.batchId === b.id).length,
  }))
  if (f.batchId) list = list.filter(b => matchesAny(String(b.id), f.batchId!))
  if (f.batchStatus && f.batchStatus !== 'all') list = list.filter(b => b.status === f.batchStatus)
  if (f.source && f.source !== 'all') list = list.filter(b => b.source === f.source)
  if (f.createdAtStart) list = list.filter(b => b.createdAt >= f.createdAtStart!)
  if (f.createdAtEnd)   list = list.filter(b => b.createdAt <= f.createdAtEnd! + ' 23:59')
  return list
}

export const useCrawlStore = create<
  CrawlState & {
    filteredTasks: () => CrawlTask[]
    filteredBatches: () => Array<CrawlBatch & { status: CrawlBatchStatus; taskCount: number }>
  }
>((set, get) => ({
  tasks: [...MOCK_CRAWL_TASKS],
  batches: [...MOCK_CRAWL_BATCHES],
  filter: { status: 'all', priority: 'all', source: 'all', batchStatus: 'all' },
  batchFilter: { batchStatus: 'all', source: 'all' },

  setFilter: (f) => set(s => ({ filter: { ...s.filter, ...f } })),
  setBatchFilter: (f) => set(s => ({ batchFilter: { ...s.batchFilter, ...f } })),

  filteredTasks: () => applyFilter(get().tasks, get().batches, get().filter),
  filteredBatches: () => applyBatchFilter(get().batches, get().tasks, get().batchFilter),

  addTasksBatch: (rows, source) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const batchId = nextBatchId++
    const newBatch: CrawlBatch = { id: batchId, source, createdAt: now }
    const newTasks: CrawlTask[] = rows.map(r => ({
      id: nextCrawlId++,
      isbn: r.isbn,
      priority: r.priority,
      status: 'pending' as const,
      batchId,
      source,
      createdAt: now,
    }))
    set(s => ({ batches: [newBatch, ...s.batches], tasks: [...newTasks, ...s.tasks] }))
    newTasks.forEach(t => simulateProgress(t.id, batchId, set))
  },

  cancelBatch: (batchId) => {
    // 标记所有待处理/进行中任务为已取消（用 failed 表示）
    get().tasks
      .filter(t => t.batchId === batchId && (t.status === 'pending' || t.status === 'running'))
      .forEach(t => cancelledTaskIds.add(t.id))
    const finishedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
    set(s => ({
      tasks: s.tasks.map(t =>
        t.batchId === batchId && (t.status === 'pending' || t.status === 'running')
          ? { ...t, status: 'cancelled' as const, finishedAt, errorMsg: '任务已取消' }
          : t
      ),
    }))
  },
}))

// mock 进度推进（成功后带 bookId，检查取消集合）
const simulateProgress = (
  id: number,
  batchId: number,
  set: (fn: (s: CrawlState) => Partial<CrawlState>) => void,
) => {
  set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, status: 'running' } : t) }))
  let p = 0
  const timer = setInterval(() => {
    if (cancelledTaskIds.has(id)) { clearInterval(timer); return }
    p += Math.floor(Math.random() * 20) + 5
    if (p >= 100) {
      clearInterval(timer)
      const finishedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
      const bookId = faker.number.int({ min: 4000000, max: 5000000 })
      set(s => {
        const tasks = s.tasks.map(t =>
          t.id === id ? { ...t, status: 'success' as const, bookId, finishedAt } : t
        )
        // 若该批次所有任务已完成，补填 finishedAt
        const allDone = tasks
          .filter(t => t.batchId === batchId)
          .every(t => t.status === 'success' || t.status === 'failed')
        const batches = allDone
          ? s.batches.map(b => b.id === batchId ? { ...b, finishedAt } : b)
          : s.batches
        return { tasks, batches }
      })
    }
  }, 600)
}

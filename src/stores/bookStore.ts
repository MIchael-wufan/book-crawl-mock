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
  addTasksBatch: (rows: Array<{ isbn: string; priority: CrawlPriority; inventoryStatus?: string }>, source: CrawlSource, name?: string) => void
  cancelBatch: (batchId: number) => void
  /** 取消一批子任务：pending → cancelled；running 任务不中断，自然跑完变 success/failed */
  cancelTasks: (ids: number[]) => void
}

let nextCrawlId = MOCK_CRAWL_TASKS.length + 1001 + 1
let nextBatchId = MOCK_CRAWL_BATCHES.length + 2001 + 1

// 已取消的任务 ID，simulateProgress 检查此集合决定是否继续推进
const cancelledTaskIds = new Set<number>()
// 正在取消中的任务块 ID（已发出取消指令，等待后端回调）
const cancellingBatchIds = new Set<number>()

// 支持空格 / 英文逗号 / 中文逗号分隔的多值输入，token 间为「任一命中」
const splitTokens = (raw: string): string[] => raw.split(/[\s,，]+/).filter(Boolean)
const matchesAny = (value: string, raw: string): boolean => {
  const tokens = splitTokens(raw)
  return tokens.length === 0 || tokens.some(token => value.includes(token))
}

const deriveBatchStatus = (tasks: CrawlTask[], batchId: number): CrawlBatchStatus => {
  const batchTasks = tasks.filter(t => t.batchId === batchId)
  if (cancellingBatchIds.has(batchId)) return 'cancelling'
  if (batchTasks.some(t => t.status === 'pending' || t.status === 'running')) return 'running'
  if (batchTasks.every(t => t.status === 'cancelled' || t.status === 'failed' || t.status === 'success') &&
      batchTasks.some(t => t.status === 'cancelled')) return 'cancelled'
  return 'completed'
}

const applyFilter = (tasks: CrawlTask[], batches: CrawlBatch[], f: CrawlFilterParams): CrawlTask[] => {
  let list = [...tasks]
  if (f.taskId)   list = list.filter(t => matchesAny(String(t.id), f.taskId!))
  if (f.isbn)     list = list.filter(t => matchesAny(t.isbn, f.isbn!))
  if (f.status && f.status !== 'all')   list = list.filter(t => t.status === f.status)
  if (f.priority && f.priority !== 'all') list = list.filter(t => t.priority === f.priority)
  if (f.source && f.source !== 'all')   list = list.filter(t => t.source === f.source)
  if (f.inventoryStatus && f.inventoryStatus !== 'all') {
    if (f.inventoryStatus === 'none') {
      list = list.filter(t => !t.inventoryStatus || t.inventoryStatus === 'none')
    } else {
      list = list.filter(t => t.inventoryStatus === f.inventoryStatus)
    }
  }
  if (f.bookId)   list = list.filter(t => t.bookId != null && matchesAny(String(t.bookId), f.bookId!))
  if (f.batchId)  list = list.filter(t => matchesAny(String(t.batchId), f.batchId!))
  if (f.batchName) {
    const matchedIds = new Set(
      batches.filter(b => b.name && b.name.includes(f.batchName!)).map(b => b.id)
    )
    list = list.filter(t => matchedIds.has(t.batchId))
  }
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
): Array<CrawlBatch & { status: CrawlBatchStatus; taskCount: number; successCount: number }> => {
  let list = batches.map(b => {
    const batchTasks = tasks.filter(t => t.batchId === b.id)
    return {
      ...b,
      status: deriveBatchStatus(tasks, b.id),
      taskCount: batchTasks.length,
      // 已取消任务视为失败，不计入成功数
      successCount: batchTasks.filter(t => t.status === 'success').length,
    }
  })
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
    filteredBatches: () => Array<CrawlBatch & { status: CrawlBatchStatus; taskCount: number; successCount: number }>
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

  addTasksBatch: (rows, source, name) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const batchId = nextBatchId++
    const newBatch: CrawlBatch = { id: batchId, name: name?.trim() || undefined, source, createdAt: now }
    const newTasks: CrawlTask[] = rows.map(r => ({
      id: nextCrawlId++,
      isbn: r.isbn,
      priority: r.priority,
      status: 'pending' as const,
      batchId,
      source,
      inventoryStatus: r.inventoryStatus,
      createdAt: now,
    }))
    set(s => ({ batches: [newBatch, ...s.batches], tasks: [...newTasks, ...s.tasks] }))
    newTasks.forEach(t => simulateProgress(t.id, batchId, set))
  },

  cancelBatch: (batchId) => {
    // 立即进入「取消中」状态，mock 延迟 2 秒模拟后端收到抓取侧回调
    cancellingBatchIds.add(batchId)
    // 标记 pending 任务 ID，simulateProgress 检查后停止推进
    get().tasks
      .filter(t => t.batchId === batchId && t.status === 'pending')
      .forEach(t => cancelledTaskIds.add(t.id))
    // 触发 re-render 以展示「取消中」状态
    set(s => ({ tasks: [...s.tasks] }))
    setTimeout(() => {
      // 模拟后端回调：pending 任务改为 cancelled，移除 cancelling 标记
      cancellingBatchIds.delete(batchId)
      const finishedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
      set(s => {
        const tasks = s.tasks.map(t =>
          t.batchId === batchId && t.status === 'pending'
            ? { ...t, status: 'cancelled' as const, finishedAt, errorMsg: '任务已取消' }
            : t
        )
        // 若所有任务已终态，补填 batch finishedAt
        const allDone = tasks
          .filter(t => t.batchId === batchId)
          .every(t => t.status === 'success' || t.status === 'failed' || t.status === 'cancelled')
        const batches = allDone
          ? s.batches.map(b => b.id === batchId ? { ...b, finishedAt } : b)
          : s.batches
        return { tasks, batches }
      })
    }, 2000)
  },

  cancelTasks: (ids) => {
    const tasks = get().tasks
    // 只取消 pending 任务；running 任务不中断，让其跑完变 success/failed
    const pendingIds = ids.filter(id => tasks.find(t => t.id === id)?.status === 'pending')
    if (!pendingIds.length) return
    pendingIds.forEach(id => cancelledTaskIds.add(id))
    set(s => ({ tasks: [...s.tasks] }))
    setTimeout(() => {
      const finishedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
      set(s => ({
        tasks: s.tasks.map(t =>
          pendingIds.includes(t.id) && t.status === 'pending'
            ? { ...t, status: 'cancelled' as const, finishedAt }
            : t
        ),
      }))
    }, 600)
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
      const bookTitle = faker.helpers.arrayElement([
        '语文七年级上册（人教版）', '数学八年级下册（人教版）', '英语高一全册（北师大版）',
        '物理九年级上册（人教版）', '化学高二下册（苏教版）', '历史七年级下册（人教版）',
      ])
      const bookYear = String(faker.helpers.arrayElement([2022, 2023, 2024, 2025]))
      set(s => {
        const tasks = s.tasks.map(t => {
          if (t.id !== id) return t
          // 库内状态为年份时：库内年份 >= 抓取年份 → 未更新
          const inventoryYear = t.inventoryStatus && t.inventoryStatus !== 'none' && /^\d{4}$/.test(t.inventoryStatus)
            ? Number(t.inventoryStatus)
            : null
          const crawledYear = Number(bookYear)
          const finalStatus = (inventoryYear !== null && inventoryYear >= crawledYear)
            ? 'not_updated' as const
            : 'success' as const
          return { ...t, status: finalStatus, bookId, bookTitle, bookYear, finishedAt }
        })
        // 若该批次所有任务已终态（success/failed/cancelled），补填 finishedAt
        const allDone = tasks
          .filter(t => t.batchId === batchId)
          .every(t => t.status === 'success' || t.status === 'failed' || t.status === 'cancelled')
        const batches = allDone
          ? s.batches.map(b => b.id === batchId ? { ...b, finishedAt } : b)
          : s.batches
        return { tasks, batches }
      })
    }
  }, 600)
}

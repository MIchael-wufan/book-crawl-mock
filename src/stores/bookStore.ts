import { create } from 'zustand'
import type { Book, CrawlTask, CrawlPriority, BookSearchParams, CrawlFilterParams } from '../types/book'
import { queryBooks, MOCK_CRAWL_TASKS } from '../mock/books'
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
  filter: CrawlFilterParams
  setFilter: (f: Partial<CrawlFilterParams>) => void
  addTask: (isbn: string, priority: CrawlPriority) => void
  addTasksBatch: (rows: Array<{ isbn: string; priority: CrawlPriority }>) => void
}

let nextCrawlId = MOCK_CRAWL_TASKS.length + 1001 + 1

const applyFilter = (tasks: CrawlTask[], f: CrawlFilterParams): CrawlTask[] => {
  let list = [...tasks]
  if (f.taskId) list = list.filter(t => String(t.id).includes(f.taskId!))
  if (f.isbn) list = list.filter(t => t.isbn.includes(f.isbn!))
  if (f.status && f.status !== 'all') list = list.filter(t => t.status === f.status)
  if (f.priority && f.priority !== 'all') list = list.filter(t => t.priority === f.priority)
  if (f.bookId) list = list.filter(t => t.bookId != null && String(t.bookId).includes(f.bookId!))
  if (f.createdAtStart) list = list.filter(t => t.createdAt >= f.createdAtStart!)
  if (f.createdAtEnd) list = list.filter(t => t.createdAt <= f.createdAtEnd! + ' 23:59')
  return list
}

export const useCrawlStore = create<CrawlState & { filteredTasks: () => CrawlTask[] }>((set, get) => ({
  tasks: [...MOCK_CRAWL_TASKS],
  filter: { status: 'all', priority: 'all' },

  setFilter: (f) => set(s => ({ filter: { ...s.filter, ...f } })),

  filteredTasks: () => applyFilter(get().tasks, get().filter),

  addTask: (isbn, priority) => {
    const task: CrawlTask = {
      id: nextCrawlId++,
      isbn,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    }
    set(s => ({ tasks: [task, ...s.tasks] }))
    simulateProgress(task.id, set)
  },

  addTasksBatch: (rows) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const newTasks: CrawlTask[] = rows.map(r => ({
      id: nextCrawlId++,
      isbn: r.isbn,
      priority: r.priority,
      status: 'pending' as const,
      createdAt: now,
    }))
    set(s => ({ tasks: [...newTasks, ...s.tasks] }))
    newTasks.forEach(t => simulateProgress(t.id, set))
  },
}))

// mock 进度推进（成功后带 bookId）
const simulateProgress = (
  id: number,
  set: (fn: (s: CrawlState) => Partial<CrawlState>) => void
) => {
  set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, status: 'running' } : t) }))
  let p = 0
  const timer = setInterval(() => {
    p += Math.floor(Math.random() * 20) + 5
    if (p >= 100) {
      clearInterval(timer)
      const finishedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
      const bookId = faker.number.int({ min: 4000000, max: 5000000 })
      set(s => ({
        tasks: s.tasks.map(t =>
          t.id === id ? { ...t, status: 'success', bookId, finishedAt } : t
        ),
      }))
    }
  }, 600)
}

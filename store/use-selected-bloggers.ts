import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SortingState } from '@tanstack/react-table'

interface TableState {
  selectedRows: Record<string, boolean>
  currentPage: number
  pageSize: number
  pageCount: number
  globalFilter: string
  sorting: SortingState
}

interface SelectedBloggersState extends TableState {
  setSelectedRows: (rows: Record<string, boolean>) => void
  resetSelectedRows: () => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  setPageCount: (count: number) => void
  setGlobalFilter: (filter: string) => void
  updateSelection: (newSelection: Record<string, boolean>) => void
  resetPagination: () => void
  setSorting: (sorting: SortingState) => void
  reset: () => void
}

export const useSelectedBloggers = create<SelectedBloggersState>()(
  persist(
    (set) => ({
      selectedRows: {},
      currentPage: 0,
      pageSize: 10,
      pageCount: 0,
      globalFilter: '',
      sorting: [],
      setSelectedRows: (rows) => set({ selectedRows: rows }),
      resetSelectedRows: () => set({ selectedRows: {} }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setPageSize: (size) => set({ pageSize: size }),
      setPageCount: (count) => set({ pageCount: count }),
      setGlobalFilter: (filter) => set({ globalFilter: filter }),
      setSorting: (sorting) => set({ sorting }),
      updateSelection: (newSelection) => 
        set((state) => ({
          selectedRows: {
            ...state.selectedRows,
            ...newSelection
          }
        })),
      resetPagination: () => set({ 
        currentPage: 0, 
        pageSize: 10, 
        pageCount: 0 
      }),
      reset: () => set({
        selectedRows: {},
        currentPage: 0,
        pageSize: 10,
        pageCount: 0,
        globalFilter: '',
        sorting: []
      })
    }),
    {
      name: 'selected-bloggers-storage',
      partialize: (state) => ({
        selectedRows: state.selectedRows,
        currentPage: state.currentPage,
        pageSize: state.pageSize,
        pageCount: state.pageCount,
        globalFilter: state.globalFilter,
        sorting: state.sorting
      }),
      skipHydration: true
    }
  )
) 
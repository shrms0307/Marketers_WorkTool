import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CompletePageState {
  currentPage: number
  showMyProjectsOnly: boolean
  setCurrentPage: (page: number) => void
  setShowMyProjectsOnly: (value: boolean) => void
}

export const useCompletePage = create<CompletePageState>()(
  persist(
    (set) => ({
      currentPage: 1,
      showMyProjectsOnly: false,
      setCurrentPage: (page) => set({ currentPage: page }),
      setShowMyProjectsOnly: (value) => set({ showMyProjectsOnly: value }),
    }),
    {
      name: 'complete-page-storage'
    }
  )
) 
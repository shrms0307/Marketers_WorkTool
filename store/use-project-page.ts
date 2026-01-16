import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProjectPageState {
  currentPage: number
  showMyProjectsOnly: boolean
  setCurrentPage: (page: number) => void
  setShowMyProjectsOnly: (value: boolean) => void
}

export const useProjectPage = create<ProjectPageState>()(
  persist(
    (set) => ({
      currentPage: 1,
      showMyProjectsOnly: false,
      setCurrentPage: (page) => set({ currentPage: page }),
      setShowMyProjectsOnly: (value) => set({ showMyProjectsOnly: value }),
    }),
    {
      name: 'project-page-storage'
    }
  )
) 
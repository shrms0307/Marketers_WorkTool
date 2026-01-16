import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProjectStatsPageState {
  currentPage: number
  showMyProjectsOnly: boolean
  setCurrentPage: (page: number) => void
  setShowMyProjectsOnly: (value: boolean) => void
}

export const useProjectStatsPage = create<ProjectStatsPageState>()(
  persist(
    (set) => ({
      currentPage: 1,
      showMyProjectsOnly: false,
      setCurrentPage: (page) => set({ currentPage: page }),
      setShowMyProjectsOnly: (value) => set({ showMyProjectsOnly: value }),
    }),
    {
      name: 'project-stats-page-storage',
    }
  )
) 
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProjectFilterState {
  showMyProjectsOnly: boolean
  setShowMyProjectsOnly: (value: boolean) => void
}

export const useProjectFilter = create<ProjectFilterState>()(
  persist(
    (set) => ({
      showMyProjectsOnly: false,
      setShowMyProjectsOnly: (value) => set({ showMyProjectsOnly: value }),
    }),
    {
      name: 'project-filter-storage',
    }
  )
) 
import { useQuery } from '@tanstack/react-query'
import { getProjectSummary, getProjectPosts, getProjectExposure } from '@/app/(main)/complete/actions'

// 프로젝트 요약
export const useProjectSummary = (projectId: string) => {
  return useQuery({
    queryKey: ['project-summary', projectId],
    queryFn: () => getProjectSummary(projectId),
    staleTime: 5 * 60 * 1000, // 5분
  })
}

// 포스트 목록
export const useProjectPosts = (projectId: string) => {
  return useQuery({
    queryKey: ['project-posts', projectId],
    queryFn: () => getProjectPosts(projectId),
    staleTime: 5 * 60 * 1000,
  })
}

// 노출 데이터
export const useProjectExposure = (projectId: string) => {
  return useQuery({
    queryKey: ['project-exposure', projectId],
    queryFn: () => getProjectExposure(projectId),
    staleTime: 5 * 60 * 1000,
  })
} 
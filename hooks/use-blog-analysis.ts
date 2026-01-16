import { useQuery } from '@tanstack/react-query'
import { getBlogAnalysis } from '@/app/(main)/blog-analysis/actions'
import type { BlogAnalysisResponse } from '@/app/(main)/blog-analysis/actions'

export function useBlogAnalysis(blogId: string) {
  return useQuery<BlogAnalysisResponse>({
    queryKey: ['blog-analysis', blogId],
    queryFn: () => getBlogAnalysis(blogId),
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
    cacheTime: 1000 * 60 * 30, // 30분간 캐시 보관
  })
} 
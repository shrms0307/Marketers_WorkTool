import { useQuery } from '@tanstack/react-query'
import { blogApi } from '@/lib/api'
import { BlogRankingData } from '@/components/blog/blog'

export function useBlogRankings(category: string = "전체") {
  return useQuery({
    queryKey: ['blog-rankings', category],
    queryFn: () => blogApi.getRankings(category),
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
  })
} 
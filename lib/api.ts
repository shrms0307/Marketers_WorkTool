import { getBlogRankings } from "@/components/blog/blog"
import { BlogRankingData } from "@/components/blog/types"

export const blogApi = {
  getRankings: async (category: string = "전체"): Promise<BlogRankingData[]> => {
    try {
      // Server Action 직접 호출
      return await getBlogRankings(category)
    } catch (error) {
      console.error('블로그 랭킹 조회 실패:', error)
      throw error
    }
  }
} 
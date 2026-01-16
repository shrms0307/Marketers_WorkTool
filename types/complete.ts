export interface CompletePost {
  id: string
  projectId: string
  blogger_id: string
  blogger_nickname?: string
  post_url: string
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

export interface VisitorStat {
  date: string
  visitors: number
}

export interface BloggerVisitorStats {
  bloggerName: string
  stats: VisitorStat[]
}

export interface CompleteSummaryData {
  openDate: string
  endDate: string
  postCount: number
  totalLikes: number
  totalComments: number
  visitorStats: Array<{
    bloggerId: string
    bloggerName: string
    stats: Array<{
      date: string
      visitors: number | null
    }>
  }>
} 
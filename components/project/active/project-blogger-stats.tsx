'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { blogTypeBadgeVariants } from "../table-columns"
import { Button } from "@/components/ui/button"
import { BarChart2 } from "lucide-react"

interface ProjectBloggerStatsProps {
  bloggers: Array<{
    inf_blogid: string
    inf_nickname: string
    inf_profileimage?: string
    inf_address?: string
    category: string
    visitor_avg: number
    follower_count: number
    blogger_type: string
    total_post_count: number
    total_comment_count: number
    blog_startdate: string
    post?: {
      url?: string
      status?: string
      updated_at?: string
    }
    status?: string
  }>
}

export function ProjectBloggerStats({ bloggers }: ProjectBloggerStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {bloggers.map((blogger) => (
        <Card key={blogger.inf_blogid}>
          <CardHeader className="space-y-0 pb-2">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={blogger.inf_profileimage} />
                <AvatarFallback>{blogger.inf_nickname[0]}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">
                    {blogger.inf_nickname}
                  </CardTitle>
                  <Link 
                    href={`https://blog.naver.com/${blogger.inf_blogid}`}
                    target="_blank"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {blogger.category}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={blogTypeBadgeVariants[blogger.blogger_type] || ""}
                  >
                    {blogger.blogger_type}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground">방문자</div>
              <div className="text-right">{blogger.visitor_avg.toLocaleString()}</div>
              <div className="text-muted-foreground">이웃수</div>
              <div className="text-right">{blogger.follower_count.toLocaleString()}</div>
              <div className="text-muted-foreground">전체 포스팅</div>
              <div className="text-right">{blogger.total_post_count.toLocaleString()}</div>
              <div className="text-muted-foreground">전체 댓글</div>
              <div className="text-right">{blogger.total_comment_count.toLocaleString()}</div>
              <div className="text-muted-foreground">개설일</div>
              <div className="text-right">{new Date(blogger.blog_startdate).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</div>
              <div className="text-muted-foreground">이메일</div>
              <div className="text-right text-xs">
                {blogger.inf_blogid}@naver.com
              </div>
              <div className="text-muted-foreground">상태</div>
              <div className="text-right">
                <Badge variant="outline" className={
                  blogger.status === 'rejected' ? "bg-muted text-muted-foreground" :
                  blogger.post?.status === 'draft' ? "bg-gray-100 text-gray-800" :
                  blogger.post?.status === 'published' ? "bg-sky-100 text-sky-800" :
                  blogger.post?.status === 'confirmed' ? "bg-emerald-100 text-emerald-800" :
                  "bg-gray-100 text-gray-800"
                }>
                  {blogger.status === 'rejected' ? '제외됨' :
                   blogger.post?.status === 'draft' ? '작성 대기' :
                   blogger.post?.status === 'published' ? '작성 완료' :
                   blogger.post?.status === 'confirmed' ? '확인 완료' :
                   '작성 대기'}
                </Badge>
              </div>
              {blogger.post?.url && (
                <>
                  <div className="text-muted-foreground">포스트</div>
                  <div className="text-right">
                    <Link 
                      href={blogger.post.url}
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      보기
                    </Link>
                  </div>
                </>
              )}
              {blogger.post?.updated_at && (
                <>
                  <div className="text-muted-foreground">업데이트</div>
                  <div className="text-right text-xs text-muted-foreground">
                    {new Date(blogger.post.updated_at).toLocaleDateString()}
                  </div>
                </>
              )}
              <div className="col-span-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => window.open(`/blog-analysis/${blogger.inf_blogid}`, '_blank')}
                  disabled={blogger.status === 'rejected'}
                >
                  <BarChart2 className="h-4 w-4" />
                  블로그 분석
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 
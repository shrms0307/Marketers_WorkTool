'use client'

import { useState } from 'react'
import { ProjectDetailData } from "@/types/project"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarDays, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CompleteSummary } from "./completed/complete-summary"
import { CompletePosts } from "./completed/complete-posts"
import { CompleteExposure } from "./completed/complete-exposure"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { downloadProjectExcel } from "@/app/(main)/complete/actions"

interface CompleteDetailProps {
  project: ProjectDetailData
  userId?: string
}

export function CompleteDetail({ project, userId }: CompleteDetailProps) {
  const { toast } = useToast()
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      const base64Data = await downloadProjectExcel(String(project.project.id))
      const blob = new Blob([Buffer.from(base64Data, 'base64')], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.project.name}_${format(new Date(), 'yyyyMMdd')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({
        title: "엑셀 다운로드 완료",
        description: "프로젝트 데이터가 엑셀 파일로 저장되었습니다.",
      })
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error)
      toast({
        title: "엑셀 다운로드 실패",
        description: "파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 프로젝트 기본 정보 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{project.project.name}</CardTitle>
                {project.project.created_by_name && (
                  <span className="text-sm text-muted-foreground">
                    ({project.project.created_by_name})
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-4 py-1 text-base">
                완료
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">프로젝트 기간</div>
                <div className="text-sm text-muted-foreground">
                  {project.project.start_date && format(new Date(project.project.start_date), 'yyyy년 MM월 dd일', { locale: ko })} ~ {project.project.end_date && format(new Date(project.project.end_date), 'yyyy년 MM월 dd일', { locale: ko })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">참여 블로거</div>
                <div className="text-sm text-muted-foreground">
                  {project.summary.totalPosts}명
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 성과 통계 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>프로젝트 성과</CardTitle>
            <Badge variant="outline">{project.summary.totalPosts}명</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary" className="space-y-4">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="summary">요약</TabsTrigger>
                <TabsTrigger value="posts">포스트</TabsTrigger>
                <TabsTrigger value="exposure">게시글 노출</TabsTrigger>
              </TabsList>
              <Button 
                onClick={handleDownload} 
                disabled={isDownloading}
                variant="default"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isDownloading ? '다운로드 중...' : '엑셀 다운로드'}
              </Button>
            </div>

            <TabsContent value="summary">
              <CompleteSummary 
                data={{
                  totalPosts: project.summary.totalPosts,
                  completedPosts: project.summary.totalPosts,
                  totalBloggers: project.summary.totalPosts,
                  totalReactions: project.summary.totalReactions,
                  totalComments: project.summary.totalComments,
                  visitorStats: project.summary.visitorStats
                }}
                project={project.project}
              />
            </TabsContent>
            <TabsContent value="posts">
              <CompletePosts 
                posts={project.posts}
              />
            </TabsContent>
            <TabsContent value="exposure">
              <CompleteExposure 
                keywords={project.keywords}
                exposureImages={project.exposureImages}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectWithStats } from '@/types/project'
import { getProjectDetail } from '@/app/(main)/projects/[id]/actions'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ProjectStatsProps {
  projectId: number
}

export function ProjectStats({ projectId }: ProjectStatsProps) {
  const [project, setProject] = useState<ProjectWithStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProject() {
      try {
        const data = await getProjectDetail(projectId)
        setProject(data)
      } catch (error) {
        console.error('프로젝트 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [projectId])

  if (loading) {
    return <div>로딩중...</div>
  }

  if (!project) {
    return <div>프로젝트를 찾을 수 없습니다.</div>
  }

  return (
    <div className="space-y-6">
      {/* 프로젝트 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">기간</span>
              <div>
                {format(new Date(project.startDate), 'yyyy.MM.dd', { locale: ko })} ~{' '}
                {format(new Date(project.endDate), 'yyyy.MM.dd', { locale: ko })}
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">참여 블로거</span>
              <div>{project.bloggerCount}명</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">포스팅</span>
              <div>{project.completedPosts} / {project.targetPosts}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">진행률</span>
              <div>{project.progress}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 성과 통계 탭 */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">요약</TabsTrigger>
          <TabsTrigger value="posts">포스트별 통계</TabsTrigger>
          <TabsTrigger value="bloggers">블로거별 통계</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>전체 성과</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">총 조회수</span>
                  <div className="text-2xl font-bold">-</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">총 좋아요</span>
                  <div className="text-2xl font-bold">-</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">총 댓글</span>
                  <div className="text-2xl font-bold">-</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>포스트별 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                아직 수집된 데이터가 없습니다.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bloggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>블로거별 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                아직 수집된 데이터가 없습니다.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 
'use client'

import { useQuery } from '@tanstack/react-query'
import { ProjectDetailData } from '@/types/project'
import { CompleteSummary } from "@/components/complete/completed/complete-summary"
import { CompletePosts } from "@/components/complete/completed/complete-posts"
import { CompleteExposure } from "@/components/complete/completed/complete-exposure"
import { getProjectDetailData } from '@/app/(main)/complete/actions'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { ErrorScreen } from '@/components/ui/error-screen'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExcelDownloadButton } from '@/components/complete/excel-download-button'
import { useEffect } from 'react'
import { useNavbar } from "@/components/layout/navbar-provider"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ArrowLeftRight } from "lucide-react"

export default function ProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data, isLoading, error } = useQuery<ProjectDetailData>({
    queryKey: ['project', params.id],
    queryFn: () => getProjectDetailData(params.id)
  })
  const { setTitle } = useNavbar()

  useEffect(() => {
    // 이전 타이틀 저장
    const originalTitle = document.title

    if (isLoading) {
      document.title = "프로젝트 로딩 중 - 더바이럴"
    } else if (error) {
      document.title = "프로젝트 에러 - 더바이럴"
    } else if (data) {
      document.title = `${data.project.name} 성과 - 더바이럴`
      setTitle(`${data.project.name} - 프로젝트 성과`)
    }

    // cleanup 함수: 컴포넌트 언마운트 시 원래 타이틀로 복원
    return () => {
      document.title = originalTitle
    }
  }, [data, isLoading, error, setTitle])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return <ErrorScreen />
  }

  if (!data) return null

  return (
    <div className="animate-fade-in space-y-4 p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">{data.project.name}</h1>
          <span className="text-sm text-muted-foreground">
            ({data.project.created_by_name})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/projects/${params.id}`)}
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            현황 보기
          </Button>
        </div>
        <ExcelDownloadButton 
          projectId={params.id} 
          projectName={data.project.name}
          data={data}
        />
      </div>
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">요약</TabsTrigger>
          <TabsTrigger value="posts">포스트 목록</TabsTrigger>
          <TabsTrigger value="exposure">게시글 노출</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <CompleteSummary 
            data={{
              totalPosts: data.summary.totalPosts,
              completedPosts: data.summary.totalPosts,
              totalBloggers: data.summary.totalPosts,
              totalReactions: data.summary.totalReactions,
              totalComments: data.summary.totalComments,
              visitorStats: data.summary.visitorStats
            }}
            project={data.project}
          />
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <CompletePosts posts={data.posts} />
        </TabsContent>

        <TabsContent value="exposure" className="space-y-4">
          <CompleteExposure keywords={data.keywords} exposureImages={data.exposureImages} />
        </TabsContent>
      </Tabs>
    </div>
  )
} 
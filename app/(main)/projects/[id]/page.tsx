'use client'

import { useEffect, useState } from 'react'
import { PageContainer } from "@/components/page-container"
import { useNavbar } from "@/components/layout/navbar-provider"
import { ProjectDetail } from "@/components/project/project-detail"
import { getProjectDetail } from "@/app/(main)/projects/[id]/actions"
import type { ProjectWithStats } from "@/types/project"
import { createClient } from '@/lib/supabase/client'
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { setTitle } = useNavbar()
  const supabase = createClient()
  const [project, setProject] = useState<ProjectWithStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | undefined>()

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null)
        const { data: { session } } = await supabase.auth.getSession()
        const currentUserId = session?.user?.id
        setUserId(currentUserId)

        const data = await getProjectDetail(parseInt(params.id))
        if (!data) {
          throw new Error('프로젝트를 찾을 수 없습니다.')
        }
        
        setProject(data)
        setTitle(`${data.name} - 프로젝트 현황`)
      } catch (error) {
        console.error('프로젝트 현황 조회 실패:', error)
        setError(error instanceof Error ? error.message : '프로젝트 조회 중 오류가 발생했습니다.')
        setTitle('오류 발생')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id, setTitle, supabase])

  // document.title 설정
  if (loading) {
    document.title = "프로젝트 로딩 중 - 더바이럴"
  } else if (error) {
    document.title = "프로젝트 에러 - 더바이럴"
  } else if (project) {
    document.title = `${project.name} 현황 - 더바이럴`
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="space-y-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">프로젝트 정보를 불러오는 중...</p>
          </div>
        </div>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류 발생</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </PageContainer>
    )
  }

  if (!project) return null

  return (
    <PageContainer>
      <ProjectDetail project={project} userId={userId} />
    </PageContainer>
  )
} 
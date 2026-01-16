'use client'

import { useState, useEffect } from 'react'
import { ProjectWithStats, ProjectFilters, ProjectStatus } from '@/types/project'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getProjects } from '@/app/(main)/projects/actions'
import { useRouter } from 'next/navigation'
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from '@/lib/supabase/client'
import { useProjectPage } from '@/store/use-project-page'

const statusOptions = [
  { value: 'active' as const, label: '진행중' },
  { value: 'completed' as const, label: '완료' }
]

export function CompleteList() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  
  // 페이지와 필터 상태 관리
  const { currentPage, setCurrentPage, showMyProjectsOnly, setShowMyProjectsOnly } = useProjectPage()
  
  // 초기 필터 상태 설정
  const [filters, setFilters] = useState<ProjectFilters>({
    page: 1,
    limit: 12,
    status: 'active'  // 기본값을 'active'로 설정
  })

  // 필터 변경시 페이지 초기화
  const handleFilterChange = (newFilters: Partial<ProjectFilters>) => {
    setCurrentPage(1)
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1
    }))
  }

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    setFilters(prev => ({
      ...prev,
      page: newPage
    }))
  }

  // 사용자 정보 불러오기
  useEffect(() => {
    const initializeUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user)

      if (session?.user && showMyProjectsOnly) {
        setFilters(prev => ({
          ...prev,
          createdBy: session.user.id
        }))
      }
      setInitialized(true)
    }
    initializeUser()
  }, [supabase, showMyProjectsOnly])

  // 내 프로젝트만 보기 설정
  const handleMyProjectsChange = async (checked: boolean) => {
    if (user?.id) {
      setLoading(true)  // 필터 변경 시작할 때 로딩 상태로 변경
      setShowMyProjectsOnly(checked)
      
      try {
        // 먼저 새로운 필터로 전체 데이터를 확인
        const newFilters = {
          ...filters,
          createdBy: checked ? user.id : undefined
        }
        
        const result = await getProjects(newFilters)
        const totalPages = Math.ceil(result.total / (filters.limit || 12))
        
        // 현재 페이지가 새로운 총 페이지 수보다 크면 마지막 페이지로 이동
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages)
          setFilters(prev => ({
            ...prev,
            ...newFilters,
            page: totalPages
          }))
        } else {
          // 현재 페이지가 유효하면 페이지는 유지한 채로 필터만 업데이트
          setFilters(prev => ({
            ...prev,
            ...newFilters,
            page: currentPage
          }))
        }
      } catch (error) {
        console.error('프로젝트 필터링 중 오류:', error)
      }
    }
  }

  // 프로젝트 목록 조회
  useEffect(() => {
    if (!initialized) return;

    let isMounted = true;  // 컴포넌트 마운트 상태 추적

    async function fetchProjects() {
      try {
        const result = await getProjects({
          ...filters,
          page: currentPage
        })
        
        // 컴포넌트가 여전히 마운트된 상태일 때만 상태 업데이트
        if (isMounted) {
          setProjects(result.projects)
          setTotal(result.total)
          setLoading(false)  // 데이터 설정 후 로딩 상태 해제
        }
      } catch (error) {
        console.error('프로젝트 목록 조회 실패:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchProjects()

    // 클린업 함수
    return () => {
      isMounted = false
    }
  }, [filters, currentPage, initialized])

  // 필터 영역
  const FilterSection = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {statusOptions.map(option => (
            <Button
              key={option.value}
              variant={filters.status === option.value ? "default" : "outline"}
              onClick={() => handleFilterChange({ status: option.value })}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox 
            id="myProjects"
            checked={showMyProjectsOnly}
            onCheckedChange={handleMyProjectsChange}
          />
          <label 
            htmlFor="myProjects" 
            className="text-sm text-muted-foreground cursor-pointer"
          >
            내 프로젝트만 보기
          </label>
        </div>
      </div>
      <Input
        placeholder="프로젝트 검색..."
        className="w-72"
        value={filters.search || ''}
        onChange={(e) => handleFilterChange({ search: e.target.value })}
      />
    </div>
  )

  // 로딩 중이거나 이전 데이터가 있는 경우의 처리
  if (loading) {
    return (
      <div className="space-y-4">
        <FilterSection />
        <div className="flex items-center justify-center h-[200px]">
          <div className="text-muted-foreground">로딩중...</div>
        </div>
      </div>
    )
  }

  // 데이터가 없는 경우 (로딩 중이 아닐 때만 표시)
  if (!loading && !projects.length) {
    return (
      <div className="space-y-4">
        <FilterSection />
        <div className="flex items-center justify-center h-[200px]">
          <div className="text-muted-foreground">
            프로젝트가 없습니다.
          </div>
        </div>
      </div>
    )
  }

  // 프로젝트 목록 표시
  return (
    <div className="space-y-4">
      <FilterSection />
      <div className="grid grid-cols-3 gap-4">
        {projects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          이전
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentPage} / {Math.ceil(total / (filters.limit || 12))} 페이지
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(Math.min(currentPage + 1, Math.ceil(total / (filters.limit || 12))))}
          disabled={currentPage >= Math.ceil(total / (filters.limit || 12))}
        >
          다음
        </Button>
      </div>
    </div>
  )
}

// 프로젝트 카드 컴포넌트
function ProjectCard({ project }: { project: ProjectWithStats }) {
  const router = useRouter()

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy.MM.dd', { locale: ko })
    } catch (error) {
      return '날짜 오류'
    }
  }

  return (
    <Card 
      className="hover:border-primary/50 cursor-pointer transition-colors"
      onClick={() => router.push(`/complete/${project.id}`)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {project.name} <span className="text-sm text-muted-foreground">({project.createdByName})</span>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
              {project.status === 'active' ? '진행중' : '완료'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">기간</span>
            <span>
              {formatDate(project.startDate)} ~{' '}
              {formatDate(project.endDate)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">참여 블로거</span>
            <span>{project.bloggerCount}명</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">포스팅 / 목표 포스팅</span>
            <span>{project.completedPosts} / {project.targetPosts}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>진행률</span>
            <span>{project.progress}%</span>
          </div>
          <Progress value={project.progress} />
        </div>
      </CardContent>
    </Card>
  )
} 
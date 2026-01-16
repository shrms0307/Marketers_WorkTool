'use client'

import { useState, useEffect, useMemo } from 'react'
import { ProjectWithStats, ProjectBlogger } from "@/types/project"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarDays, Users, FileText, Clock, Edit2, Check, X, Trash2, ArrowLeftRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { canEditProject } from "@/lib/auth"
import { ProjectBloggersTable } from "./active/project-bloggers-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectBloggerStats } from "./active/project-blogger-stats"
import { ProjectBloggerCharts } from "./active/project-blogger-charts"
import { 
  getProjectDetail, 
  updateProject,
  updateProjectMemo,
  updateProjectStatus  // 추가
} from '@/app/(main)/projects/[id]/actions'
import { updateProjectBloggerStatus } from '@/components/project/actions'
import { toast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { getProjectSummary } from '@/app/(main)/projects/[id]/actions'
import { CompleteProjectDialog } from "./complete-dialog/complete-project-dialog"
import { getBlogPostStats } from '@/app/(main)/actions/blog-post'
import { ProjectKeywords } from "./project-keywords"
import { getProjectBloggers } from './actions'
import { ProjectDataTable } from "./project-data-table"
import { getColumns } from "./table-columns"
import { TableActions } from "./table-actions"
import { RemoveBloggersDialog } from "./remove-bloggers-dialog"
import { RestoreBloggersDialog } from "./restore-bloggers-dialog"
import { useRouter } from 'next/navigation'
import { Row } from "@tanstack/react-table"

interface ProjectDetailProps {
  project: ProjectWithStats
  userId?: string
}

export function ProjectDetail({ project, userId }: ProjectDetailProps) {
  const router = useRouter()
  const [isEditingBasic, setIsEditingBasic] = useState(false)
  const [basicEditData, setBasicEditData] = useState({
    name: project.name,
    startDate: new Date(project.startDate),
    endDate: new Date(project.endDate),
  })

  const [isEditingTarget, setIsEditingTarget] = useState(false)
  const [targetEditData, setTargetEditData] = useState({
    targetPosts: project.targetPosts
  })

  const [isEditingMemo, setIsEditingMemo] = useState(false)
  const [memoEditData, setMemoEditData] = useState(project.promotion_memo || '')

  const { toast } = useToast()
  const [data, setData] = useState<ProjectWithStats>({
    ...project,
    bloggers: project.bloggers.map(blogger => ({
      ...blogger,
      inf_profileimage: blogger.inf_profileimage || '',
      status: blogger.status || 'pending'
    }))
  })
  const [loading, setLoading] = useState(true)  // 초기 로딩 상태를 true로 설정
  const [key, setKey] = useState(0)
  const [summaryData, setSummaryData] = useState<any>(null)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  
  // 정렬된 블로거 데이터 계산
  const sortedBloggers = useMemo(() => {
    return [...data.bloggers].sort((a, b) => {
      // rejected 상태인 블로거를 하단으로
      const aRejected = a.status === 'rejected'
      const bRejected = b.status === 'rejected'
      if (aRejected !== bRejected) {
        return aRejected ? 1 : -1
      }
      // 같은 상태면 닉네임으로 정렬
      return a.inf_nickname.localeCompare(b.inf_nickname)
    })
  }, [data.bloggers])
  
  // 페이지네이션을 위한 데이터 계산
  const totalPages = Math.ceil((sortedBloggers.length || 0) / pageSize)
  const paginatedBloggers = sortedBloggers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const [selectedRows, setSelectedRows] = useState<Row<ProjectBlogger>[]>([])
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [rejectedBloggers, setRejectedBloggers] = useState<Array<{
    inf_blogid: string
    inf_nickname: string
  }>>([])

  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)

  const canEdit = userId === project.createdBy

  // 데이터 리프레시 함수
  const refreshData = async () => {
    try {
      setLoading(true)
      const response = await getProjectBloggers(project.id.toString())
      setData(prev => ({
        ...prev,
        bloggers: response.bloggers.map(blogger => ({
          ...blogger,
          inf_profileimage: blogger.inf_profileimage || '',
          status: blogger.status || 'pending'
        }))
      }))
      setRejectedBloggers(response.rejectedBloggers)
      setKey(prev => prev + 1)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      toast({
        variant: "destructive",
        title: "오류",
        description: "프로젝트 데이터를 불러오는데 실패했습니다."
      })
    } finally {
      setLoading(false)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    refreshData()
  }, [project.id])

  // 완료된 프로젝트의 요약 데이터 로드
  useEffect(() => {
    if (project.status === 'completed') {
      getProjectSummary(project.id)
        .then(data => setSummaryData(data))
        .catch(error => {
          console.error('요약 데이터 로드 실패:', error)
          toast({
            variant: "destructive",
            title: "오류",
            description: "요약 데이터를 불러오는데 실패했습니다."
          })
        })
    }
  }, [project.id, project.status])

  // 로딩 중일 때 표시할 컴포넌트
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">프로젝트 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 날짜 포맷팅 헬퍼
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy년 MM월 dd일', { locale: ko })
  }

  // 남은 기간 계산 함수 수정
  const getRemainingDays = () => {
    const today = new Date()
    const endDate = new Date(data.endDate)
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // 은 기간 표시 컴포넌트
  const RemainingDays = () => {
    const days = getRemainingDays()
    if (days > 0) {
      return <span className="text-sm text-muted-foreground">{days}일 남음</span>
    } else if (days < 0) {
      return <span className="text-sm text-red-500">{Math.abs(days)}일 초과</span>
    }
    return <span className="text-sm text-yellow-500">오늘 마감</span>
  }

  // 기본 정보 저장
  const handleSaveBasic = async () => {
    try {
      await updateProject(project.id, userId!, {
        ...basicEditData,
        targetPosts: data.targetPosts
      })
      setIsEditingBasic(false)
      await refreshData()
      toast({
        title: "공",
        description: "프로젝트 정보가 수정되었습니다."
      })
    } catch (error) {
      console.error('Project update error:', error)
      toast({
        variant: "destructive",
        title: "오류",
        description: error instanceof Error ? error.message : "프로젝트 수정에 실패했습니다."
      })
    }
  }

  // 목표 포스팅 저장
  const handleSaveTarget = async () => {
    try {
      await updateProject(project.id, userId!, {
        name: project.name,
        startDate: new Date(project.startDate),
        endDate: new Date(project.endDate),
        ...targetEditData
      })
      setIsEditingTarget(false)
      await refreshData()
      toast({
        title: "성공",
        description: "목표 포스팅이 수정되었습니다."
      })
    } catch (error) {
      console.error('Target posts update error:', error)
      toast({
        variant: "destructive",
        title: "오류",
        description: error instanceof Error ? error.message : "목표 포스팅 수정에 실패했습니다."
      })
    }
  }

  // 날짜 선택 UI 포넌트
  const DateSelect = ({ 
    date, 
    onSelect 
  }: { 
    date: Date
    onSelect: (date: Date | undefined) => void 
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP', { locale: ko }) : <span>날짜 선택</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )

  // 탭 구성 통합
  const tabs = [
    { value: 'list', label: '목록' },
    { value: 'stats', label: '지표' },
    { value: 'charts', label: '차트' }
  ]

  // 완료 처리 핸들러 추가
  const handleComplete = async () => {
    try {
      console.log('Starting project completion:', project.id)
      
      // 프성화된 블로거의 포스트 데이터 수집
      const activeBloggers = data.bloggers.filter(b => b.status !== 'rejected')
      const postsData = await Promise.all(
        activeBloggers.map(async blogger => {
          if (!blogger.post_url) return null
          const stats = await getBlogPostStats(blogger.post_url)
          return {
            blogId: blogger.inf_blogid,
            postUrl: blogger.post_url,
            likeCount: stats.likeCount,
            commentCount: stats.commentCount,
            postDate: stats.postDate
          }
        })
      )

      // 프로젝트 상태 업데이트
      await updateProjectStatus(project.id, 'completed')
      
      setShowCompleteDialog(false)
      
      toast({
        title: "성공",
        description: "프로젝트가 완료 처리되었습니다."
      })

      // 페이지 새로고침
      window.location.reload()
      
    } catch (error) {
      console.error('프로젝트 완료 처리 실패:', error)
      toast({
        variant: "destructive",
        title: "오류",
        description: "프로젝트 완료 처리에 실패했습니다."
      })
    }
  }

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  // 선택된 블로거 제거 핸들러
  const handleRemove = async () => {
    try {
      await updateProjectBloggerStatus(
        selectedRowIds.map(id => ({
          blogId: id,
          status: 'rejected'
        })),
        project.id.toString()
      )
      
      // 제거된 블로거 정보 저장
      const removedBloggers = data.bloggers
        .filter(b => selectedRowIds.includes(b.inf_blogid))
        .map(b => ({
          inf_blogid: b.inf_blogid,
          inf_nickname: b.inf_nickname
        }))
      setRejectedBloggers(prev => [...prev, ...removedBloggers])
      
      await refreshData()
      setSelectedRows([])
      setSelectedRowIds([])
      
      toast({
        title: "성공",
        description: "선택한 블로거가 제거되었습니다."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "블로거 제거에 실패했습니다."
      })
    }
  }

  // 제거된 블로거 복구 핸들러
  const handleRestore = async (bloggerIds: string[]) => {
    try {
      await updateProjectBloggerStatus(
        bloggerIds.map(id => ({
          blogId: id,
          status: 'pending'
        })),
        project.id.toString()
      )
      
      setRejectedBloggers(prev => 
        prev.filter(b => !bloggerIds.includes(b.inf_blogid))
      )
      await refreshData()
      
      toast({
        title: "성공",
        description: "선택한 블로거가 복구되었습니다."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "블로거 복구에 실패했습니다."
      })
    }
  }

  const handleSelectedRowsChange = (rows: Row<ProjectBlogger>[], ids: string[]) => {
    console.log('Selected rows:', rows)
    console.log('Selected ids:', ids)
    setSelectedRows(rows)
    setSelectedRowIds(ids)
  }

  return (
    <div className="space-y-6">
      {/* 프로젝트 기본 정보 - 상태에 따라 다르게 표시 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{project.name}</CardTitle>
                <span className="text-sm text-muted-foreground">
                  ({project.createdByName})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/complete/${project.id}`)}
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  성과 보기
                </Button>
                {project.status === 'cancelled' ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={userId !== project.createdBy}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>프로젝트 활성화</AlertDialogTitle>
                        <AlertDialogDescription>
                          이 프로젝트를 다시 활성화하시겠습니까? 프로젝트가 진행중 상태로 변경됩니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              await updateProjectStatus(project.id, 'active')
                              toast({
                                title: "성공",
                                description: "프로젝트가 활성화되었습니다."
                              })
                              window.location.reload()
                            } catch (error) {
                              toast({
                                variant: "destructive",
                                title: "오류",
                                description: "프로젝트 활성화에 실패했습니다."
                              })
                            }
                          }}
                        >
                          확인
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={userId !== project.createdBy}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>프로젝트 취소</AlertDialogTitle>
                        <AlertDialogDescription>
                          정말로 이 프로젝트를 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              await updateProjectStatus(project.id, 'cancelled')
                              toast({
                                title: "성공",
                                description: "프로젝트가 취소되었습니다."
                              })
                              window.location.reload()
                            } catch (error) {
                              toast({
                                variant: "destructive",
                                title: "오류",
                                description: "프로젝트 취소에 실패했습니다."
                              })
                            }
                          }}
                        >
                          확인
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            <Badge 
              variant={project.status === 'active' ? 'default' : 'secondary'}
              className="px-4 py-1 text-base"
            >
              {project.status === 'active' 
                ? '진행중' 
                : project.status === 'completed' 
                  ? '완료' 
                  : '취소됨'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {project.status === 'active' ? (
            // 진행중인 프로젝트 상세 정보
            <div className="grid grid-cols-2 gap-6">
              {/* 기존의 포스팅 현황과 프로젝트 현황 섹션 */}
              <div className="space-y-4">
                <h3 className="font-semibold">포스팅 현황</h3>
                <div className="grid gap-4">
                  {/* 목표 포스팅 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">목표 포스팅</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          {isEditingTarget ? (
                            <Input
                              type="number"
                              value={targetEditData.targetPosts}
                              onChange={(e) => setTargetEditData(prev => ({
                                ...prev,
                                targetPosts: parseInt(e.target.value) || 0
                              }))}
                              className="w-20 h-8"
                              min={0}
                            />
                          ) : (
                            <span>{data.targetPosts}개</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        {isEditingTarget ? (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleSaveTarget}
                              className="h-8"
                            >
                              저장
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setTargetEditData({ targetPosts: project.targetPosts })
                                setIsEditingTarget(false)
                              }}
                              className="h-8"
                            >
                              취소
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingTarget(true)}
                            className="h-8"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            수정
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 완료된 포스팅 */}
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">완료된 포스팅</div>
                      <div className="text-sm text-muted-foreground">
                        {project.completedPosts}개
                      </div>
                    </div>
                  </div>

                  {/* 진행률 */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">진행률</span>
                      <span className="text-muted-foreground">{data.progress}%</span>
                    </div>
                    <Progress value={data.progress} className="h-2" />
                  </div>
                </div>
              </div>

              {/* 프로젝트 현황 */}
              <div className="space-y-4">
                <h3 className="font-semibold">프로젝트 현황</h3>
                <div className="grid gap-4">
                  {/* 프로젝트 기간 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">프로젝트 기간</div>
                        <div className="text-sm text-muted-foreground">
                          {isEditingBasic ? (
                            <div className="flex items-center gap-2">
                              <DateSelect
                                date={basicEditData.startDate}
                                onSelect={(date) => date && setBasicEditData(prev => ({
                                  ...prev,
                                  startDate: date
                                }))}
                              />
                              <span>~</span>
                              <DateSelect
                                date={basicEditData.endDate}
                                onSelect={(date) => date && setBasicEditData(prev => ({
                                  ...prev,
                                  endDate: date
                                }))}
                              />
                            </div>
                          ) : (
                            <span>{formatDate(data.startDate)} ~ {formatDate(data.endDate)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        {isEditingBasic ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSaveBasic}
                            >
                              저장
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setBasicEditData({
                                  name: project.name,
                                  startDate: new Date(project.startDate),
                                  endDate: new Date(project.endDate),
                                })
                                setIsEditingBasic(false)
                              }}
                            >
                              취소
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingBasic(true)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            수정
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 남은 기간 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">남은 기간</div>
                        <div>
                          <RemainingDays />
                        </div>
                      </div>
                    </div>
                    {canEdit && project.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setShowCompleteDialog(true)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        완료
                      </Button>
                    )}
                  </div>

                  {/* 참여 블로거 */}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">참여 블로거</div>
                      <div className="text-sm text-muted-foreground">
                        {project.bloggerCount}명
                      </div>
                    </div>
                  </div>

                  {/* 프로모션 메모 추가 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">프로모션</div>
                        <div className="text-sm text-muted-foreground">
                          {isEditingMemo ? (
                            <Input
                              value={memoEditData}
                              onChange={(e) => setMemoEditData(e.target.value)}
                              className="w-[300px] h-8"
                              placeholder="프로모션 메모 입력"
                            />
                          ) : (
                            <span>{data.promotion_memo || '-'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        {isEditingMemo ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await updateProjectMemo(project.id, userId!, memoEditData)
                                  setData(prev => ({
                                    ...prev,
                                    promotion_memo: memoEditData
                                  }))
                                  setIsEditingMemo(false)
                                  toast({
                                    title: "성공",
                                    description: "메모가 저장되었습니다."
                                  })
                                } catch (error) {
                                  toast({
                                    variant: "destructive",
                                    title: "오류",
                                    description: "메모 저장에 실패했습니다."
                                  })
                                }
                              }}
                            >
                              저장
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMemoEditData(data.promotion_memo || '')
                                setIsEditingMemo(false)
                              }}
                            >
                              취소
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingMemo(true)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            수정
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // 완료된 프로젝트는 간단한 정보만 표시
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">프로젝트 기간</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(project.startDate)} ~ {formatDate(project.endDate)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">참여 블로거</div>
                  <div className="text-sm text-muted-foreground">
                    {project.bloggerCount}명
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 프로젝트 키워드 카드 */}
      <ProjectKeywords
        projectId={project.id}
        keywords={data.keywords || []}
        canEdit={canEdit && project.status === 'active'}
        onUpdate={(keywords) => setData(prev => ({ ...prev, keywords }))}
      />

      {/* 상태에 따라 다른 탭과 컴포넌트 렌더링 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>참여 블로거</CardTitle>
            <Badge variant="outline">{project.bloggerCount}명</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              {tabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="list">
              <div className="space-y-4">
                {project.status === 'active' && (
                  <TableActions 
                    projectId={project.id.toString()}
                    hasSelectedRows={selectedRowIds.length > 0}
                    selectedRows={selectedRows}
                    canEdit={canEdit}
                    rejectedBloggers={rejectedBloggers}
                    updateDateTime={data.updatedAt}
                    onRemove={() => setShowRemoveDialog(true)}
                    onRestore={() => setShowRestoreDialog(true)}
                  />
                )}
                <div className="rounded-md border">
                  <ProjectDataTable
                    key={key}
                    columns={getColumns(
                      project.id.toString(), 
                      refreshData, 
                      project.status === 'active',
                      userId,
                      project.createdBy
                    )}
                    data={paginatedBloggers}
                    onSelectedRowsChange={handleSelectedRowsChange}
                  />
                </div>
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    이전
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentPage} / {totalPages} 페이지
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    다음
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="stats">
              <ProjectBloggerStats 
                bloggers={data.bloggers.map(blogger => ({
                  ...blogger,
                  inf_profileimage: blogger.inf_profileimage || '',
                  status: blogger.status || 'pending'
                }))} 
              />
            </TabsContent>
            <TabsContent value="charts">
              <ProjectBloggerCharts bloggers={data.bloggers} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CompleteProjectDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        projectId={project.id}
        bloggers={data.bloggers.map(blogger => ({
          inf_blogid: blogger.inf_blogid,
          post_url: blogger.post?.url,
          status: blogger.status || 'pending'
        }))}
        onSuccess={async (postsData) => {
          try {
            // 프로젝트 상태 업데이트
            await updateProjectStatus(project.id, 'completed')
            
            setShowCompleteDialog(false)
            
            toast({
              title: "성공",
              description: "프로젝트가 완료 처리되었습니다."
            })

            // 페이지 새로고침
            window.location.reload()
            
          } catch (error) {
            console.error('프로젝트 완료 처리 실패:', error)
            toast({
              variant: "destructive",
              title: "오류",
              description: "프로젝트 완료 처리에 실패했습니다."
            })
          }
        }}
      />

      <RemoveBloggersDialog
        open={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
        selectedBloggers={data.bloggers
          .filter(b => selectedRowIds.includes(b.inf_blogid))
          .map(b => ({
            inf_blogid: b.inf_blogid,
            inf_nickname: b.inf_nickname
          }))}
        onConfirm={handleRemove}
      />

      <RestoreBloggersDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        rejectedBloggers={rejectedBloggers}
        onConfirm={handleRestore}
      />
    </div>
  )
} 
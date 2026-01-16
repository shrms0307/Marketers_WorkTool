'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { getBlogPostStats } from '@/app/(main)/actions/blog-post'
import { updateProjectStatus } from '@/app/(main)/projects/[id]/actions'
import { Loader2 } from "lucide-react"
import { completeProject } from './complete/actions'  // 경로 수정

interface CompleteProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  bloggers: Array<{
    inf_blogid: string
    post_url?: string
    status: string
  }>
  onSuccess: () => void
}

interface ProcessingStep {
  bloggerId: string
  status: 'pending' | 'processing' | 'success' | 'error'
  message?: string
}

export function CompleteProjectDialog({
  open,
  onOpenChange,
  projectId,
  bloggers,
  onSuccess
}: CompleteProjectDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [steps, setSteps] = useState<ProcessingStep[]>([])
  const [progress, setProgress] = useState(0)

  // 모달 닫기 핸들러
  const handleOpenChange = (open: boolean) => {
    if (!isProcessing) {  // 처리 중이 아닐 때만 닫기 가능
      if (!open) {
        setError(null)  // 모달 닫을 때 에러 초기화
      }
      onOpenChange(open)
    }
  }

  // 완료 처리 핸들러
  const handleComplete = async () => {
    try {
      setIsProcessing(true)
      setError(null)
      setProgress(0)

      // 활성화된 블로거만 필터링
      const activeBloggers = bloggers.filter(b => b.status !== 'rejected')
      
      // URL이 는 블로거 확인
      const bloggersWithoutUrl = activeBloggers.filter(b => !b.post_url)
      if (bloggersWithoutUrl.length > 0) {
        throw new Error(
          '다음 블로거의 URL이 없습니다:\n' +
          bloggersWithoutUrl.map(b => `• ${b.inf_blogid}`).join('\n')
        )
      }

      // 초기 단계 설정
      setSteps(activeBloggers.map(b => ({
        bloggerId: b.inf_blogid,
        status: 'pending'
      })))

      // 포스트 데이터 수집
      const postsData = []
      for (let i = 0; i < activeBloggers.length; i++) {
        const blogger = activeBloggers[i]
        
        setSteps(prev => prev.map(step => 
          step.bloggerId === blogger.inf_blogid
            ? { ...step, status: 'processing' }
            : step
        ))

        const stats = await getBlogPostStats(blogger.post_url!)
        if (!stats.isValid) {
          throw new Error(`${blogger.inf_blogid}: 포스트 데이터를 가져올 수 없습니다.`)
        }

        postsData.push({
          blogId: blogger.inf_blogid,
          postUrl: blogger.post_url!,
          likeCount: stats.likeCount,
          commentCount: stats.commentCount,
          postDate: stats.postDate
        })

        setSteps(prev => prev.map(step => 
          step.bloggerId === blogger.inf_blogid
            ? { ...step, status: 'success' }
            : step
        ))

        setProgress(((i + 1) / activeBloggers.length) * 100)
      }

      // 프로젝트 완료 처리
      await completeProject(projectId, postsData)
      
      onSuccess()
      onOpenChange(false)

    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        {isProcessing ? (
          <div className="space-y-4">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <h3 className="mt-2 font-semibold">프로젝트 완료 처리 중...</h3>
            </div>
            <Progress value={progress} />
            <div className="space-y-2">
              {steps.map(step => (
                <div 
                  key={step.bloggerId}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{step.bloggerId}</span>
                  <span className={
                    step.status === 'success' ? 'text-green-500' :
                    step.status === 'error' ? 'text-red-500' :
                    step.status === 'processing' ? 'text-blue-500' :
                    'text-gray-500'
                  }>
                    {step.status === 'success' ? '완료' :
                     step.status === 'error' ? '실패' :
                     step.status === 'processing' ? '처리중' :
                     '대기중'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-500">완료 처리 실패</AlertDialogTitle>
              <AlertDialogDescription className="mt-4 space-y-2">
                <div className="font-medium">다음 문제를 해결한 후 다시 시도해주세요:</div>
                <div className="whitespace-pre-line text-sm text-muted-foreground">
                  {error}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setError(null)
                onOpenChange(false)
              }}>
                닫기
              </AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>프로젝트 완료</AlertDialogTitle>
              <AlertDialogDescription>
                프로젝트를 완료 처리하시겠습니까?
                <br />
                완료된 프로젝트는 더 이상 수정할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleComplete}>
                확인
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
} 
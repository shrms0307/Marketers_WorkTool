'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"
import { getBlogPostStats } from '@/app/(main)/actions/blog-post'
import { completeProject } from '@/app/(main)/projects/[id]/actions'
import { toast } from "@/hooks/use-toast"

interface CompleteProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  bloggers: Array<{
    inf_blogid: string
    post_url?: string
    status: string
  }>
  onSuccess: (postsData: any[]) => void  // 수집된 데이터를 전달하도록 수정
}

export function CompleteProjectDialog({
  open,
  onOpenChange,
  projectId,
  bloggers,
  onSuccess
}: CompleteProjectDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    try {
      setIsProcessing(true)

      // 활성화된 블로거의 포스트 데이터 수집
      const activeBloggers = bloggers.filter(b => b.status !== 'rejected')
      const postsData = await Promise.all(
        activeBloggers.map(async blogger => {
          try {
            if (!blogger.post_url) return null
            const stats = await getBlogPostStats(blogger.post_url)
            return {
              blogId: blogger.inf_blogid,
              postUrl: blogger.post_url,
              likeCount: stats.isValid ? stats.likeCount : null,
              commentCount: stats.isValid ? stats.commentCount : null,
              postDate: stats.isValid ? stats.postDate : null
            }
          } catch (error) {
            console.error(`데이터 수집 실패 (${blogger.inf_blogid}):`, error)
            return {
              blogId: blogger.inf_blogid,
              postUrl: blogger.post_url,
              likeCount: null,
              commentCount: null,
              postDate: null
            }
          }
        })
      )

      // 수집된 데이터와 함께 성공 콜백 호출
      await completeProject(projectId, postsData.filter(Boolean))
      onSuccess()
      
    } catch (error) {
      console.error('프로젝트 완료 처리 실패:', error)
      toast({
        variant: "destructive",
        title: "오류",
        description: "프로젝트 완료 처리에 실패했습니다."
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>프로젝트 완료</AlertDialogTitle>
          <AlertDialogDescription>
            {isProcessing ? (
              '블로그 데이터를 수집하고 있습니다...'
            ) : (
              <>
                프로젝트를 완료 처리하시겠습니까?
                <br />
                완료된 프로젝트는 더 이상 수정할 수 없습니다.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isProcessing ? (
          <div className="py-6">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : (
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
} 
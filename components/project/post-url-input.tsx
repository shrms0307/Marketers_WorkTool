'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ExternalLink, Pencil, Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updateProjectPost } from "@/components/project/actions"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface PostUrlInputProps {
  projectId: string
  bloggerId: string
  post?: {
    url: string
    status: 'draft' | 'published' | 'rejected' | 'confirmed'
    created_at: string
  }
  disabled?: boolean
  onSuccess?: () => Promise<void>
}

export function PostUrlInput({
  projectId,
  bloggerId,
  post,
  disabled = false,
  onSuccess
}: PostUrlInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tempUrl, setTempUrl] = useState(post?.url || '')
  const { toast } = useToast()

  const handleSave = async () => {
    if (!projectId || !tempUrl) return

    try {
      setLoading(true)
      await updateProjectPost(projectId, bloggerId, tempUrl)
      
      await onSuccess?.()
      
      setIsEditing(false)
      toast({
        title: "성공",
        description: "포스트 URL이 저장되었습니다."
      })
    } catch (error) {
      console.error('URL 저장 실패:', error)
      toast({
        variant: "destructive",
        title: "오류",
        description: error instanceof Error 
          ? error.message 
          : "URL 저장에 실패했습니다."
      })
    } finally {
      setLoading(false)
    }
  }

  if (disabled) {
    const tooltipContent = post?.status === 'confirmed'
      ? "담당자 확인이 완료되어 수정할 수 없습니다."
      : "수정 권한이 없습니다."

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 w-full">
            {post?.url ? (
              <Link 
                href={post.url}
                target="_blank"
                className="text-muted-foreground hover:text-muted-foreground/80 flex items-center gap-1"
              >
                <span className="truncate">{post.url}</span>
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
              </Link>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // 이미 URL이 있고 편집 모드가 아닌 경우
  if (post?.url && !isEditing) {
    return (
      <div className="flex items-center gap-2 w-full">
        <Link 
          href={post.url}
          target="_blank"
          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 flex-1 truncate"
        >
          <span className="truncate">{post.url}</span>
          <ExternalLink className="h-4 w-4 flex-shrink-0" />
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTempUrl(post.url)
            setIsEditing(true)
          }}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          수정
        </Button>
      </div>
    )
  }

  // URL 입력 모드
  return (
    <div className="flex items-center gap-2 w-full">
      <Input 
        placeholder="URL 입력"
        value={tempUrl}
        onChange={(e) => setTempUrl(e.target.value)}
        disabled={loading}
        className={cn("flex-1", loading && "opacity-50")}
      />
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={loading || !tempUrl}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          저장
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTempUrl(post?.url || '')
            setIsEditing(false)
          }}
          disabled={loading}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          취소
        </Button>
      </div>
    </div>
  )
} 
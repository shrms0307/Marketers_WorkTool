'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Edit2, Check, X, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProjectKeyword } from "@/types/project"

interface ProjectKeywordsProps {
  projectId: number
  keywords: ProjectKeyword[]
  canEdit: boolean
  onUpdate: (keywords: ProjectKeyword[]) => void
}

export function ProjectKeywords({ projectId, keywords, canEdit, onUpdate }: ProjectKeywordsProps) {
  const [keyword, setKeyword] = useState('')
  const { toast } = useToast()

  const handleAddKeyword = async () => {
    if (!keyword.trim()) {
      toast({
        title: '입력 오류',
        description: '키워드를 입력하세요.',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/projects/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          keyword: keyword.trim()
        })
      })

      if (!response.ok) {
        throw new Error('키워드 추가 실패')
      }

      const newKeyword = await response.json()
      onUpdate([...keywords, newKeyword])
      setKeyword('')
      
      toast({
        title: '성공',
        description: '키워드가 추가되었습니다.'
      })
    } catch (error) {
      toast({
        title: '오류 발생',
        description: '키워드를 추가하는 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    }
  }

  function KeywordBadge({ keyword }: { keyword: ProjectKeyword }) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedKeyword, setEditedKeyword] = useState(keyword.keyword)
    const [isLoading, setIsLoading] = useState(false)

    const handleUpdate = async () => {
      if (!editedKeyword.trim()) return
      setIsLoading(true)
      try {
        const response = await fetch(`/api/projects/keywords/${keyword.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            keyword: editedKeyword.trim()
          })
        })

        if (!response.ok) {
          throw new Error('키워드 수정 실패')
        }

        const updatedKeyword = await response.json()
        onUpdate(
          keywords.map(k => 
            k.id === keyword.id ? updatedKeyword : k
          )
        )
        setIsEditing(false)
        
        toast({
          title: "성공",
          description: "키워드가 수정되었습니다."
        })
      } catch (error) {
        toast({
          title: "오류",
          description: "키워드 수정 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    const handleDelete = async () => {
      try {
        const response = await fetch(`/api/projects/keywords/${keyword.id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error('키워드 삭제 실패')
        }

        onUpdate(keywords.filter(k => k.id !== keyword.id))
        
        toast({
          title: "성공",
          description: "키워드가 삭제되었습니다."
        })
      } catch (error) {
        toast({
          title: "오류",
          description: "키워드 삭제 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    }

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-md">
          <Input
            value={editedKeyword}
            onChange={(e) => setEditedKeyword(e.target.value)}
            className="h-7 w-32 bg-background"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUpdate()
              } else if (e.key === 'Escape') {
                setIsEditing(false)
                setEditedKeyword(keyword.keyword)
              }
            }}
          />
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUpdate}
              disabled={isLoading}
              className="h-7 w-7"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsEditing(false)
                setEditedKeyword(keyword.keyword)
              }}
              disabled={isLoading}
              className="h-7 w-7"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="group relative">
        <Badge 
          variant="secondary"
          className={canEdit ? "transition-all duration-200 pr-14 hover:pr-14" : ""}
        >
          {keyword.keyword}
          {keyword.search_ranks && (
            <span className="ml-1 text-muted-foreground">
              ({keyword.search_ranks})
            </span>
          )}
          {canEdit && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-5 w-5 p-0 hover:text-blue-500"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="h-5 w-5 p-0 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </Badge>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          프로젝트 키워드2
          <Badge variant="outline" className="ml-2">
            {keywords.length}개
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <KeywordBadge 
              key={keyword.id} 
              keyword={keyword}
            />
          ))}
        </div>
        {canEdit && (
          <div className="pt-4 border-t">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="keyword">새 키워드 추가</Label>
                <Input
                  id="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="키워드를 입력하세요"
                />
              </div>
              <Button 
                onClick={handleAddKeyword}
                className="mb-[2px]"
              >
                추가
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 
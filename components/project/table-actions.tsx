'use client'

import { Button } from "@/components/ui/button"
import { UserPlus, UserX, RefreshCw } from "lucide-react"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { Row } from "@tanstack/react-table"
import { ProjectBlogger } from "@/types/project"
import { ExcelDownload } from "./excel-download"

interface TableActionsProps {
  projectId: string
  hasSelectedRows: boolean
  canEdit: boolean
  selectedRows: Row<ProjectBlogger>[]
  rejectedBloggers: Array<{
    inf_blogid: string
    inf_nickname: string
  }>
  updateDateTime?: string
  onRemove: () => void
  onRestore: () => void
}

export function TableActions({
  projectId,
  hasSelectedRows,
  canEdit,
  selectedRows,
  rejectedBloggers,
  updateDateTime,
  onRemove,
  onRestore
}: TableActionsProps) {
  const router = useRouter()
  
  return (
    <div className="space-y-2 mb-4">
      {updateDateTime && (
        <div className="text-sm text-muted-foreground text-right">
          수집일자: {format(new Date(updateDateTime), 'yyyy.MM.dd', { locale: ko })}
        </div>
      )}
      <div className="flex justify-end gap-2">
        {canEdit && rejectedBloggers.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRestore}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            제거된 블로거 복구
          </Button>
        )}
        
        <ExcelDownload
          selectedRows={selectedRows}
          disabled={!hasSelectedRows}
        />
        
        {canEdit && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => {
                window.location.href = `/?projectId=${projectId}`
              }}
            >
              <UserPlus className="h-4 w-4" />
              블로거 추가
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRemove}
              disabled={!hasSelectedRows}
              className="flex items-center gap-2 hover:bg-red-50"
            >
              <UserX className="h-4 w-4" />
              선택 삭제
            </Button>
          </>
        )}
      </div>
    </div>
  )
} 
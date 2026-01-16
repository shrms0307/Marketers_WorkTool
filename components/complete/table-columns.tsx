import { ColumnDef } from "@tanstack/react-table"
import { PostUrlInput } from "./post-url-input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { BarChart2, ExternalLink, ChevronsUpDown, Edit2 } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"
import { IMAGE_PATHS } from "@/lib/constants"
import { ConfirmCheckDialog } from "@/components/project/confirm-check-dialog"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import { updateManagerCheck } from "./actions"


// 블로그 유형별 배지 스타일 정의
const blogTypeBadgeVariants: Record<string, string> = {
  "관계강화형": "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80",
  "관계축소형": "bg-rose-100 text-rose-800 hover:bg-rose-100/80",
  "유입집중형": "bg-blue-100 text-blue-800 hover:bg-blue-100/80",
}

export function getColumns(
  projectId?: string,
  onRefresh?: () => Promise<void>,
  canEdit: boolean = false,
  userId?: string
): ColumnDef<ProjectBloggerRow>[] {
  return [
    canEdit ? {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="전체 선택"
        />
      ),
      cell: ({ row }) => {
        if (row.original.status === 'rejected') {
          return null
        }
        return (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="행 선택"
          />
        )
      },
      enableSorting: false,
      enableHiding: false,
    } : null,
    {
      accessorKey: "inf_nickname",
      header: "블로거",
      cell: ({ row }) => {
        const blogger = row.original
        return (
          <Link 
            href={`https://blog.naver.com/${blogger.inf_blogid}`}
            target="_blank"
            className="flex items-center gap-3 hover:text-primary transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={blogger.inf_profileimage} />
              <AvatarFallback>{blogger.inf_nickname[0]}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span>{blogger.inf_nickname}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        )
      }
    },
    {
      accessorKey: "category",
      header: "카테고리",
    },
    {
      accessorKey: "influencer",
      header: "인플루언서",
      cell: ({ row }) => {
        const address = row.original.inf_address
        return (
          <div className="flex items-center justify-start pl-5">
            <div className={`relative w-6 h-6 ${!address && 'grayscale opacity-50'}`}>
              <Image
                src={`${IMAGE_PATHS.ICONS}/inb.png`}
                alt="인플루언서 뱃지"
                fill
                sizes="24px"
                className="object-contain"
                title={address ? "인플루언서 페이지로 이동" : "일반 블로거"}
              />
              {address && (
                <Link
                  href={address}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 hover:opacity-80"
                />
              )}
            </div>
          </div>
        )
      },
      filterFn: (row) => Boolean(row.original.inf_address),
    },
    {
      accessorKey: "blogger_type",
      header: "블로그 유형",
      cell: ({ row }) => {
        const type = row.getValue("blogger_type") as string
        return (
          <Badge variant="outline" className={blogTypeBadgeVariants[type] || ""}>
            {type}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return row.getValue(id) === value
      },
    },
    {
      accessorKey: "follower_count",
      header: "이웃수",
      cell: ({ row }) => row.original.follower_count.toLocaleString()
    },
    {
      accessorKey: "visitor_avg",
      header: "방문자수",
      sortingFn: (rowA, rowB) => {
        if (rowA.original.status === 'rejected' && rowB.original.status !== 'rejected') return -1
        if (rowA.original.status !== 'rejected' && rowB.original.status === 'rejected') return 1
        
        const aValue = rowA.getValue('visitor_avg') as number
        const bValue = rowB.getValue('visitor_avg') as number
        return bValue - aValue
      },
      cell: ({ row }) => row.original.visitor_avg.toLocaleString()
    },
    {
      accessorKey: "email",
      header: "이메일",
      cell: ({ row }) => `${row.original.inf_blogid}@naver.com`
    },
    {
      id: "actions",
      header: "상세보기",
      cell: ({ row }) => {
        if (row.original.status === 'rejected') {
          return null
        }
        return (
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => window.open(`/blog-analysis/${row.original.inf_blogid}`, '_blank')}
          >
            <BarChart2 className="h-4 w-4" />
            분석
          </Button>
        )
      }
    },
    {
      accessorKey: "post",
      header: "포스트 URL",
      size: 400,
      cell: ({ row }) => {
        const blogger = row.original
        return (
          <div className="w-[20vw]">
            <PostUrlInput
              projectId={projectId || ''}
              bloggerId={blogger.inf_blogid}
              post={blogger.post}
              disabled={
                !canEdit || 
                blogger.status === 'rejected' || 
                blogger.post?.status === 'confirmed'
              }
              onSuccess={onRefresh}
            />
          </div>
        )
      }
    },
    {
      accessorKey: "manager_check",
      header: "담당자 확인",
      size: 100,
      cell: ({ row }) => {
        const [showConfirmDialog, setShowConfirmDialog] = useState(false)
        const [showCancelDialog, setShowCancelDialog] = useState(false)
        const blogger = row.original
        const isConfirmed = blogger.post?.status === 'confirmed'
        const hasUrl = Boolean(blogger.post?.url)

        if (blogger.status === 'rejected') {
          return null
        }

        return (
          <div className="flex items-center gap-2">
            <div key="checkbox">
              <Checkbox
                checked={isConfirmed}
                disabled={!canEdit || (!isConfirmed && !hasUrl)}
                onCheckedChange={(checked) => {
                  if (!hasUrl && !isConfirmed) {
                    toast({
                      variant: "destructive",
                      title: "오류",
                      description: "URL을 먼저 입력해주세요."
                    })
                    return
                  }
                  if (checked === false) {
                    setShowCancelDialog(true)
                  } else {
                    setShowConfirmDialog(true)
                  }
                }}
                aria-label="담당자 확인"
              />
            </div>
            <div key="dialog">
              <ConfirmCheckDialog
                open={showConfirmDialog}
                onOpenChange={setShowConfirmDialog}
                onConfirm={async () => {
                  try {
                    await updateManagerCheck(projectId || '', blogger.inf_blogid, 'confirmed')
                    onRefresh?.()
                    toast({
                      title: "성공",
                      description: "담당자 확인이 완료되었습니다."
                    })
                  } catch (error) {
                    console.error('담당자 확인 업데이트 실패:', error)
                    toast({
                      variant: "destructive",
                      title: "오류",
                      description: "담당자 확인 처리에 실패했습니다."
                    })
                  }
                }}
              />
              <ConfirmCheckDialog
                open={showCancelDialog}
                onOpenChange={setShowCancelDialog}
                title="담당자 확인 취소"
                description="담당자 확인을 취소하시겠습니까?"
                onConfirm={async () => {
                  try {
                    await updateManagerCheck(projectId || '', blogger.inf_blogid, 'published')
                    onRefresh?.()
                    toast({
                      title: "성공",
                      description: "담당자 확인이 취소되었습니다."
                    })
                  } catch (error) {
                    console.error('담당자 확인 취소 실패:', error)
                    toast({
                      variant: "destructive",
                      title: "오류",
                      description: "담당자 확인 취소에 실패했습니다."
                    })
                  }
                }}
              />
            </div>
          </div>
        )
      }
    },
  ].filter(Boolean) as ColumnDef<ProjectBloggerRow>[]
} 
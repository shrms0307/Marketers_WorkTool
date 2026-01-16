"use client"

import { ColumnDef } from "@tanstack/react-table"
import { BlogRankingData } from "@/components/blog/types"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, LineChart, ChevronsUpDown, HelpCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ExternalLink , BarChart2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "./data-table-column-header"
import Image from "next/image"
import { useState } from "react"
import { IMAGE_PATHS } from "@/lib/constants"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const blogTypeBadgeVariants: Record<string, string> = {
  "관계강화형": "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80",
  "관계축소형": "bg-rose-100 text-rose-800 hover:bg-rose-100/80",
  "유입집중형": "bg-blue-100 text-blue-800 hover:bg-blue-100/80",
}

// 숫자 포맷팅 헬퍼 함수 수정
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '-'
  
  if (num >= 1000) {
    // 천 단위로 반올림
    const roundedNum = Math.round(num / 1000) * 1000
    return roundedNum.toLocaleString()
  }
  return num.toLocaleString()
}

// 뱃지 스타일 변형 정의
const tooltipBadgeVariants = {
  default: "bg-primary/10 hover:bg-primary/20 text-primary",
  outline: "hover:bg-accent",
  // 필요한 경우 다른 변형 추가
}

const parseRankData = (value: any) => {
  try {
    if (typeof value === 'string') {
      // 작은따옴표를 큰따옴표로 변환
      const jsonString = value.replace(/'/g, '"')
      return JSON.parse(jsonString)
    }
    // 이미 객체인 경우
    if (typeof value === 'object' && value !== null) {
      return value
    }
    // 기본값 반환
    return { percentage: '0', rank: 'N/A' }
  } catch (error) {
    console.error('순위 데이터 파싱 실패:', error)
    return { percentage: '0', rank: 'N/A' }
  }
}

export const columns: ColumnDef<BlogRankingData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="전체 선택"
        title="현재 페이지의 모든 블로거를 선택/해제합니다"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="행 선택"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "inf_nickname",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="블로거" 
        description="블로거의 프로필 이미지와 닉네임을 표시합니다. 클릭하면 해당 블로그로 이동합니다."
      />
    ),
    cell: ({ row }) => {
      const blogger = row.original
      return (
        <Link 
          href={`https://blog.naver.com/${blogger.inf_blogid}`}
          target="_blank"
          className="flex items-center gap-3 hover:text-primary transition-colors"
          onClick={(e) => e.stopPropagation()}
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
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="카테고리" 
        description="블로거의 주요 포스팅 카테고리를 보여줍니다."
      />
    ),
    cell: ({ row }) => {
      const category = row.getValue("category") as string
      return category || "미분류"
    },
  },
  {
    accessorKey: "influencer",
    header: ({ column }) => (
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="-ml-3 h-8"
                >
                  <span>인플루언서</span>
                  <HelpCircle className="ml-0.5 h-4 w-4 text-muted-foreground" />
                  <ChevronsUpDown className="ml-0.5 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>인플루언서 여부를 아이콘으로 표시합니다. 아이콘이 활성화된 경우 클릭하여 인플루언서 페이지로 이동할 수 있습니다.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="start">
          <DropdownMenuCheckboxItem
            checked={column.getFilterValue() === undefined}
            onCheckedChange={() => column.setFilterValue(undefined)}
          >
            전체
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={column.getFilterValue() === true}
            onCheckedChange={() => column.setFilterValue(true)}
          >
            인플루언서 & 블로거
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={column.getFilterValue() === false}
            onCheckedChange={() => column.setFilterValue(false)}
          >
            블로거
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    cell: ({ row }) => {
      const address = row.original.inf_address;
      
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
      );
    },
    filterFn: (row, id, value) => {
      if (value === undefined) return true;
      return value ? Boolean(row.original.inf_address) : !row.original.inf_address;
    },
  },
  {
    accessorKey: "blogger_type",
    header: ({ column }) => (
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="-ml-3 h-8"
                >
                  <span>블로그 유형</span>
                  <HelpCircle className="ml-0.5 h-4 w-4 text-muted-foreground" />
                  <ChevronsUpDown className="ml-0.5 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>블로거의 활동 패턴에 따른 유형을 분류합니다. (관계강화형/관계축소형/유입집중형)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="start">
          <DropdownMenuCheckboxItem
            checked={column.getFilterValue() === undefined}
            onCheckedChange={() => column.setFilterValue(undefined)}
          >
            전체
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {Object.keys(blogTypeBadgeVariants).map((type) => (
            <DropdownMenuCheckboxItem
              key={type}
              checked={column.getFilterValue() === type}
              onCheckedChange={() => column.setFilterValue(type)}
            >
              {type}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    cell: ({ row }) => {
      const type = row.getValue("blogger_type") as string
      const changedType = row.original.changed_type

      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={blogTypeBadgeVariants[type] || ""}>
            {type}
          </Badge>
          {changedType && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs space-y-3">
                    <div className="flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="font-medium">인플루언서의 유형이 1개월 전과 달라졌습니다.</p>
                    </div>
                    <div className="flex items-center gap-2 pl-1.5">
                      <span className="text-muted-foreground">1개월 전</span>
                      <Badge variant="outline" className={blogTypeBadgeVariants[changedType] || ""}>
                        {changedType}
                      </Badge>
                    </div>
                    <div className="pl-1.5 text-sm text-muted-foreground">
                      <div className="flex gap-2">
                        <span className="text-yellow-500">*</span>
                        <p className="leading-relaxed">
                          일시적인 트렌드나 특정 이벤트에 의한 것인지,<br/>
                          지속적인 변화인지 파악하기 위해 월간 방문자<br/>
                          추이를 확인 바랍니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return row.getValue(id) === value
    },
  },
  {
    accessorKey: "follower_count",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="이웃수" 
        description="블로그의 이웃(팔로워) 수를 표시합니다. 1천 단위로 반올림하여 표시됩니다."
      />
    ),
    cell: ({ row }) => formatNumber(row.original.follower_count)
  },
  {
    accessorKey: "visitor_avg",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="방문자수" 
        description="일 평균 방문자 수를 표시합니다. 1천 단위로 반올림하여 표시됩니다."
      />
    ),
    cell: ({ row }) => {
      const visitorAvg = Number(row.getValue("visitor_avg"))
      const visitorDiff = row.original.visitor_diff ? Number(row.original.visitor_diff) : null
      
      const hasWarning = visitorDiff !== null && visitorAvg >= visitorDiff * 2

      return (
        <div className="flex items-center gap-2">
          <span className="text-right tabular-nums">
            {formatNumber(visitorAvg)}
          </span>
          {hasWarning && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <p className="font-semibold">방문자 수 급증 인플루언서</p>
                    </div>
                    <div className="text-center border-y border-border py-3">
                      <p className="text-sm text-muted-foreground">1개월전 최저방문자수</p>
                      <p className="text-xl font-bold mt-1">
                        {visitorDiff ? new Intl.NumberFormat('ko-KR').format(visitorDiff) : '0'}명
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2 px-1">
                      <div className="flex items-start gap-1">
                        <span className="text-yellow-500">*</span>
                        <p>특정 포스팅이 메인 피드에 올라가면서<br/>방문자 수가 급격히 증가할 수 있습니다.</p>
                      </div>
                      <div className="flex items-start gap-1">
                        <span className="text-yellow-500">*</span>
                        <p>장기적으로 유지될 가능성이 있는지<br/>파악하기 위해 월간 방문자 추이를 확인바랍니다.</p>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )
    }
  },
  {
    accessorKey: "visitor_rank",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="방문자 상위 비율" 
        description="평균 방문자수를 기준으로 전체 데이터에서 해당 블로거의 순위와 상위 비율을 나타냅니다."
      />
    ),
    cell: ({ row }) => {
      const rankData = parseRankData(row.getValue("visitor_rank"))
      
      return (
        <div className="flex items-center gap-2">
          <span className="text-right tabular-nums">
            상위 {rankData.percentage}%
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <LineChart className="h-4 w-4 text-primary" />
                    <p className="font-semibold">평균 방문자수 상위 비율 및 순위</p>
                  </div>
                  <div className="text-center border-y border-border py-3">
                    <p className="text-sm text-muted-foreground">현재 순위</p>
                    <p className="text-xl font-bold mt-1">{rankData.rank}</p>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-2 px-1">
                    <div className="flex items-start gap-1">
                      <span className="text-primary">•</span>
                      <p>상위 비율: 자신의 방문자 수가 전체 데이터에서 얼마나 높은 비율에 속하는지를 백분율로 표현함</p>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="text-primary">•</span>
                      <p>순위: 평균 방문자수를 기준으로 내림차순 정렬함</p>
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    }
  },
  {
    accessorKey: "comment_rank",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="댓글 상위 비율" 
        description="블로거의 게시글당 댓글수 비율을 백분율로 표현합니다."
      />
    ),
    cell: ({ row }) => {
      const rankData = parseRankData(row.getValue("comment_rank"))
      
      return (
        <div className="flex items-center gap-2">
          <span className="text-right tabular-nums">
          {rankData.rank} {rankData.percentage}%
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <LineChart className="h-4 w-4 text-primary" />
                    <p className="font-semibold">게시글당 댓글수 상위 비율</p>
                  </div>
                  <div className="text-center border-y border-border py-3">
                    <p className="text-sm text-muted-foreground">현재 순위</p>
                    <p className="text-xl font-bold mt-1">{rankData.rank} {rankData.percentage}%</p>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-2 px-1">
                    <p className="mb-2">설명: 블로거의 게시글당 댓글수 비율을 백분율로 표현함</p>
                    <p className="mb-2">백분율 의미: 특정 블로거의 게시글 중 가장 인기 있는 게시글이 전체 댓글에서 얼마나 큰 비중을 차지하는지 나타냄</p>
                    <p>구간 분류:</p>
                    <ul className="list-none space-y-1">
                      <li>• 상위 10%: 매우 높음</li>
                      <li>• 상위 25%: 높음</li>
                      <li>• 하위 50%: 평균</li>
                      <li>• 하위 25%: 다소 낮음</li>
                      <li>• 하위 10%: 매우 낮음</li>
                    </ul>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    }
  },
  {
    accessorKey:"mail",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="이메일" 
        description="블로거의 네이버 이메일 주소입니다."
      />
    ),
    cell: ({ row }) => {
      const email = `${row.original.inf_blogid}@naver.com`
      return email;
    },
  },
  {
    id: "actions",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="상세보기" 
        description="블로거의 상세 분석 페이지로 이동하여 더 자세한 통계를 확인할 수 있습니다."
      />
    ),
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2"
        onClick={(e) => {
          e.stopPropagation()
          window.location.href = `/blog-analysis/${row.original.inf_blogid}`
        }}
      >
        <BarChart2 className="h-4 w-4" />
        분석
      </Button>
    )
  },
]
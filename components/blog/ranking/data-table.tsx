"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
  getFilteredRowModel,
  Table as TableInstance,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useState, useEffect, useRef } from "react"
import { DataTablePagination } from "@/components/blog/ranking/data-table-pagination"
import { Input } from "@/components/ui/input"
import { Search, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"

import { CreateProjectDialog } from "@/components/project/create-project-dialog"
import * as XLSX from 'xlsx'  // xlsx 라이브러리 추가
import { Skeleton } from "@/components/ui/skeleton"
import { BlogRankingData } from "@/components/blog/types"
import { useSelectedBloggers } from "@/store/use-selected-bloggers"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onSearch?: (value: string) => void
  loading?: boolean
  onTableChange?: (table: TableInstance<TData>) => void
  getRowId?: (row: TData) => string
}

// 스켈레톤 테이블 컴포넌트를 밖으로 이동
function TableSkeleton() {
  return (
    <div>
      {/* 상단 검색/버튼 영역 */}
      <div className="flex items-center justify-between py-4">
        <div className="relative w-72">
          <Skeleton className="absolute left-2 top-2.5 h-4 w-4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-[120px]" />
          <Skeleton className="h-9 w-[120px]" />
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Skeleton className="h-4 w-4" />
              </TableHead>
              <TableHead className="w-[180px]">
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead className="w-[120px]">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="w-[100px]">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="w-[120px]">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="w-[100px] text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableHead>
              <TableHead className="w-[100px] text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableHead>
              <TableHead className="w-[100px]">
                <Skeleton className="h-4 w-16" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(10)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-20" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-9 w-[72px]" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between py-4">
        <Skeleton className="h-8 w-[200px]" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-8" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onSearch,
  loading = false,
  onTableChange,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  
  const { 
    selectedRows, 
    updateSelection,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    setPageCount
  } = useSelectedBloggers()

  // 페이지 변경을 추적하는 ref
  const isPageChanging = useRef(false)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
      rowSelection: selectedRows,
      globalFilter,
      pagination: {
        pageIndex: currentPage,
        pageSize: pageSize,
      },
    },
    // 페이지네이션 이벤트 핸들러 수정
    onPaginationChange: (updater) => {
      isPageChanging.current = true
      const state = updater(table.getState().pagination)
      setCurrentPage(state.pageIndex)
      setPageSize(state.pageSize)
      setPageCount(table.getPageCount())
      isPageChanging.current = false
    },
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      // 페이지 변경 중에는 선택 상태 업데이트 건너뛰기
      if (isPageChanging.current) return

      const newSelection = typeof updater === 'function' 
        ? updater(selectedRows)
        : updater
      
      // 현재 페이지의 선택 상태만 업데이트
      const currentPageRows = table.getRowModel().rows
      const updatedSelection = { ...selectedRows }
      
      // 현재 페이지의 행들만 업데이트
      currentPageRows.forEach(row => {
        if (newSelection[row.id] !== undefined) {
          updatedSelection[row.id] = newSelection[row.id]
        }
      })

      updateSelection(updatedSelection)
      onTableChange?.(table)
    },
    getRowId,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row) => {
      if (!globalFilter) return true

      const searchTerm = globalFilter.toLowerCase()
      const nickname = (row.getValue("inf_nickname") as string || "").toLowerCase()
      const blogId = (row.original as any).inf_blogid?.toLowerCase() || ""

      return nickname.includes(searchTerm) || blogId.includes(searchTerm)
    },
  })

  // 페이지 카운트 업데이트
  useEffect(() => {
    if (table) {
      setPageCount(table.getPageCount())
    }
  }, [table?.getPageCount(), setPageCount])

  useEffect(() => {
    onTableChange?.(table)
  }, [table, onTableChange])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value
    setGlobalFilter(searchTerm)
    onSearch?.(searchTerm)
  }

  const hasSelectedRows = Object.keys(selectedRows).length > 0

  const handleExcelDownload = () => {
    // 전체 선택된 행의 데이터 가져오기
    const selectedBloggers = Object.entries(selectedRows)
      .filter(([_, selected]) => selected)
      .map(([id]) => {
        const row = data.find((item: any) => getRowId?.(item) === id)
        return row as BlogRankingData
      })
      .filter(Boolean)
      
    const excelData = selectedBloggers.map((blogger) => {
      return {
        "블로거": blogger.inf_nickname,
        "블로그ID": blogger.inf_blogid,
        "블로그 URL": `https://blog.naver.com/${blogger.inf_blogid}`,
        "카테고리": blogger.category,
        "인플루언서 URL": Number(blogger.visitor_avg) >= 1000 
          ? blogger.inf_address || ""
          : "",
        "블로그 유형": blogger.blogger_type,
        "이웃수": blogger.follower_count,
        "방문자수": blogger.visitor_avg,
        "이메일": `${blogger.inf_blogid}@naver.com`
      }
    })

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, "블로거 목록");

    // 엑셀 파일 다운로드
    XLSX.writeFile(
      wb, 
      `블로거_목록_${new Date().toLocaleDateString()}.xlsx`
    );
  }

  if (loading) {
    return <TableSkeleton />
  }

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="블로거 검색 (닉네임/아이디)..."
            value={globalFilter}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExcelDownload}
            disabled={!hasSelectedRows}
            className="flex items-center gap-2"
            title={hasSelectedRows ? "선택한 항목 다운로드" : "항목을 선택해주세요"}
          >
            <FileSpreadsheet className="h-4 w-4" />
            엑셀 다운로드
          </Button>
          <CreateProjectDialog 
            selectedBloggers={
              Object.entries(selectedRows)
                .filter(([_, selected]) => selected)
                .map(([id]) => {
                  const row = data.find((item: any) => getRowId?.(item) === id)
                  return row?.inf_blogid
                })
                .filter(Boolean) as string[]
            }
            onSuccess={() => {
              updateSelection({})
            }}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
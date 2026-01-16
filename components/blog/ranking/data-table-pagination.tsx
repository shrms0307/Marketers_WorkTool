"use client"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X
} from "lucide-react"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSelectedBloggers } from "@/store/use-selected-bloggers"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const { setCurrentPage, setPageSize, resetSelectedRows } = useSelectedBloggers()

  const totalCount = table.getFilteredRowModel().rows.length
  const selectedCount = table.getFilteredSelectedRowModel().rows.length
  const hasSelection = selectedCount > 0

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          {totalCount}명의 블로거 중 {selectedCount}명 선택됨
        </span>
        {hasSelection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetSelectedRows()}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            선택 초기화
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">페이지당 행</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              const newSize = Number(value)
              setPageSize(newSize)
              setCurrentPage(0)
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} 페이지
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => setCurrentPage(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">처음 페이지로</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(table.getState().pagination.pageIndex - 1)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">이전 페이지</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(table.getState().pagination.pageIndex + 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">다음 페이지</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => setCurrentPage(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">마지막 페이지로</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 
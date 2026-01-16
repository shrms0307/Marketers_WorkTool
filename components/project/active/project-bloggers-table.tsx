'use client'

import { useState, useCallback, useEffect } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  flexRender,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { RemoveBloggersDialog } from "../remove-bloggers-dialog"
import { RestoreBloggersDialog } from "../restore-bloggers-dialog"
import { getColumns } from "../table-columns"
import { TableActions } from "../table-actions"
import * as XLSX from "xlsx"
import { getProjectBloggers } from '../actions'
import { ProjectBlogger } from "@/types/project"

interface ProjectBloggersTableProps {
  bloggers: ProjectBlogger[]
  projectId?: string
  canEdit: boolean
  onRemoveBloggers?: (updates: { blogId: string; status: string }[]) => void
}

export function ProjectBloggersTable({
  bloggers,
  projectId,
  canEdit,
  onRemoveBloggers
}: ProjectBloggersTableProps) {
  const { toast } = useToast()
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "visitor_avg",
      desc: true
    }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [tableData, setTableData] = useState(bloggers)

  const updateTableData = useCallback((newData: any[]) => {
    const activeData = newData.filter(item => item.status !== 'rejected')
    const rejectedData = newData.filter(item => item.status === 'rejected')
    setTableData([...activeData, ...rejectedData])
  }, [])

  useEffect(() => {
    updateTableData(bloggers)
  }, [bloggers, updateTableData])

  const refreshTable = useCallback(async () => {
    try {
      const newData = await getProjectBloggers(projectId || '')
      updateTableData(newData as any)
    } catch (error) {
      console.error('테이블 새로고침 실패:', error)
      toast({
        variant: "destructive",
        title: "오류",
        description: "데이터 새로고침에 실패했습니다."
      })
    }
  }, [projectId, toast, updateTableData])

  const columns = getColumns(projectId, refreshTable, canEdit)

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.inf_blogid,
    enableRowSelection: true,
    sortingFns: {
      customSort: (rowA: any, rowB: any, columnId: string) => {
        if (rowA.original.status === 'rejected' && rowB.original.status !== 'rejected') return 1
        if (rowA.original.status !== 'rejected' && rowB.original.status === 'rejected') return -1
        
        const aValue = rowA.getValue(columnId)
        const bValue = rowB.getValue(columnId)
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    },
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  })

  const hasSelectedRows = Object.keys(rowSelection).length > 0
  const selectedBloggers = table.getSelectedRowModel().rows.map(row => ({
    inf_blogid: row.original.inf_blogid,
    inf_nickname: row.original.inf_nickname
  }))

  const rejectedBloggers = bloggers
    .filter(b => b.status === 'rejected')
    .map(b => ({
      inf_blogid: b.inf_blogid,
      inf_nickname: b.inf_nickname
    }))

  const handleExcelDownload = useCallback(() => {
    console.log('Excel Download Started')
    const selectedRows = table.getSelectedRowModel().rows
    console.log('Selected Rows:', selectedRows)
    
    const excelData = selectedRows.map(row => ({
      "블로거": row.original.inf_nickname,
      "블로그ID": row.original.inf_blogid,
      "카테고리": row.original.category,
      "블로그 유형": row.original.blogger_type,
      "이웃수": row.original.follower_count,
      "방문자수": row.original.visitor_avg,
      "포스팅 URL": row.original.post?.url || "",
      "상태": row.original.status === 'rejected' ? '제거됨' : '활성',
    }))
    console.log('Excel Data:', excelData)

    try {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)
      XLSX.utils.book_append_sheet(wb, ws, "프로젝트 블로거")
      XLSX.writeFile(wb, `프로젝트_블로거_${new Date().toLocaleDateString()}.xlsx`)
      console.log('Excel Download Completed')
    } catch (error) {
      console.error('Excel Download Error:', error)
    }
  }, [table])

  return (
    <div>
      <TableActions
        projectId={projectId || ''}
        hasSelectedRows={table.getSelectedRowModel().rows.length > 0}
        canEdit={canEdit}
        selectedRows={table.getSelectedRowModel().rows}
        rejectedBloggers={rejectedBloggers}
        updateDateTime={new Date().toISOString()}
        onRemove={() => canEdit && setShowRemoveDialog(true)}
        onRestore={() => canEdit && setShowRestoreDialog(true)}
      />

      <RemoveBloggersDialog
        open={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
        selectedBloggers={selectedBloggers}
        onConfirm={async () => {
          try {
            console.log('Removing bloggers:', selectedBloggers)
            await onRemoveBloggers?.(
              selectedBloggers.map(blogger => ({
                blogId: blogger.inf_blogid,
                status: 'rejected'
              }))
            )
            setRowSelection({})
            setShowRemoveDialog(false)
            
            toast({
              title: "성공",
              description: "선택한 블로거가 제거되었습니다."
            })
          } catch (error) {
            console.error('블로거 제거 실패:', error)
            toast({
              variant: "destructive",
              title: "오류",
              description: "블로거 제거에 실패했습니다."
            })
          }
        }}
      />

      <RestoreBloggersDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        rejectedBloggers={rejectedBloggers}
        onConfirm={async (bloggerIds) => {
          try {
            await onRemoveBloggers?.(
              bloggerIds.map(blogId => ({
                blogId,
                status: 'accepted'
              }))
            )
            setShowRestoreDialog(false)
          } catch (error) {
            console.error('블로거 복구 실패:', error)
          }
        }}
      />

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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={
                    row.original.status === 'rejected'
                      ? "opacity-50 bg-muted hover:bg-muted/80"
                      : ""
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  참여 중인 블로거가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 
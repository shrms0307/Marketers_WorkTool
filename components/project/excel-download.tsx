'use client'

import { Button } from "@/components/ui/button"
import { FileSpreadsheet } from "lucide-react"
import { Row } from "@tanstack/react-table"
import { ProjectBlogger } from "@/types/project"
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

interface ExcelDownloadProps {
  selectedRows: Row<ProjectBlogger>[]
}

export function ExcelDownload({ selectedRows }: ExcelDownloadProps) {
  const handleDownload = () => {
    // 엑셀 데이터 준비
    const excelData = selectedRows.map(row => {
      const blogger = row.original
      const status = blogger.post?.status || 'draft'

      return {
        "블로거": blogger.inf_nickname,
        "블로그ID": blogger.inf_blogid,
        "카테고리": blogger.category || "미분류",
        "인플루언서": blogger.inf_address ? "O" : "X",
        "블로그 유형": blogger.blogger_type || "-",
        "이웃수": blogger.follower_count.toLocaleString(),
        "방문자수": blogger.visitor_avg.toLocaleString(),
        "이메일": `${blogger.inf_blogid}@naver.com`,
        "포스트 URL": blogger.post?.url || "-",
        "상태": status === 'draft' ? '작성 대기' :
               status === 'published' ? '작성 완료' :
               status === 'confirmed' ? '확인 완료' :
               status === 'rejected' ? '반려' : 
               '작성 대기'
      }
    })

    // 워크북 생성
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // 열 너비 설정
    const columnWidths = [
      { wch: 15 },  // 블로거
      { wch: 15 },  // 블로그ID
      { wch: 15 },  // 카테고리
      { wch: 10 },  // 인플루언서
      { wch: 15 },  // 블로그 유형
      { wch: 10 },  // 이웃수
      { wch: 10 },  // 방문자수
      { wch: 25 },  // 이메일
      { wch: 50 },  // 포스트 URL
      { wch: 10 },  // 상태
    ]
    ws['!cols'] = columnWidths

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, "블로거 목록")

    // 엑셀 파일 다운로드
    XLSX.writeFile(
      wb, 
      `블로거_목록_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      className="flex items-center gap-2"
    >
      <FileSpreadsheet className="h-4 w-4" />
      엑셀 다운로드
    </Button>
  )
} 
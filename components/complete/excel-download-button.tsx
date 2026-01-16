'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { recordExcelDownload } from '@/app/(main)/complete/actions'
import ExcelJS from 'exceljs'
import { format } from 'date-fns'
import { ProjectDetailData } from '@/types/project'

interface ExcelDownloadButtonProps {
  projectId: string
  projectName: string
  data: ProjectDetailData
}

export function ExcelDownloadButton({ projectId, projectName, data }: ExcelDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const { toast } = useToast()

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      
      // 엑셀 워크북 생성
      const workbook = new ExcelJS.Workbook()
      
      // 1. 요약 시트
      const summarySheet = workbook.addWorksheet('요약')
      summarySheet.columns = [
        { header: '구분', key: 'category', width: 20 },
        { header: '내용', key: 'content', width: 40 }
      ]
      
      // 프로젝트 기본 정보
      summarySheet.addRow({ category: '프로젝트명', content: data.project.name })
      summarySheet.addRow({ 
        category: '프로젝트 기간', 
        content: `${format(new Date(data.project.start_date), 'yyyy.MM.dd')} ~ ${format(new Date(data.project.end_date), 'yyyy.MM.dd')}` 
      })
      summarySheet.addRow({ category: '목표 포스팅', content: data.project.target_posts })
      summarySheet.addRow({ category: '완료 포스팅', content: data.summary.totalPosts })
      summarySheet.addRow({ category: '총 좋아요', content: data.summary.totalReactions })
      summarySheet.addRow({ category: '총 댓글', content: data.summary.totalComments })

      // 방문자 통계 추가
      summarySheet.addRow({ category: '', content: '' }) // 빈 줄
      summarySheet.addRow({ category: '방문자 통계', content: '' })
      
      // 날짜 목록 생성 (프로젝트 기간 동안)
      const startDate = new Date(data.project.start_date)
      const endDate = new Date(data.project.end_date)
      const dates: string[] = []
      let currentDate = new Date(endDate)
      
      while (currentDate >= startDate) {
        dates.push(format(currentDate, 'yyyyMMdd'))
        currentDate.setDate(currentDate.getDate() - 1)
      }

      // 방문자 통계 헤더 추가
      const visitorHeaders = ['블로거', ...dates.map(date => format(new Date(
        parseInt(date.slice(0, 4)),
        parseInt(date.slice(4, 6)) - 1,
        parseInt(date.slice(6, 8))
      ), 'MM.dd'))]
      summarySheet.addRow(visitorHeaders)

      // 블로거별 방문자 데이터 추가
      Object.entries(data.summary.visitorStats).forEach(([bloggerId, stats]) => {
        const rowData = [
          stats.bloggerName,
          ...dates.map(date => stats.visitorData[date] || '누락')
        ]
        summarySheet.addRow(rowData)
      })
      
      // 2. 포스트 목록 시트
      const postsSheet = workbook.addWorksheet('포스트 목록')
      postsSheet.columns = [
        { header: '블로거', key: 'blogger', width: 20 },
        { header: '포스트 URL', key: 'url', width: 50 },
        { header: '상태', key: 'status', width: 15 },
        { header: '등록일', key: 'date', width: 15 },
        { header: '좋아요', key: 'reactions', width: 10 },
        { header: '댓글', key: 'comments', width: 10 }
      ]
      
      data.posts.forEach(post => {
        postsSheet.addRow({
          blogger: post.blogger_name,
          url: post.post_url,
          status: post.status === 'draft' ? '작성 대기' :
                 post.status === 'published' ? '작성 완료' :
                 post.status === 'confirmed' ? '확인 완료' :
                 post.status === 'rejected' ? '반려' : 
                 '작성 대기',
          date: format(new Date(post.created_at), 'yyyy.MM.dd'),
          reactions: post.stats?.reactions || 0,
          comments: post.stats?.comments || 0
        })
      })
      
      // 3. 게시글 노출 시트
      const exposureSheet = workbook.addWorksheet('게시글 노출')
      exposureSheet.columns = [
        { header: '키워드', key: 'keyword', width: 30 },
        { header: '순위', key: 'rank', width: 30 }
      ]
      
      // 키워드와 노출 정보 매칭
      data.keywords.forEach(keyword => {
        const exposureInfo = data.exposureImages.find(img => img.keyword === keyword.keyword)
        exposureSheet.addRow({
          keyword: keyword.keyword,
          rank: exposureInfo ? exposureInfo.ranks.join(', ') : '노출 안됨'
        })
      })
      
      // 엑셀 파일 생성
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })

      // 다운로드 링크 생성 및 클릭
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName}_보고서_${format(new Date(), 'yyyyMMdd')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      // 다운로드 로그 기록
      await recordExcelDownload(projectId)
      
      toast({
        title: "엑셀 다운로드 완료",
        description: "프로젝트 데이터가 엑셀 파일로 저장되었습니다.",
      })
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error)
      toast({
        title: "엑셀 다운로드 실패",
        description: "파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isDownloading}
      variant="default"
      className="bg-primary text-primary-foreground hover:bg-primary/90"
    >
      {isDownloading ? '다운로드 중...' : '엑셀 다운로드'}
    </Button>
  )
} 
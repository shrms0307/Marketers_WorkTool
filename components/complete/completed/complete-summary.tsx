'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface CompleteSummaryProps {
  data: {
    totalPosts: number
    completedPosts: number
    totalBloggers: number
    totalReactions: number
    totalComments: number
    visitorStats: {
      [bloggerId: string]: {
        bloggerName: string
        visitorData: {
          [date: string]: number
        }
      }
    }
  }
  project: {
    id: number
    name: string
    start_date: string
    end_date: string
    target_posts: number
    status: string
    created_by: string
    created_by_name: string
  }
}

export function CompleteSummary({ data, project }: CompleteSummaryProps) {
  console.log('=== 방문자 통계 데이터 ===')
  console.log('전체 데이터:', data)
  console.log('방문자 통계:', data.visitorStats)
  
  // 프로젝트 기간 동안의 날짜 배열 생성
  const startDate = new Date(project.start_date)
  const endDate = new Date(project.end_date)
  const dates: string[] = []
  
  let currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    // 날짜를 8자리 숫자 문자열로 변환 (예: "20240903")
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')
    const formattedDate = `${year}${month}${day}`
    dates.push(formattedDate)
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  console.log('생성된 날짜 배열:', dates)

  // 각 블로거별 방문자 데이터 확인
  Object.entries(data.visitorStats).forEach(([bloggerId, { bloggerName, visitorData }]) => {
    console.log(`\n=== ${bloggerName}(${bloggerId})의 방문자 데이터 ===`)
    console.log('전체 방문자 데이터:', visitorData)
    dates.forEach(date => {
      const numericDate = parseInt(date)  // 문자열을 숫자로 변환
      console.log(`${date}(${numericDate}): ${visitorData[numericDate] ?? '누락'}`)
    })
  })

  return (
    <div className="space-y-6">
      {/* 요약 정보 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>오픈일자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {format(new Date(project.start_date), 'yy.MM.dd', { locale: ko })} ~{' '}
              {format(new Date(project.end_date), 'yy.MM.dd', { locale: ko })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>진행 수량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(data.totalPosts || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>공감</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(data.totalReactions || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>댓글</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(data.totalComments || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 방문자 수 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>기간별 방문자 수</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <div className="w-[78vw]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>블로거</TableHead>
                    {dates.map(date => (
                      <TableHead key={date} className="text-right">
                        {format(new Date(
                          parseInt(date.slice(0, 4)),    // yyyy
                          parseInt(date.slice(4, 6)) - 1,  // MM (0-based)
                          parseInt(date.slice(6, 8))     // dd
                        ), 'MM.dd', { locale: ko })}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(data.visitorStats).map(([bloggerId, { bloggerName, visitorData }]) => (
                    <TableRow key={bloggerId}>
                      <TableCell>{bloggerName}</TableCell>
                      {dates.map(date => {
                        const numericDate = parseInt(date)  // 문자열을 숫자로 변환
                        return (
                          <TableCell key={date} className="text-right">
                            {visitorData[numericDate]?.toLocaleString() ?? ''}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 
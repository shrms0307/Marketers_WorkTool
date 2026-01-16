'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BlogTrendChart } from "@/components/charts/blog-charts"
import { getBlogDailyVisitors, type DailyVisitorData } from '../actions'

type ViewType = 'daily' | 'weekly' | 'monthly'
type DayRange = '30' | '60' | '90' | 'all'

interface VisitorTrendModalProps {
  isOpen: boolean
  onClose: () => void
  blogId: string
  colors: {
    visitors: string
    average: string
    followers: string
  }
}

// 날짜 정렬 함수
function sortByDate(a: DailyVisitorData, b: DailyVisitorData) {
  // YYYYMMDD 형식을 YYYY-MM-DD로 변환
  const formatDate = (dateStr: string) => {
    if (dateStr.includes('-')) return dateStr // 이미 변환된 경우
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }
  
  const dateA = new Date(formatDate(a.date))
  const dateB = new Date(formatDate(b.date))
  return dateA.getTime() - dateB.getTime()
}

export function VisitorTrendModal({ 
  isOpen, 
  onClose, 
  blogId,
  colors 
}: VisitorTrendModalProps) {
  const [viewType, setViewType] = useState<ViewType>('daily')
  const [dayRange, setDayRange] = useState<DayRange>('all')
  const [rawData, setRawData] = useState<DailyVisitorData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 데이터 로드 함수
  const loadData = async () => {
    setIsLoading(true)
    try {
      const dailyData = await getBlogDailyVisitors(blogId)
      setRawData(dailyData)
    } catch (error) {
      console.error('방문자 데이터 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 모달이 열릴 때만 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadData()
    } else {
      setRawData([])
    }
  }, [isOpen])

  // 데이터 가공
  const processedData = useMemo(() => {
    if (!rawData.length) return []

    console.log('처리할 원본 데이터:', rawData)

    // 일간 데이터 처리
    if (viewType === 'daily') {
      const sortedData = [...rawData].sort(sortByDate)
      const filteredData = dayRange === 'all' 
        ? sortedData 
        : sortedData.slice(-parseInt(dayRange))
      return filteredData
    }

    // 주간 데이터 처리
    if (viewType === 'weekly') {
      // 데이터를 날짜순으로 정렬
      const sortedData = [...rawData].sort(sortByDate)
      const weeklyData: DailyVisitorData[] = []
      
      // 7일씩 그룹화하여 처리
      for (let i = 6; i < sortedData.length; i += 7) {
        // 7일치 데이터 추출
        const weekData = sortedData.slice(i - 6, i + 1)
        // 방문자 수 합계 계산
        const visitors = weekData.reduce((sum, day) => sum + day.visitors, 0)
        // 마지막 날짜를 주간 데이터의 날짜로 사용
        const date = weekData[weekData.length - 1].date
        
        weeklyData.push({ date, visitors })
      }

      console.log('처리된 주간 데이터:', weeklyData)
      return weeklyData
    }

    // 월간 데이터 처리
    if (viewType === 'monthly') {
      const monthlyMap = new Map<string, number>()
      
      // 데이터를 날짜순으로 정렬
      const sortedData = [...rawData].sort(sortByDate)
      
      sortedData.forEach(({ date, visitors }) => {
        try {
          // YYYYMMDD 형식을 YYYY-MM으로 변환
          const year = date.slice(0, 4)
          const month = date.slice(4, 6)
          const monthKey = `${year}-${month}`
          monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + visitors)
        } catch (error) {
          console.error('월간 데이터 처리 실패:', { date, visitors, error })
        }
      })

      const monthlyData = Array.from(monthlyMap.entries())
        .map(([date, visitors]) => ({ date, visitors }))
        .sort((a, b) => {
          const [yearA, monthA] = a.date.split('-').map(Number)
          const [yearB, monthB] = b.date.split('-').map(Number)
          return yearA === yearB ? monthA - monthB : yearA - yearB
        })
      
      console.log('처리된 월간 데이터:', monthlyData)
      return monthlyData.map(item => {
        const [year, month] = item.date.split('-')
        return {
          ...item,
          date: `${year.slice(2)}년 ${parseInt(month)}월`
        }
      })
    }

    return []
  }, [rawData, viewType, dayRange])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>방문자 통계 상세</DialogTitle>
        </DialogHeader>

        {/* 기간 선택 버튼 그룹 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex gap-2">
            <Button 
              variant={viewType === 'daily' ? 'default' : 'outline'}
              onClick={() => setViewType('daily')}
            >
              일간
            </Button>
            <Button 
              variant={viewType === 'weekly' ? 'default' : 'outline'}
              onClick={() => setViewType('weekly')}
            >
              주간
            </Button>
            <Button 
              variant={viewType === 'monthly' ? 'default' : 'outline'}
              onClick={() => setViewType('monthly')}
            >
              월간
            </Button>
          </div>
          
          {/* 일간 선택 시에만 기간 선택 드롭다운 표시 */}
          {viewType === 'daily' && (
            <Select value={dayRange} onValueChange={(value: DayRange) => setDayRange(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="기간 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30일</SelectItem>
                <SelectItem value="60">60일</SelectItem>
                <SelectItem value="90">90일</SelectItem>
                <SelectItem value="all">전체</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* 차트 영역 */}
        <div className="h-[500px] p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              로딩 중...
            </div>
          ) : (
            <BlogTrendChart 
              data={processedData}
              colors={colors}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { BlogMixedChart } from "../charts/blog-mixed-chart"
import { ProjectBlogger } from "@/types/project"

interface ProjectBloggerChartsProps {
  bloggers: ProjectBlogger[]
}

const CHART_COLORS_KEY = 'chart_colors'
const DEFAULT_CHART_COLORS = {
  mixed: {
    visitors: '#3b82f6',
    followers: '#10b981',
  }
}

export function ProjectBloggerCharts({ bloggers }: ProjectBloggerChartsProps) {
  const [chartColors, setChartColors] = useState(DEFAULT_CHART_COLORS)

  useEffect(() => {
    try {
      const savedColors = localStorage.getItem(CHART_COLORS_KEY)
      if (savedColors) {
        const colors = JSON.parse(savedColors)
        if (colors?.mixed?.visitors && colors?.mixed?.followers) {
          setChartColors(colors)
        }
      }
    } catch (error) {
      console.error('차트 색상 로드 실패:', error)
    }
  }, [])

  return (
    <div className="grid grid-cols-2 gap-4">
      {bloggers.map(blogger => {
        // visitor_yesterday JSON 파싱 및 차트 데이터 변환
        const visitorData = blogger.visitor_yesterday ? JSON.parse(blogger.visitor_yesterday) : {}
        const chartData = Object.entries(visitorData).map(([date, count]) => ({
          date,
          visitors: count as number,
          followers: blogger.follower_count  // 이웃수는 현재 값으로 고정
        })).sort((a, b) => a.date.localeCompare(b.date))  // 날짜순 정렬

        return (
          <Card key={blogger.inf_blogid}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarImage src={blogger.inf_profileimage} />
                  <AvatarFallback>{blogger.inf_nickname[0]}</AvatarFallback>
                </Avatar>
                <CardTitle>{blogger.inf_nickname}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-medium mb-1 text-sm">방문자 & 이웃 추이</div>
              <div className="aspect-[2/1]">
                <BlogMixedChart 
                  data={chartData}
                  colors={chartColors.mixed}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
} 
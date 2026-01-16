'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface FollowerChartProps {
  data: Array<{
    id: string
    name: string
    data: Array<{
      date: string
      value: number
    }>
  }>
}

export function FollowerChart({ data }: FollowerChartProps) {
  // 차트 데이터 포맷 변환
  const chartData = data.map(d => {
    const dateStr = Object.keys(d)[0]
    return {
      date: dateStr,
      followers: d[dateStr]
    }
  })

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            fontSize={11}
            tickFormatter={(value) => `${value.slice(4, 6)}.${value.slice(6)}`}
          />
          <YAxis 
            fontSize={11}
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            itemStyle={{
              color: 'hsl(var(--foreground))',
            }}
            formatter={(value: number) => value.toLocaleString()}
            labelFormatter={(label) => `${label.slice(4, 6)}.${label.slice(6)}`}
          />
          <Legend />
          <Line 
            type="monotone"
            dataKey="followers"
            name="이웃"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
} 
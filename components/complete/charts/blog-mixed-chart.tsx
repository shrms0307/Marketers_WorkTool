'use client'

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface BlogMixedChartProps {
  data: Array<{
    date: string
    visitors: number
    followers: number
  }>
  colors: {
    visitors: string
    followers: string
  }
}

export function BlogMixedChart({ data, colors }: BlogMixedChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
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
        <Bar 
          dataKey="visitors" 
          name="방문자" 
          fill={colors.visitors}
          radius={[4, 4, 0, 0]}
        />
        <Line 
          type="monotone"
          dataKey="followers" 
          name="이웃" 
          stroke={colors.followers}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
} 
"use client"

import * as React from "react"
import { Line, LineChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

interface BlogChartProps {
  data: any[]
  colors: {
    visitors: string;
    followers: string;
    average: string;
  };
}

const chartConfig = {
  primary: {
    theme: {
      light: "hsl(0, 84%, 60%)",
      dark: "hsl(0, 84%, 60%)",
    },
  },
  secondary: {
    theme: {
      light: "hsl(142, 71%, 45%)",
      dark: "hsl(142, 71%, 45%)",
    },
  },
  bar: {
    theme: {
      light: "hsl(214, 84%, 56%)",
      dark: "hsl(214, 84%, 56%)",
    },
  },
}

const axisStyle = {
  style: {
    fontSize: '12px',
    fill: 'hsl(var(--muted-foreground))',
  },
  stroke: 'hsl(var(--border))',
  tickLine: false,
  axisLine: false,
}

const gridStyle = {
  strokeDasharray: "3 3",
  stroke: "hsl(var(--border))",
  opacity: 0.8,
  horizontal: true,
  vertical: true,
}

// 포스팅 & 방문자 혼합 차트
export function BlogMixedChart({ data, colors }: BlogChartProps) {
  return (
    <ChartContainer config={chartConfig}>
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
    </ChartContainer>
  )
}

// 평균 계산 함수
function calculateAverage(data: any[]) {
  const sum = data.reduce((acc, curr) => acc + curr.visitors, 0);
  return Math.round(sum / data.length);
}

// 방문자 트렌드 차트
export function BlogTrendChart({ data, colors }: BlogChartProps) {
  // 전체 평균 계산
  const averageVisitors = calculateAverage(data);
  
  // 평균선을 위한 데이터 포인트 생성
  const dataWithAverage = data.map(item => ({
    ...item,
    average: averageVisitors
  }));

  // Y축 범위 계산
  const maxVisitors = Math.max(...data.map(d => d.visitors));
  const minVisitors = Math.min(...data.map(d => d.visitors));
  const yAxisMax = Math.ceil(maxVisitors / 1000) * 1000;
  const yAxisMin = Math.floor(minVisitors / 1000) * 1000;

  return (
    <ChartContainer config={chartConfig}>
      <LineChart data={dataWithAverage}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date"
          fontSize={11}
          tickFormatter={(value) => `${value.slice(4, 6)}.${value.slice(6)}`}
        />
        <YAxis 
          fontSize={11}
          tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
          domain={[yAxisMin, yAxisMax]}
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
          dataKey="visitors"
          name="방문자"
          stroke={colors.visitors}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="average"
          name="평균"
          stroke={colors.average}
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
} 
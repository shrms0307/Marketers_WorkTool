'use client'

import { useEffect, useState, memo } from 'react'
import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BlogMixedChart, BlogTrendChart } from "@/components/charts/blog-charts"
import { getBlogAnalysis, getBlogTrends, type BlogAnalysisData } from '../actions'
import { format } from 'date-fns'
import { useNavbar } from '@/components/layout/navbar-provider'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Settings2 } from "lucide-react"
import { PostingHistoryTable } from "@/components/blog/posting-history-table"
import { getBlogPostings, type PostingData } from '../actions'
import Image from "next/image"
import { IMAGE_PATHS } from "@/lib/constants"
import { getProfileData, type ProfileData } from '@/app/actions/profile'
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useBlogAnalysis } from '@/hooks/use-blog-analysis'
import { useProfileData } from '@/hooks/use-profile-data'
import { VisitorTrendModal } from './modal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Props {
  blogId: string
}

interface ChartColors {
  mixed: {
    visitors: string;
    followers: string;
  };
  trend: {
    visitors: string;
    average: string;
  };
}

// localStorage 키 상수 정의
const CHART_COLORS_KEY = 'chart_colors'

// 기본 차트 색상 설정
const DEFAULT_CHART_COLORS = {
  mixed: {
    visitors: '#3b82f6',
    followers: '#10b981',
  },
  trend: {
    visitors: '#58c2ec',
    average: '#6b7280',
  }
}

// localStorage에서 색상 불러오기
const loadSavedColors = () => {
  if (typeof window === 'undefined') return DEFAULT_CHART_COLORS
  
  try {
    const saved = localStorage.getItem(CHART_COLORS_KEY)
    if (!saved) return DEFAULT_CHART_COLORS

    const parsed = JSON.parse(saved)
    // 모든 필수 색상이 있는지 확인
    if (parsed?.mixed?.visitors && parsed?.mixed?.followers && 
        parsed?.trend?.visitors && parsed?.trend?.average) {
      return parsed
    }
    return DEFAULT_CHART_COLORS
  } catch {
    return DEFAULT_CHART_COLORS
  }
}

const ColorPicker = memo(({ 
  label, 
  value, 
  onChange,
  id 
}: { 
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
}) => (
  <div 
    className="grid grid-cols-3 items-center gap-4"
    style={{
      transform: 'translateZ(0)',  // GPU 가속 활성화
      willChange: 'transform'      // 변화 최적화
    }}
  >
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type="color"
      value={value}
      className="col-span-2 h-8"
      onChange={(e) => onChange(e.target.value)}
      style={{
        cursor: 'pointer',
        transition: 'transform 0.2s',
        transform: 'translateZ(0)'
      }}
    />
  </div>
))
ColorPicker.displayName = 'ColorPicker'

// 공통으로 사용할 이미지 컨테이너 스타일
const imageContainerStyle = "w-[80px] flex items-center"

// blogTypeBadgeVariants 추가 (메인 페이지와 동일한 스타일)
const blogTypeBadgeVariants: Record<string, string> = {
  "관계강화형": "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80",
  "관계축소형": "bg-rose-100 text-rose-800 hover:bg-rose-100/80",
  "유입집중형": "bg-blue-100 text-blue-800 hover:bg-blue-100/80",
}

// 뱃지 변형 추가
const tooltipBadgeVariants: Record<string, string> = {
  "visitor_rank": "bg-sky-100 text-sky-800 hover:bg-sky-100/80",    // 방문자 순위용 (하늘색)
  "comment_rank": "bg-violet-100 text-violet-800 hover:bg-violet-100/80",  // 댓글 순위용 (보라색)
  "average": "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80",  // 평균용 (에메랄드)
  "ratio": "bg-violet-100 text-violet-800 hover:bg-violet-100/80",    // 비율용 (보라색)
  "engagement": "bg-rose-100 text-rose-800 hover:bg-rose-100/80"      // 참여율용 (장미색)
}

// getTooltipType 함수 수정
const getTooltipType = (value: string): string => {
  if (value.match(/기준\s*상위.*%/)) return 'visitor_rank'
  if (value.match(/(?<=이는\s*)(?:상위|하위).*%/)) return 'comment_rank'
  if (value.includes('평균')) return 'average'
  if (value.includes('%에')) return 'ratio'
  if (value.match(/\d{3,}\.?\d*%/)) return 'engagement'
  return 'visitor_rank' // 기본값
}

// 공통 스타일 정의
const labelStyle = "text-sm text-muted-foreground"
const valueStyle = "text-base font-medium truncate"
const statsStyle = "text-base font-medium"
const linkStyle = "text-base font-medium hover:underline cursor-pointer truncate block"

// 데이터 항목별 색상 정의
const dataColors = {
  nickname: "text-[#6f359d]",
  category: "text-[#0974bd]",
  followers: "text-[#16af57]",
  visitors: "text-[#febe30]",
  posts: "text-[#fd3597]"
}

// 스켈레톤 카드 컴포넌트
function SkeletonCard() {
  return (
    <Card>
      <CardContent className="py-8">
        <div className="grid grid-cols-6 gap-6">
          <div className={imageContainerStyle}>
            <Skeleton className="w-12 h-12" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// 스켈레톤 설명 카드 컴포넌트
function SkeletonDescriptionCard() {
  return (
    <Card>
      <CardContent className="grid gap-4 py-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  )
}

// 스켈레톤 차트 컴포넌트
function SkeletonChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Skeleton className="h-4 w-40 mb-2" />
            <Skeleton className="h-[200px] w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-40 mb-2" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 툴팁 설명 타입 정의
interface TooltipContent {
  title: string;
  description: string[];
}

// 툴팁 설명 함수 수정
const getTooltipDescription = (value: string, type: string): TooltipContent => {
  switch (type) {
    case 'visitor_rank':
      return {
        title: "평균 방문자수 상위 비율 및 순위",
        description: [
          "상위 비율: 자신의 방문자 수가 전체 데이터에서 얼마나 높은 비율에 속하는지를 백분율로 표현함",
          "순위: 평균 방문자수를 기준으로 내림차순 정렬함"
        ]
      }
    case 'comment_rank':
      return {
        title: "게시글당 댓글수 상위 비율",
        description: [
          "설명: 블로거의 게시글당 댓글수 비율을 백분율로 표현함",
          "백분율 의미: 특정 블로거의 게시글 중 가장 인기 있는 게시글이 전체 댓글에서 얼마나 큰 비중을 차지하는지 나타냄",
          "구간 분류:",
          "• 상위 10%: 매우 높음",
          "• 상위 25%: 높음",
          "• 하위 50%: 평균",
          "• 하위 25%: 다소 낮음",
          "• 하위 10%: 매우 낮음"
        ]
      }
    case 'average':
      return {
        title: "게시글당 댓글수",
        description: [
          "블로거가 작성한 게시글 하나당 평균적으로 몇 개의 댓글이 달렸는지 나타내는 값을 의미"
        ]
      }
    case 'ratio':
      return {
        title: "인기 포스트 댓글 비율",
        description: [
          "블로거의 전체 댓글 수 중에서 상위 게시글들에 달린 댓글이 차지하는 비율을 백분율로 표현"
        ]
      }
    case 'engagement':
      return {
        title: "이웃수 대비 방문자 수 비율",
        description: [
          "이웃 1명당 평균 방문자가 몇 명인지 나타내는 비율로써 평균방문자 수를 이웃수로 나눈 비율을 의미"
        ]
      }
    default:
      return { title: "정보", description: [value] }
  }
}

// 수치 관련 정규식 패턴들 (툴팁용) 수정
const tooltipPatterns = [
  {
    pattern: /(?<=기준\s*)(?:상위|하위)\s*\d+\.?\d*%(?=\s*(?:\(|에|$))/g,  // 방문자수 순위
    type: 'visitor_rank'
  },
  {
    pattern: /(?<=이는\s*)(?:상위|하위)\s*\d+\.?\d*%(?=\s*에)/g,  // 댓글 순위
    type: 'comment_rank'
  },
  {
    pattern: /(?<=평균\s*)(?:\d+\.?\d*개|개)/g,  // 평균 n개 패턴 (댓글수)
    type: 'average'
  },
  {
    pattern: /(?<=댓글의\s*)(?:\d+\.?\d*%|%)/g,  // 전체 댓글 비율
    type: 'ratio'
  },
  {
    pattern: /\d{3,}\.?\d*%(?=로)/g,  // 큰 비율 패턴 (이웃수 대비 방문자수)
    type: 'engagement'
  }
]

// DescriptionWithTooltips 컴포넌트 수정
const DescriptionWithTooltips = ({ description }: { description: string }) => {
  const renderDescriptionWithTooltips = () => {
    // 강조 처리할 패턴들
    const highlightPatterns = [
      {
        pattern: /"([^"]+)"/g,  // 따옴표로 묶인 텍스트
        className: "font-bold underline decoration-2"
      },
      {
        pattern: /최근\s*\d+일간/g,  // 기간 표현
        className: "font-bold underline decoration-2"
      },
      {
        pattern: /일평균\s*[\d,]+명/g,  // 일평균 방문자
        className: "font-bold underline decoration-2"
      },
      {
        pattern: /총\s*[\d,]+개/g,  // 총 게시글 수
        className: "font-bold underline decoration-2"
      },
      {
        pattern: /[\d,]+명의\s*이웃/g,  // 이웃 수
        className: "font-bold underline decoration-2"
      },
      {
        // 첫 문장의 이름과 분야
        pattern: /^([^은는]+)[은는]\s+'[^']+'(?=\s*분야)/g,
        className: "font-bold underline decoration-2"
      },
      {
        // 포스팅 관심도 부분
        pattern: /포스팅.*?(?:받고\s*있습니다|됩니다)/g,
        className: "font-bold underline decoration-2"
      },
      {
        // 참여율 관련 문구
        pattern: /(?:매우\s*)?(?:높은|낮은)\s*참여율을\s*보여줍니다/g,
        className: "font-bold underline decoration-2"
      },
      {
        // 대비 방문자 비율 부분
        pattern: /대비\s*방문자\s*비율은/g,
        className: "font-bold underline decoration-2"
      }
    ]
    
    // 모든 매치 찾기 (수치 + 강조)
    let matches: { value: string; index: number; type: 'tooltip' | 'highlight'; tooltipType?: string; className?: string }[] = []
    
    // 툴팁 패턴 매칭 (수치 데이터)
    tooltipPatterns.forEach(({ pattern, type }) => {
      let match
      while ((match = pattern.exec(description)) !== null) {
        matches.push({
          value: match[0],
          index: match.index,
          type: 'tooltip',
          tooltipType: type
        })
      }
    })

    // 강조 패턴 매칭
    highlightPatterns.forEach(({ pattern, className }) => {
      let match
      while ((match = pattern.exec(description)) !== null) {
        // 이미 툴팁으로 처리된 부분은 건너뛰기
        const isAlreadyMatched = matches.some(
          m => m.index <= match.index && m.index + m.value.length >= match.index + match[0].length
        )
        if (!isAlreadyMatched) {
          matches.push({
            value: match[0],
            index: match.index,
            type: 'highlight',
            className
          })
        }
      }
    })
    
    // 인덱스 순으로 정렬
    matches.sort((a, b) => a.index - b.index)
    
    // 텍스트 분할 및 JSX 생성
    let lastIndex = 0
    const parts: JSX.Element[] = []
    
    matches.forEach((match, idx) => {
      // 일반 텍스트 추가
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {description.slice(lastIndex, match.index)}
          </span>
        )
      }
      
      if (match.type === 'tooltip' && match.tooltipType) {
        const tooltipContent = getTooltipDescription(match.value, match.tooltipType)
        // 툴팁 추가
        parts.push(
          <TooltipProvider key={`tooltip-${idx}`}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Badge 
                    variant="outline"
                    className={`mx-1 font-medium cursor-pointer ${tooltipBadgeVariants[match.tooltipType]}`}
                  >
                    {match.value}
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-md"
              >
                <div className="max-w-xs p-3">
                  <h4 className="font-bold text-base border-b border-border/50 pb-2 mb-2.5 text-foreground">
                    "{tooltipContent.title}"
                  </h4>
                  <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                    {tooltipContent.description.map((line, i) => (
                      <p key={i} className="ml-0.5">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      } else {
        // 강조 텍스트 추가
        parts.push(
          <span 
            key={`highlight-${idx}`}
            className={match.className}
          >
            {match.value}
          </span>
        )
      }
      
      lastIndex = match.index + match.value.length
    })
    
    // 남은 텍스트 추가
    if (lastIndex < description.length) {
      parts.push(
        <span key="text-last">
          {description.slice(lastIndex)}
        </span>
      )
    }
    
    return parts
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-1 bg-primary rounded-full" />
        <h3 className="text-lg font-semibold">블로그 분석 결과</h3>
      </div>
      <div className="bg-card/50 p-4 rounded-lg border shadow-sm">
        <p className="text-base leading-relaxed">
          {renderDescriptionWithTooltips()}
        </p>
      </div>
    </div>
  )
}

// 블로그 유형별 설명 추가
const blogTypeDescriptions: Record<string, string> = {
  "관계강화형": "이웃과의 소통이 활발하며, 높은 충성도를 보유한 블로거입니다.",
  "관계축소형": "이웃 수는 적지만, 콘텐츠 영향력이 높은 블로거입니다.",
  "유입집중형": "검색 유입이 많고, 콘텐츠 도달률이 높은 블로거입니다."
}

export default function BlogAnalysisClient({ blogId }: Props) {
  const { setTitle } = useNavbar()
  const [chartColors, setChartColors] = useState<ChartColors>(DEFAULT_CHART_COLORS)
  const [showTrendModal, setShowTrendModal] = useState(false)
  
  // React Query로 데이터 fetching
  const { 
    data: analysisData, 
    isLoading, 
    error 
  } = useBlogAnalysis(blogId)

  const { 
    data: profileData 
  } = useProfileData(analysisData?.analysis.inf_address || null)

  useEffect(() => {
    if (analysisData?.analysis) {
      setTitle(`${analysisData.analysis.inf_nickname}의 블로그 분석`)
    }
  }, [setTitle, analysisData])

  // 컴포넌트 마운트 시 저장된 설정 불러오기
  useEffect(() => {
    const savedColors = loadSavedColors()
    setChartColors(savedColors)
  }, [])

  // 색상 변화 핸들러
  const handleColorChange = (
    chartType: 'mixed' | 'trend',
    colorKey: 'visitors' | 'followers' | 'average',
    value: string
  ) => {
    const newColors = {
      ...chartColors,
      [chartType]: {
        ...chartColors[chartType],
        [colorKey]: value
      }
    }
    setChartColors(newColors)
    localStorage.setItem(CHART_COLORS_KEY, JSON.stringify(newColors))
  }

  if (isLoading) {
    return (
      <PageContainer
        description={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div>
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <SkeletonDescriptionCard />
          </div>
          <SkeletonChart />
        </div>
      </PageContainer>
    )
  }
  if (error) return <div>에러: {(error as Error).message}</div>
  if (!analysisData) return <div>데이터가 없습니다</div>

  const { analysis: data, trends, postings } = analysisData

  return (
    <PageContainer
      description={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <img 
              src={data.inf_profileimage || '/images/default-profile.png'} 
              alt="" 
              className="w-12 h-12 rounded-full"
            />
            <div>
              <CardTitle className="text-lg">{data.inf_nickname}</CardTitle>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(data.update_datetime), 'yyyy-MM-dd')} 기준
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        {/* 블로그 정보 & 인플루언서 정보 카드 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* 블로그 정보 카드 */}
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-6 gap-6">
                <div className={imageContainerStyle}>
                  <Image 
                    src={`${IMAGE_PATHS.ICONS}/blog.png`}
                    alt="네이버 블로그" 
                    width={52}
                    height={52}
                    className="object-contain"
                    priority
                  />
                </div>

                <div className="space-y-1">
                  <div className={labelStyle}>닉네임</div>
                  <a 
                    href={data.blog_address} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`${linkStyle} ${dataColors.nickname}`}
                    title={data.inf_nickname}
                  >
                    {data.inf_nickname}
                  </a>
                </div>

                <div className="space-y-1">
                  <div className={labelStyle}>카테고리</div>
                  <div className={`${valueStyle} ${dataColors.category}`}>{data.category}</div>
                </div>

                <div className="space-y-1">
                  <div className={labelStyle}>이웃 수</div>
                  <div className={`${statsStyle} ${dataColors.followers}`}>
                    {data.follower_count.toLocaleString()}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className={labelStyle}>방문자 수</div>
                  <div className={`${statsStyle} ${dataColors.visitors}`}>
                    {data.visitor_avg.toLocaleString()}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className={labelStyle}>게시글 수</div>
                  <div className={`${statsStyle} ${dataColors.posts}`}>
                    {data.total_post_count.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 인플루언서 정보 카드 */}
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-6 gap-6">
                <div className={imageContainerStyle}>
                  <Image 
                    src={`${IMAGE_PATHS.ICONS}/inb.png`}
                    alt="인플루언서" 
                    width={40}
                    height={40}
                    className={`object-contain ml-1 ${!data.inf_address ? 'grayscale opacity-50' : ''}`}
                    priority
                  />
                </div>

                <div className="space-y-1">
                  <div className={labelStyle}>닉네임</div>
                  {data.inf_address ? (
                    <a 
                      href={data.inf_address}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`${linkStyle} ${dataColors.nickname}`}
                      title={data.inf_nickname}
                    >
                      {data.inf_nickname}
                    </a>
                  ) : (
                    <div className={`${valueStyle} ${dataColors.nickname}`}>-</div>
                  )}
                </div>

                <div className="space-y-1 col-span-3">
                  <div className={labelStyle}>카테고리/상세카테고리</div>
                  <div className={`${valueStyle} ${dataColors.category}`}>
                    {data.inf_address ? (
                      <>
                        <span>{profileData?.expertType || '-'}</span>
                        {profileData?.styleType && (
                          <>
                            <span className="text-muted-foreground">/</span>
                            <span>{profileData.styleType}</span>
                          </>
                        )}
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className={labelStyle}>팬 수</div>
                  <div className={`${statsStyle} ${dataColors.followers}`}>
                    {data.inf_address ? (
                      profileData?.subscriberCount.toLocaleString() || data.follower_count.toLocaleString()
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 블로그 유형 & 설명 카드 */}
        <Card>
          <CardContent className="py-6">
            <div className="grid gap-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-1 bg-primary rounded-full" />
                  <h2 className="text-lg font-semibold">블로그 유형</h2>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        className={`${blogTypeBadgeVariants[data.blogger_type] || ""} text-sm px-4 py-1`}
                        variant="outline"
                      >
                        {data.blogger_type}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent 
                      className="z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-md"
                    >
                      <div className="p-3">
                        <p className="max-w-xs text-sm text-foreground">
                          {blogTypeDescriptions[data.blogger_type] || "블로그 유형 정보"}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <DescriptionWithTooltips 
                description={data.description}
              />
            </div>
          </CardContent>
        </Card>

        {/* 차트 섹션 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* 방문자 & 이웃 추이 차트 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>방문자 & 이웃 추이</CardTitle>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none"></h4>
                      </div>
                      <div className="grid gap-2">
                        <ColorPicker
                          id="mixed-visitors"
                          label="방문자"
                          value={chartColors.mixed.visitors}
                          onChange={(value) => handleColorChange('mixed', 'visitors', value)}
                        />
                        <ColorPicker
                          id="mixed-followers"
                          label="이웃"
                          value={chartColors.mixed.followers}
                          onChange={(value) => handleColorChange('mixed', 'followers', value)}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              <div className="aspect-[2/1]">
                <BlogMixedChart 
                  data={trends} 
                  colors={{
                    visitors: chartColors.mixed.visitors,
                    followers: chartColors.mixed.followers
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* 방문자 추이 차트 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>방문자 추이</CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowTrendModal(true)}
                  >
                    자세히 보기
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">방문자 추이 설정</h4>
                        </div>
                        <div className="grid gap-2">
                          <ColorPicker
                            id="trend-visitors"
                            label="방문자"
                            value={chartColors.trend.visitors}
                            onChange={(value) => handleColorChange('trend', 'visitors', value)}
                          />
                          <ColorPicker
                            id="trend-average"
                            label="평균"
                            value={chartColors.trend.average}
                            onChange={(value) => handleColorChange('trend', 'average', value)}
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="aspect-[2/1]">
                <BlogTrendChart 
                  data={trends}
                  colors={{
                    visitors: chartColors.trend.visitors,
                    average: chartColors.trend.average
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>캠페인 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <PostingHistoryTable data={postings} />
          </CardContent>
        </Card>
      </div>
      <VisitorTrendModal 
        isOpen={showTrendModal}
        onClose={() => setShowTrendModal(false)}
        blogId={blogId}
        colors={{
          visitors: chartColors.trend.visitors,
          average: chartColors.trend.average
        }}
      />
    </PageContainer>
  )
} 
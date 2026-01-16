'use client'

import { usePathname } from 'next/navigation'

interface PageInfo {
  title: string
  subtitle: string
  description: string
}

const PAGE_INFO: Record<string, PageInfo> = {
  '/': {
    title: '블로그 순위',
    subtitle: '블로그 순위',
    description: '블로그 순위 정보를 확인할 수 있습니다'
  },
  '/blog-analysis': {
    title: '블로그 분석',
    subtitle: '블로그 분석',
    description: '블로그 분석 정보를 확인할 수 있습니다'
  },
}

function getPageInfo(pathname: string): PageInfo {
  if (PAGE_INFO[pathname]) return PAGE_INFO[pathname]
  
  if (pathname.startsWith('/blog-analysis/')) {
    return {
      title: '블로그 상세 분석',
      subtitle: '블로그 상세 분석',
      description: '블로그의 상세 분석 정보를 확인할 수 있습니다'
    }
  }
  
  return {
    title: '',
    subtitle: '',
    description: ''
  }
}

export function PageHeader() {
  const pathname = usePathname()
  const pageInfo = getPageInfo(pathname)

  return (
    <div className="border-b px-4 py-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-semibold">
          {pageInfo.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pageInfo.description}
        </p>
      </div>
    </div>
  )
} 
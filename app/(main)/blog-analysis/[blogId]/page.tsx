import { getBlogAnalysis } from '@/app/(main)/blog-analysis/actions'
import { Metadata } from 'next'
import BlogAnalysisClient from './client'
import { headers } from 'next/headers'

interface Props {
  params: { blogId: string }
}


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { analysis } = await getBlogAnalysis(params.blogId)
  
  return {
    title: `${analysis.inf_nickname}의 블로그 분석 - 더바이럴`,
    description: `${analysis.inf_blogid} 블로그의 상세 분석 정보입니다`,
  }
}

export default function BlogAnalysisPage({ params }: Props) {
  return (
    <BlogAnalysisClient 
      blogId={params.blogId} 
    />
  )
} 
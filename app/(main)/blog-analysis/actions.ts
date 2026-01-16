'use server'

import { withConnection } from "@/lib/db"
import { RowDataPacket } from 'mysql2'
import { BlogAnalysisData } from '@/components/blog/types'

interface BlogAnalysisResponse {
  analysis: BlogAnalysisData;
  trends: any[];
  postings: any[];
}

// 일간 방문자 데이터 타입 정의
export interface DailyVisitorData {
  date: string
  visitors: number
  average?: number
}

export async function getBlogAnalysis(blogId: string): Promise<BlogAnalysisResponse> {
  return withConnection(async (connection) => {
    // 모든 데이터를 한 번의 트랜잭션으로 가져오기
    const [analysisResult, trendResult, postingResult] = await Promise.all([
      connection.query(
        `SELECT * FROM blogger_data WHERE inf_blogid = ?`,
        [blogId]
      ),
      connection.query(
        `SELECT visitor_yesterday, visitor_avg, follower_count 
         FROM blogger_data 
         WHERE inf_blogid = ?`,
        [blogId]
      ),
      connection.query(
        `SELECT * FROM blogger_postdata
         WHERE inf_blogid = ? 
         ORDER BY post_date DESC 
         LIMIT 10`,
        [blogId]
      )
    ]);
    

    // 분석 데이터
    const analysis = (analysisResult[0] as any[])[0];
    if (!analysis) {
      throw new Error('블로그를 찾을 수 없습니다.');
    }

    // 트렌드 데이터 처리
    const trendData = (trendResult[0] as any[])[0];
    console.log('Raw trend data:', trendData);
    
    let visitorStats;
    try {
      visitorStats = JSON.parse(trendData.visitor_yesterday || '{}');
    } catch (error) {
      console.error('방문자 통계 파싱 실패:', error);
      visitorStats = {};
    }
    
    console.log('Parsed visitor stats:', visitorStats);
    
    // 최근 7일간의 데이터만 사용
    const trends = Object.entries(visitorStats)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-7)
      .map(([date, count]) => ({
        date,
        visitors: Number(count) || 0,
        followers: Number(trendData.follower_count) || 0,
        average: Number(trendData.visitor_avg) || 0
      }));
    
    console.log('Processed trends data:', trends);

    // 포스팅 데이터
    const postings = postingResult[0] as any[];

    return {
      analysis,
      trends,
      postings
    };
  });
}

// 날짜 처리 유틸리티 함수들
function getWeekNumber(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = Math.round(((d.getTime() - week1.getTime()) / 86400000 + 3 - (week1.getDay() + 6) % 7) / 7)
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
}

export async function getBlogDailyVisitors(blogId: string): Promise<DailyVisitorData[]> {
  return withConnection(async (connection) => {
    // 해당 블로거의 모든 데이터 가져오기
    const [rows] = await connection.execute(`
      SELECT visitor_yesterday
      FROM blog_visitor_follower
      WHERE inf_blogid = ?
      ORDER BY update_datetime DESC
    `, [blogId]) as [RowDataPacket[], any]

    if (!Array.isArray(rows) || !rows.length) return []

    try {
      // 날짜별로 가장 큰 값을 저장할 Map
      const visitorMap = new Map<string, number>()
      
      // 모든 레코드를 순회하면서 처리
      for (const row of rows) {
        console.log('Raw visitor_yesterday:', row.visitor_yesterday)
        
        let jsonStr = row.visitor_yesterday
          .replace(/'/g, '"')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
        
        console.log('Processed JSON string:', jsonStr)
        
        try {
          const data = JSON.parse(jsonStr)
          Object.entries(data).forEach(([date, count]) => {
            const currentCount = Number(count)
            const existingCount = visitorMap.get(date)
            
            if (!existingCount || currentCount > existingCount) {
              visitorMap.set(date, currentCount)
            }
          })
        } catch (parseError) {
          console.error('개별 레코드 파싱 실패:', parseError, '원본 데이터:', row.visitor_yesterday)
          continue
        }
      }

      // Map을 배열로 변환하고 날짜순으로 정렬
      const dailyData = Array.from(visitorMap.entries())
        .map(([date, visitors]) => ({ date, visitors }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return dailyData
    } catch (error) {
      console.error('방문자 데이터 파싱 실패:', error)
      return []
    }
  })
}

export type { BlogAnalysisData }; 
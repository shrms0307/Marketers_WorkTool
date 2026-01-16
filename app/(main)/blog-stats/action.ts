'use server'

interface BlogStats {
  blogId: string;
  averageVisits: number;
  currentVisits: number;
  dailyVisits: { [key: string]: number };
}

export async function getBlogStats(urls: string[]): Promise<BlogStats[]> {
  try {
    const stats: BlogStats[] = [];
    
    for (const url of urls) {
      const blogId = url.split('/')[3];
      const apiUrl = `http://blog.naver.com/NVisitorgp4Ajax.nhn?blogId=${blogId}`;
      
      const response = await fetch(apiUrl);
      const html = await response.text();
      
      // visitorcnt 태그의 id와 cnt 속성 추출
      const visitMatches = html.match(/<visitorcnt id="(\d+)" cnt="(\d+)"/g);
      
      if (!visitMatches) {
        throw new Error('방문자 데이터를 찾을 수 없습니다.');
      }

      // 일별 방문자수 데이터 추출
      const dailyVisits: { [key: string]: number } = {};
      let sum = 0;
      
      visitMatches.forEach((match, index) => {
        const dateMatch = match.match(/id="(\d+)"/);
        const countMatch = match.match(/cnt="(\d+)"/);
        
        if (dateMatch && countMatch) {
          const date = dateMatch[1];
          const count = parseInt(countMatch[1]);
          
          // YYYYMMDD 형식을 YY-MM-DD 형식으로 변환
          const formattedDate = `${date.slice(2, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
          dailyVisits[formattedDate] = count;
          
          if (index < 4) { // 최근 4일 평균 계산을 위해 합산
            sum += count;
          }
        }
      });
      
      const averageVisits = Math.floor(sum / 4);
      const currentVisits = Object.values(dailyVisits)[0] || 0;
      
      stats.push({
        blogId,
        averageVisits,
        currentVisits,
        dailyVisits
      });
    }
    
    return stats;
  } catch (error) {
    console.error('Error fetching blog stats:', error);
    throw new Error('블로그 통계 조회에 실패했습니다.');
  }
} 
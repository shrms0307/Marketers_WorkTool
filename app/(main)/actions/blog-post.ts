'use server'

import { BlogPostStats } from '@/types/project'

interface SingleBlogPostStats {
  likeCount: number
  commentCount: number
  postDate: string
  isValid: boolean
  blogId?: string
  postId?: string
}

// URL에서 블로그 정보 추출
function extractBlogInfo(url: string) {
  try {
    // URL 패턴 검사 (blog.naver.com/{blogId}/{postId} 형식)
    const urlPattern = /^https:\/\/blog\.naver\.com\/([^\/]+)\/(\d+)$/
    const match = url.match(urlPattern)
    
    if (!match) {
      throw new Error('Invalid URL format')
    }

    return {
      blogId: match[1],
      postId: match[2]
    }
  } catch (error) {
    console.error('URL 파싱 실패:', error)
    return null
  }
}

// 날짜 추출 함수
function extractPostDate(html: string): string | null {
  // 상대적 시간 표기를 실제 날짜로 변환하는 함수
  function convertRelativeTime(timeText: string): string | null {
    try {
      const now = new Date();
      
      // "시간 전" 패턴
      const hoursMatch = timeText.match(/(\d+)시간\s*전/);
      if (hoursMatch) {
        const hours = parseInt(hoursMatch[1]);
        const date = new Date(now.getTime() - hours * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
      }

      // "분 전" 패턴
      const minutesMatch = timeText.match(/(\d+)분\s*전/);
      if (minutesMatch) {
        const minutes = parseInt(minutesMatch[1]);
        const date = new Date(now.getTime() - minutes * 60 * 1000);
        return date.toISOString().split('T')[0];
      }

      // "일 전" 패턴
      const daysMatch = timeText.match(/(\d+)일\s*전/);
      if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
      }

      return null;
    } catch (e) {
      // console.error('상대시간 변환 실패:', e);
      return null;
    }
  }

  // 여러 가지 패턴 시도
  const patterns = [
    /<span class="se_publishDate pcol2">([^<]+)<\/span>/,
    /<p class="date\s*">([^<]+)<\/p>/,
    /class="[^"]*date[^"]*"[^>]*>([^<]+)</,
    /날짜\s*:\s*([0-9]{4}.[0-9]{1,2}.[0-9]{1,2})/,
    /class="[^"]*_date[^"]*"[^>]*>([^<]+)</  // 추가 패턴
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const rawDate = match[1].trim();
        
        // 상대적 시간 표기 확인
        if (rawDate.includes('전')) {
          const convertedDate = convertRelativeTime(rawDate);
          if (convertedDate) {
            return convertedDate;
          }
        }

        // 기존 날짜 형식 처리
        const cleaned = rawDate.replace(/\s+/g, '').replace(/\./g, '-');
        const [year, month, day] = cleaned.split('-').map(part => part.trim()).filter(Boolean);
        if (year && month && day) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      } catch (e) {
        // console.log(`날짜 파싱 실패 (패턴: ${pattern}):`, e);
        continue;
      }
    }
  }
  return null;
}

// 댓글 수 추출 함수
function extractCommentCount(html: string): number {
  try {
    const patterns = [
      /floating_bottom_commentCount">\s*(\d+)/,
      /comment_count[^>]*>(\d+)</,
      /댓글\s*<em>(\d+)<\/em>/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return parseInt(match[1]) || 0;
      }
    }
  } catch (e) {
    console.error('댓글 수 추출 실패:', e);
  }
  return 0;
}

// 재시도 로직을 위한 유틸리티 함수
async function fetchWithRetry(url: string, options: RequestInit, retries = 1, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries === 0) throw error;
    // console.log(`Retrying... Attempts left: ${retries}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, delay);
  }
}

export async function getBlogPostStats(urls: string | string[]): Promise<BlogPostStats> {
  const urlArray = Array.isArray(urls) ? urls : [urls]
  const result: BlogPostStats = {}

  await Promise.all(urlArray.map(async (url) => {
    try {
      const stats = await getSingleBlogPostStats(url)
      if (stats.isValid) {
        result[url] = {
          reactions: stats.likeCount,
          comments: stats.commentCount
        }
      }
    } catch (error) {
      console.error(`Failed to get stats for ${url}:`, error)
    }
  }))

  return result
}

// 기존의 getBlogPostStats 함수를 getSingleBlogPostStats로 이름 변경
async function getSingleBlogPostStats(url: string): Promise<SingleBlogPostStats> {
  try {
    // 블로그 정보 추출
    const blogInfo = extractBlogInfo(url)
    if (!blogInfo) {
      throw new Error('Invalid blog URL')
    }

    const { blogId, postId } = blogInfo
    // console.log('Extracted blog info:', { blogId, postId })

    // 1. 블로그 포스트 HTML 가져오기
    const blogUrl = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${postId}`
    // console.log('Fetching blog post:', blogUrl)
    
    const blogResponse = await fetchWithRetry(blogUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, 1)
    const html = await blogResponse.text()
    // console.log('Blog HTML length:', html.length)

    // 2. 공감 수 API 호출
    const timestamp = Date.now()
    const callbackName = `jQuery${Math.random().toString().slice(2)}_${timestamp}`
    const likeApiUrl = `https://apis.naver.com/blogserver/like/v1/search/contents?suppress_response_codes=true&pool=blogid&callback=${callbackName}&q=BLOG[${blogId}_${postId}]&isDuplication=true&cssIds=BASIC_PC,BLOG_PC&_=${timestamp}`
    // console.log('Fetching likes:', likeApiUrl)
    
    const likeResponse = await fetchWithRetry(likeApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, 1)
    const jsonpData = await likeResponse.text()
    
    // JSONP 응답에서 JSON 데이터 추출
    const jsonMatch = jsonpData.match(new RegExp(`${callbackName}\\((.+)\\)`))
    const likeData = jsonMatch ? JSON.parse(jsonMatch[1]) : { contents: [] }
    // console.log('Like data:', likeData)

    // 3. 데이터 추출
    const postDate = extractPostDate(html)
    if (!postDate) {
      console.warn('포스트 날짜를 찾을 수 없습니다:', url)
    }

    const commentCount = extractCommentCount(html)
    const likeCount = likeData.contents?.[0]?.reactions?.[0]?.count || 0

    return {
      likeCount,
      commentCount,
      postDate: postDate || '',
      isValid: true,
      blogId,
      postId
    }

  } catch (error) {
    return {
      likeCount: 0,
      commentCount: 0,
      postDate: '',
      isValid: false
    }
  }
}

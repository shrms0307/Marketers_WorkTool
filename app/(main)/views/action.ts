'use server'

import { scrapers } from "@/lib/scrapers";
import axios from "axios";
import * as cheerio from "cheerio";

interface ViewCountResult {
  url: string;
  siteName: string;  // 사이트 이름 (예: "네이버 카페")
  articleId: string; // 게시글 번호
  boardId?: string;  // 게시판 ID (카페 ID 등)
  viewCount: number;
  commentCount?: number;  // 댓글 수 필드 추가
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getViewCounts(urls: string[]): Promise<ViewCountResult[]> {
    const results: ViewCountResult[] = [];

    for (const url of urls) {
        try {
            const scraper = scrapers.find(s => s.pattern.test(url));
            if (!scraper) {
                results.push({
                    url,
                    siteName: "지원하지 않는 사이트",
                    articleId: "알 수 없음",
                    viewCount: 0,
                    commentCount: undefined
                });
                continue;
            }

            try {
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Referer': new URL(url).origin,
                        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'same-origin',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1'
                    },
                    timeout: 5000,
                    maxRedirects: 5
                });

                const $ = cheerio.load(response.data);
                
                const result: ViewCountResult = {
                    url,
                    siteName: scraper.pattern.toString().includes('cafe.naver.com') ? 
                        "네이버 카페" : 
                        scraper.pattern.toString().replace(/[\/\\]/g, '').replace(/[()]/g, ''),
                    articleId: url.split('/').pop() || '알 수 없음',
                    viewCount: 0,
                    commentCount: undefined
                };

                const scraperResult = await scraper.process({ id: 0, url }, $);
                result.viewCount = scraperResult.viewCount;
                result.commentCount = scraperResult.commentCount;

                if (scraper.pattern.toString().includes('cafe.naver.com')) {
                    const urlParts = url.split('/');
                    result.boardId = urlParts[3];
                }

                results.push(result);

            } catch (error) {
                console.error('Error fetching view count:', error);
                
                if (axios.isAxiosError(error)) {
                    console.error('=== Axios Error Details ===');
                    console.error('URL:', url);
                    console.error('Status:', error.response?.status);
                    console.error('Status Text:', error.response?.statusText);
                    console.error('Response Data:', error.response?.data);
                    
                    if (error.response?.status === 404) {
                        results.push({
                            url,
                            siteName: "존재하지 않는 게시글",
                            articleId: "404 에러",
                            viewCount: 0,
                            commentCount: undefined
                        });
                        continue;
                    }
                    
                    if (error.response?.status === 401 || error.response?.status === 403) {
                        const responseData = error.response?.data?.toString() || '';
                        const isLoginRequired = responseData.includes('로그인') || 
                                              responseData.includes('login') ||
                                              url.includes('cafe.naver.com');  // 네이버 카페의 경우
                        
                        results.push({
                            url,
                            siteName: isLoginRequired ? "로그인이 필요한 게시글" : "접근 제한된 게시글",
                            articleId: isLoginRequired ? "로그인 필요" : `${error.response.status} 에러`,
                            viewCount: 0,
                            commentCount: undefined
                        });
                        continue;
                    }

                    if (error.response?.status === 429) {
                        results.push({
                            url,
                            siteName: "요청 횟수 초과",
                            articleId: "잠시 후 다시 시도",
                            viewCount: 0,
                            commentCount: undefined
                        });
                        continue;
                    }

                    if (error.response?.status && error.response?.status >= 500) {
                        results.push({
                            url,
                            siteName: "서버 오류",
                            articleId: `${error.response?.status || '알 수 없음'} 에러`,
                            viewCount: 0,
                            commentCount: undefined
                        });
                        continue;
                    }
                } else {
                    console.error('=== Non-Axios Error ===');
                    console.error('URL:', url);
                    console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
                    console.error('Error Message:', error instanceof Error ? error.message : String(error));
                    console.error('Error Stack:', error instanceof Error ? error.stack : 'No stack trace available');
                }

                try {
                    console.log('Retrying with different User-Agent...');
                    await delay(1500);
                    
                    const response = await axios.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'ko-KR,ko;q=0.9',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        },
                        timeout: 8000
                    });

                    const $ = cheerio.load(response.data);
                    
                    const result: ViewCountResult = {
                        url,
                        siteName: scraper.pattern.toString().includes('cafe.naver.com') ? 
                            "네이버 카페" : 
                            scraper.pattern.toString().replace(/[\/\\]/g, '').replace(/[()]/g, ''),
                        articleId: url.split('/').pop() || '알 수 없음',
                        viewCount: 0,
                        commentCount: undefined
                    };

                    const scraperResult = await scraper.process({ id: 0, url }, $);
                    result.viewCount = scraperResult.viewCount;
                    result.commentCount = scraperResult.commentCount;

                    results.push(result);
                    console.log('Retry successful:', url);

                } catch (retryError) {
                    console.error('=== Retry Failed ===');
                    console.error('URL:', url);
                    if (axios.isAxiosError(retryError)) {
                        console.error('Retry Status:', retryError.response?.status);
                        console.error('Retry Error:', retryError.message);
                    } else {
                        console.error('Retry Error:', retryError);
                    }

                    results.push({
                        url,
                        siteName: "재시도 실패",
                        articleId: "접근 불가",
                        viewCount: 0,
                        commentCount: undefined
                    });
                }
            }
        } catch (error) {
            console.error('Error processing URL:', error);
            results.push({
                url,
                siteName: "에러 발생",
                articleId: "에러",
                viewCount: 0,
                commentCount: undefined
            });
        }
    }

    return results;
} 
// lib/scrapers.ts
import * as cheerio from 'cheerio';
import axios from 'axios';

export interface ScraperResult {
    viewCount: number;
    commentCount?: number;
}

export interface Scraper {
    pattern: RegExp;
    process: (urlData: { id: number; url: string }, $: cheerio.CheerioAPI) => Promise<ScraperResult>;
}

export const scrapers: Scraper[] = [
    // 딜바다
    {
        pattern: /www\.dealbada\.com/,
        process: async (urlData, $) => {
            const viewCountElement = $('span:contains("조회")').next('span');
            const viewCountText = viewCountElement.text().trim().replace(/,/g, '');
            const viewCount = parseInt(viewCountText, 10);
            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 네이버 카페
    {
        pattern: /cafe\.naver\.com/,
        process: async (urlData, $) => {
            const urlParts = urlData.url.split('/');
            const cafeName = urlParts[3];
            const postId = urlParts[4];

            const scripts = $('script');
            let cafeId = null;
            let commentCount = 0;
            let viewCount = 0;

            scripts.each((i, script) => {
                const scriptText = $(script).text();
                const cafeIdMatch = scriptText.match(/var g_sClubId = "(.*)";/);
                if (cafeIdMatch && cafeIdMatch[1]) {
                    cafeId = cafeIdMatch[1];
                }
            });

            if (cafeId) {
                try {
                    const articleUrl = `https://apis.naver.com/cafe-web/cafe-articleapi/cafes/${cafeId}/articles/${postId}`;
                    const { data: articleData } = await axios.get(articleUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': urlData.url
                        }
                    });
                    
                    // API 응답 데이터 로깅
                    console.log('\n=== Naver Cafe API Response ===');
                    console.log('Previous 5 lines:');
                    const dataStr = JSON.stringify(articleData, null, 2).split('\n');
                    const readCountIndex = dataStr.findIndex(line => line.includes('readCount'));
                    const commentCountIndex = dataStr.findIndex(line => line.includes('commentCount'));
                    
                    // readCount 주변 5줄
                    console.log('\nAround readCount:');
                    for (let i = Math.max(0, readCountIndex - 5); i < Math.min(dataStr.length, readCountIndex + 6); i++) {
                        console.log(dataStr[i]);
                    }
                    
                    // commentCount 주변 5줄
                    console.log('\nAround commentCount:');
                    for (let i = Math.max(0, commentCountIndex - 5); i < Math.min(dataStr.length, commentCountIndex + 6); i++) {
                        console.log(dataStr[i]);
                    }
                    
                    viewCount = articleData.article?.readCount || 0;
                    commentCount = articleData.article?.commentCount || 0;
                    
                    // 저장된 값 로깅
                    console.log('\n=== Saved Values ===');
                    console.log('View Count:', viewCount);
                    console.log('Comment Count:', commentCount);
                    console.log('Saved to global.lastCommentCount:', commentCount);
                    console.log('=====================================\n');
                    
                    // commentCount를 전역 객체에 저장
                    (global as any).lastCommentCount = commentCount;
                    
                    return {
                        viewCount: articleData.article?.readCount || 0,
                        commentCount: articleData.article?.commentCount || 0
                    };
                } catch (apiError) {
                    console.error(`Error fetching article data: ${apiError}`);
                    return { viewCount: 0 };
                }
            }

            return { viewCount: 0 };
        },
    },
    // 디시인사이드
    {
        pattern: /gall\.dcinside\.com/,
        process: async (urlData, $) => {
            const viewCountElement = $('span.gall_count').text().trim();
            const viewCountText = viewCountElement.replace(/조회\s+/g, '').replace(/,/g, '');
            const viewCount = parseInt(viewCountText, 10);

            console.log(`DCInside - 조회수: ${viewCount}`);
            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 루리웹
    {
        pattern: /bbs\.ruliweb\.com/,
        process: async (urlData, $) => {
            const viewCountElement = $('p:contains("조회")').text().trim();
            const viewCountText = viewCountElement.replace(/.*조회\s+/g, '').replace(/,/g, '');
            const viewCount = parseInt(viewCountText, 10);

            console.log(`Ruliweb - 조회수: ${viewCount}`);
            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 뽐뿌
    {
        pattern: /www\.ppomppu\.co\.kr/,
        process: async (urlData, $) => {
            try {
                const viewCountElement = $('.topTitle-mainbox li').eq(2);
                if (viewCountElement.length === 0) {
                    console.error('조회수 요소를 찾을 수 없습니다.');
                    return { viewCount: 0 };
                }
                const viewCountText = viewCountElement.text().replace(/[^\d]/g, '');
                const viewCount = parseInt(viewCountText, 10);

                console.log(`Ppomppu - 조회수: ${viewCount}`);
                return { viewCount: isNaN(viewCount) ? 0 : viewCount };
            } catch (error: unknown) {
                if (error instanceof Error) {
                    console.error(`Error fetching Ppomppu data: ${error.message}`);
                } else {
                    console.error('Unknown error occurred');
                }
                return { viewCount: 0 };
            }
        },
    },
    // 판 네이트
    {
        pattern: /pann\.nate\.com/,
        process: async (urlData, $) => {
            // "조회"라는 텍스트가 포함된 <span class="count"> 요소를 선택
            const viewCountElement = $('span.count').text().trim();

            // "조회"라는 텍스트를 제거하고 숫자만 남기기
            const viewCountText = viewCountElement.replace(/조회/g, '').trim().replace(/,/g, '');
            const viewCount = parseInt(viewCountText, 10);

            console.log(`Pann Nate - 조회수: ${viewCount}`);
            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 꼬르넷
    {
        pattern: /ggoorr\.net/,
        process: async (urlData, $) => {
            // "조회"라는 텍스트가 포함된 <span> 요소를 선택
            const viewCountElement = $('span:contains("조회") b').text().trim();
            const viewCount = parseInt(viewCountElement.replace(/,/g, ''), 10); // 쉼표 제거 후 정수로 변환

            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 돈뿌
    {
        pattern: /donppu\.com/,
        process: async (urlData, $) => {
            // 조회수를 포함하는 <span class="count_read"> 요소를 선택
            const viewCountElement = $('span.count_read').text().trim();

            // 조회수 숫자만 남기기
            const viewCountText = viewCountElement.replace(/[^\d]/g, ''); // 숫자만 남기기
            const viewCount = parseInt(viewCountText, 10);

            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 시티 FIFA
    {
        pattern: /www\.city\.kr/, // URL 패턴
        process: async (urlData, $) => {
            // "조회"라는 텍스트가 포함된 <span> 요소를 선택
            const viewCountElement = $('span:contains("조회") b').text().trim();
            const viewCount = parseInt(viewCountElement.replace(/,/g, ''), 10); // 쉼표 제거 후 정수로 변환

            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 빠삭
    {
        pattern: /bbasak\.com/,
        process: async (urlData, $) => {
            try {
                // p.info의 전체 텍스트를 가져와서 파싱
                const infoText = $('p.info').text();
                const matches = infoText.match(/조회\s*([0-9,]+)/);
                
                if (matches && matches[1]) {
                    const viewCount = parseInt(matches[1].replace(/,/g, ''), 10);
                    console.log(`빠삭 - 조회수: ${viewCount}`);
                    return { viewCount: isNaN(viewCount) ? 0 : viewCount };
                }
                
                return { viewCount: 0 };
            } catch (error) {
                console.error('빠삭 조회수 파싱 에러:', error);
                return { viewCount: 0 };
            }
        },
    },
    // 와이고수
    {
        pattern: /ygosu\.com/, // URL 패턴
        process: async (urlData, $) => {
            // "READ"라는 텍스트가 포함된 <div> 요소를 선택
            const readCountElement = $('div.date').text().trim();

            // "READ"라는 텍스트를 제거하고 숫자만 남기기
            const readCountText = readCountElement.match(/READ\s*:\s*(\d+)/);
            const viewCount = readCountText ? parseInt(readCountText[1], 10) : 0; // 정수로 변환

            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 아르카 라이브 핫딜
    {
        pattern: /arca\.live\/b\/hotdeal/, // URL 패턴
        process: async (urlData, $) => {
            // "조회수"라는 텍스트가 포함된 <span> 요소를 선택
            const viewCountElement = $('span:contains("조회수")').next('span.body').text().trim();
            const viewCount = parseInt(viewCountElement.replace(/,/g, ''), 10); // 쉼표 제거 후 정수로 변환

            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 코
    {
        pattern: /meeco\.kr/, // URL 패턴
        process: async (urlData, $) => {
            // "조회 수"라는 텍스트가 포함된 <li> 요소를 선택
            const viewCountElement = $('li:contains("조회 수") .num').text().trim();
            const viewCount = parseInt(viewCountElement.replace(/,/g, ''), 10); // 쉼표 제거 후 정수로 변환

            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 마이트 추후진행
    {
        pattern: /mimint\.co\.kr/, // URL 패턴
        process: async (urlData, $) => {
            // "조회 :"라는 텍스트가 포함된 <span> 요소의 다음 <span> 요소를 선택
            const viewCountElement = $('span.count').next('span').text().trim(); // "조회 :" 다음의 <span> 요소 선택

            // 조회수 숫자만 남기기
            const viewCount = parseInt(viewCountElement.replace(/,/g, ''), 10); // 쉼표 제거 후 정수로 변환

            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 맘투데이
    {
        pattern: /momtoday\.co\.kr/, // URL 패턴
        process: async (urlData, $) => {
            // "조회"라는 텍스트가 포함된 <div> 요소를 선택
            const viewCountElement = $('#article_info').text().trim();

            // "조회"라는 텍스트를 제거하고 숫자만 남기기
            const viewCountText = viewCountElement.match(/조회\s*(\d+)/);
            const viewCount = viewCountText ? parseInt(viewCountText[1], 10) : 0; // 정수로 변환

            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 더쿠
    {
        pattern: /theqoo\.net/,
        process: async (urlData, $) => {
            try {
                // far fa-eye 클래스를 가진 i 태그를 찾고 그 다음의 텍스트를 가져옴
                const viewCountText = $('.count_container i.far.fa-eye')
                    .get(0)
                    ?.nextSibling
                    ?.nodeValue
                    ?.trim();

                const viewCount = viewCountText ? parseInt(viewCountText, 10) : 0;
                console.log(`더쿠 - 조회수: ${viewCount}`);
                return { viewCount: isNaN(viewCount) ? 0 : viewCount };
            } catch (error) {
                console.error('더쿠 조회수 파싱 에러:', error);
                return { viewCount: 0 };
            }
        },
    },
    // 이지데이
    {
        pattern: /ezday\.co\.kr/, // URL 패턴
        process: async (urlData, $) => {
            // "조회"라는 텍스트가 포함된 <span> 요소의 <em> 태그에서 조회수를 가져옵니다.
            const viewCountElement = $('div.board_i span').first().find('em').text().trim(); // 첫 번째 span의 <em> 태그 선택

            // 조회수 숫자만 남기기
            const viewCount = parseInt(viewCountElement.replace(/,/g, ''), 10); // 쉼표 제거 후 정수로 변환

            return { viewCount: isNaN(viewCount) ? 0 : viewCount }; // 조회수가 유효하지 않으면 0 반환
        },
    },
    // 인스티즈
    {
        pattern: /instiz\.net/, // URL 패턴
        process: async (urlData, $) => {
            // 조회수를 포함하는 <span id="hit"> 요소를 선택
            const viewCountElement = $('#hit').text().trim();

            // 조회수 숫자만 남기기
            const viewCount = parseInt(viewCountElement.replace(/,/g, ''), 10); // 쉼표 제거 후 정수로 변환

            return { viewCount: isNaN(viewCount) ? 0 : viewCount }; // 조회수가 유효하지 않으면 0 반환
        },
    },
    // 유부토크 로그인 해야함 불가
    {
        pattern: /ubtalk\.co\.kr\/pan_5/,
        process: async (urlData, $) => {
            const viewCountElement = $('span.view_count').text().trim();
            const viewCountText = viewCountElement.replace(/,/g, '');
            const viewCount = parseInt(viewCountText, 10);
            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 쓰레딕 조회수가 없음
    {
        pattern: /thredic\.com/,
        process: async (urlData, $) => {
            const viewCountElement = $('span.view-count').text().trim();
            const viewCountText = viewCountElement.replace(/,/g, '');
            const viewCount = parseInt(viewCountText, 10);
            return { viewCount: isNaN(viewCount) ? 0 : viewCount };
        },
    },
    // 디미토리
    {
        pattern: /dmitory\.com/, // URL 패턴
        process: async (urlData, $) => {
            // 조회수를 포함하는 <span> 요소를 선택
            const viewCountElement = $('span:has(i.fas.fa-eye) b').text().trim(); // 눈 아이콘이 있는 <span>의 <b> 태그 선택

            // 조회수 숫자만 남기기
            const viewCount = parseInt(viewCountElement.replace(/,/g, ''), 10); // 쉼표 제거 후 정수로 변환

            return { viewCount: isNaN(viewCount) ? 0 : viewCount }; // 조회수가 유효하지 않으면 0 반환
        },
    },
    //뉴덕 차단당함
    {
        pattern: /newduck\.net/, // URL 패턴
        process: async (urlData, $) => {
            // 조회수를 포함하는 <span class="text-en ae-read"> 요소를 선택
            const viewCountElement = $('span.text-en.ae-read')
                .contents()
                .filter(function () {
                    return this.nodeType === 3; // 텍스트 노드만 선택
                })
                .text()
                .trim(); // 텍스트 노드에서 조회수 가져오기

            // 조회수 숫자만 남기기
            const viewCount = parseInt(viewCountElement.replace(/,/g, ''), 10); // 쉼표 제거 후 정수로 변환

            return { viewCount: isNaN(viewCount) ? 0 : viewCount }; // 조회수가 유효하지 않으면 0 반환
        },
    },
    // 아줌마 닷컴
    {
        pattern: /talktalk\.azoomma\.com/, // URL 패턴
        process: async (urlData, $) => {
            // "조회 :"라는 텍스트가 포함된 <span> 요소에서 조회수를 가져옵니다.
            const viewCountElement = $('span.span_out').first().text().trim(); // 첫 번째 <span class="span_out"> 선택

            // "조회 :"라는 텍스트를 제거하고 숫자만 남기기
            const viewCountText = viewCountElement.replace(/조회\s*:\s*/, '').trim();
            const viewCount = parseInt(viewCountText.replace(/,/g, ''), 10); // 쉼표 제거 후 정수로 변환

            return { viewCount: isNaN(viewCount) ? 0 : viewCount }; // 조회수가 유효하지 않으면 0 반환
        },
    },
];

async function fetchNaverCafeViewCount(cafeId: string, postId: string, refererUrl: string) {
    const articleUrl = `https://apis.naver.com/cafe-web/cafe-articleapi/cafes/${cafeId}/articles/${postId}`;
    try {
        const { data: articleData } = await axios.get(articleUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                Referer: refererUrl,
                Cookie: 'your_cookie_here',
            },
        });
        return isNaN(articleData.article.readCount) ? 0 : articleData.article.readCount;
    } catch (apiError) {
        console.error(`Error fetching article data: ${apiError}`);
        return 0;
    }
}
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';



interface RelatedKeyword {
  keyword: string;
}

interface CommentData {
  id: number;
  date: string;
  writer: {
    id: string;
    nick: string;
  };
  contents: string;
  parentCommentNo: number;
  isReply: boolean;
}
interface PostInfo {
  date: string;
  media: string;
  title: string;
  url: string;
  section: string;
  content?: string;
  viewCount?: number;
  comments?: CommentData[];
  collected_at?: string;   // 수집시간
  media_type?: string;  // 매체 유형 
}


interface ScrapeResult {
  relatedKeywords: RelatedKeyword[];
  popularTopics: { topic: string }[];
  table: string[][];
  popularTopicsTable: string[][];
  postsTable: PostInfo[];
  influencerTable: PostInfo[];
  mergedTable: (PostInfo & { type: 'post' | 'influencer' })[];
}

/**
 * Cleans up extracted content by removing excessive newlines and whitespace
 * @param content The raw content string to clean
 * @returns Cleaned content with normalized line breaks
 */

function cleanupContent(content: string | undefined): string {
  if (!content) return '';
  return content
    // 1. 보이지 않는 제로폭공백, &nbsp; 등 삭제
    .replace(/\u200b/g, '')
    .replace(/\u00a0/g, ' ')
    // 2. 탭 → 공백
    .replace(/\t/g, ' ')
    // 3. 각 줄 앞뒤 공백 제거, 빈 줄 제거
    .split('\n').map(line => line.trim()).filter(Boolean).join('\n')
    // 4. 2줄 이상 연속 줄바꿈 → 1줄로
    .replace(/\n{2,}/g, '\n')
    // 5. 전체 앞뒤 공백도 정리
    .trim();
}

/**
 * Setup logging directory and return paths for log and screenshot files
 * @param keyword The search keyword
 * @returns Object containing log file path and screenshot file path
 */
const setupLogging = (keyword: string) => {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(logDir, `naver_crawler_${timestamp}.log`);
  const screenshotFile = path.join(logDir, `naver_screenshot_${keyword}_${timestamp}.png`);
  return { logFile, screenshotFile };
};

const logToFile = (logFile: string, message: string) => {
  fs.appendFileSync(logFile, `${message}\n`);
};

// YYYY.MM.DD.HH:mm 형태로 반환하는 함수
function getCurrentKSTTimeStr() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000); // 9시간(ms) 더함
  const yyyy = kst.getUTCFullYear();
  const mm = (kst.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = kst.getUTCDate().toString().padStart(2, '0');
  const hh = kst.getUTCHours().toString().padStart(2, '0');
  const min = kst.getUTCMinutes().toString().padStart(2, '0');
  return `${yyyy}.${mm}.${dd}.${hh}:${min}`;
}
const collectedAt = getCurrentKSTTimeStr();

/**
 * 브라우저와 모든 페이지를 안전하게 종료하는 함수
 * @param browser Puppeteer 브라우저 인스턴스
 * @param logFile 로그 파일 경로
 */
async function safeBrowserClose(browser: puppeteer.Browser | null, logFile: string): Promise<void> {
  if (!browser) return;
  
  try {
    logToFile(logFile, 'Starting browser cleanup process...');
    
    // 1. 모든 페이지 가져오기
    const pages = await browser.pages();
    logToFile(logFile, `Found ${pages.length} open pages`);
    
    // 2. 각 페이지를 개별적으로 닫기
    for (const page of pages) {
      try {
        if (!page.isClosed()) {
          await page.close();
          logToFile(logFile, 'Page closed successfully');
        }
      } catch (pageError) {
        logToFile(logFile, `Error closing page: ${pageError.message}`);
      }
    }
    
    // 3. 브라우저 프로세스 종료
    await browser.close();
    logToFile(logFile, 'Browser closed successfully');
    
    // 4. 추가 안전장치 - 프로세스가 실제로 종료될 때까지 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (browserError) {
    logToFile(logFile, `Error during browser cleanup: ${browserError.message}`);
    
    // 강제 종료 시도
    try {
      const browserProcess = browser.process();
      if (browserProcess && !browserProcess.killed) {
        browserProcess.kill('SIGKILL');
        logToFile(logFile, 'Browser process force killed');
      }
    } catch (killError) {
      logToFile(logFile, `Error force killing browser: ${killError.message}`);
    }
  }
}

/**
 * 페이지를 안전하게 닫는 함수
 * @param page Puppeteer 페이지 인스턴스
 * @param logFile 로그 파일 경로
 */
async function safePageClose(page: puppeteer.Page | null, logFile: string): Promise<void> {
  if (!page) return;
  
  try {
    if (!page.isClosed()) {
      await page.close();
    }
  } catch (error) {
    logToFile(logFile, `Error closing page: ${error.message}`);
  }
}

async function extractNaverBlogComments(pageOrFrame, postUrl) {
  // 1. blogId, logNo 파싱
  const urlObj = new URL(postUrl);
  const blogId = urlObj.searchParams.get('blogId') || urlObj.pathname.split('/')[1];
  const logNo = urlObj.searchParams.get('logNo') || urlObj.pathname.split('/')[2];

  // 2. Rest API 우선 호출
  let restComments = [];
  try {
    // Rest API는 크롤링 차단, Referer/UA 필수
    const apiUrl = `https://blog.naver.com/api/commentList?blogId=${blogId}&logNo=${logNo}&pageSize=100&pageNo=1&parentCommentNo=&sortOrder=asc`;
    const response = await fetch(apiUrl, {
      headers: {
        'Referer': postUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.resultList)) {
        restComments = data.resultList.map((item, idx) => ({
          id: item.commentNo,
          date: item.regDate,
          writer: {
            id: item.writerUserId || '',
            nick: item.nickName || '',
          },
          contents: item.contents || '',
          parentCommentNo: item.parentCommentNo || 0,
          isReply: !!item.parentCommentNo,
        }));
      }
    }
  } catch (e) {
    // Rest API 실패시 무시 (차단, 비공개 등)
  }
  if (restComments.length > 0) {
    return restComments;
  }

  // 3. Rest API 실패 → DOM fallback
  const commentSelector = 'ul.u_cbox_list > li.u_cbox_comment';
  const moreSelector = '.u_cbox_btn_more';

  // 더보기 버튼 반복 클릭
  while (await pageOrFrame.$(moreSelector)) {
    await pageOrFrame.click(moreSelector);
    await pageOrFrame.waitForTimeout(1000);
  }

  // 댓글 파싱
  await pageOrFrame.waitForSelector(commentSelector, { timeout: 3000 }).catch(() => {});
  return await pageOrFrame.$$eval(commentSelector, nodes => nodes.map(li => {
    const nick = li.querySelector('.u_cbox_nick')?.textContent?.trim() || '';
    const content = li.querySelector('.u_cbox_contents')?.innerHTML
      ?.replace(/<br\s*\/?>/gi, '\n')
      ?.replace(/&nbsp;/g, ' ')
      ?.replace(/<[^>]+>/g, '')
      ?.trim() || '';
    const date = li.querySelector('.u_cbox_date')?.getAttribute('data-value') ||
                 li.querySelector('.u_cbox_date')?.textContent?.trim() || '';
    return {
      id: li.getAttribute('data-id') || 0,
      date,
      writer: { id: '', nick },
      contents: content,
      parentCommentNo: -1,
      isReply: !!li.querySelector('.u_cbox_reply_area'),
    };
  }));
}

// 카페 댓글 추출 함수
async function extractComments(url: string): Promise<CommentData[]> {
  try {
    let normalizedUrl = url;

    // 1. ?art=... 파라미터가 붙어있는 신형 카페 URL 대응
    let clubid = '';
    let articleid = '';

    try {
      const urlObj = new URL(url);

      // cafe.naver.com/{cafeId}/{articleId} 구조 추출
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length >= 3) {
        clubid = pathParts[1];
        articleid = pathParts[2].replace(/[^0-9]/g, '');
      }

      //  /{cafeId}/{articleId}?art=... 이런 식이면 articleid 다시 추출
      if (urlObj.searchParams.has('art')) {
        // art=... JWT 구조면, 디코딩하지 말고 URL에서 articleid 우선 추출
        if (!articleid) {
          // 예시: .../overseer/1321930?art=...
          articleid = pathParts[pathParts.length - 1].replace(/[^0-9]/g, '');
        }
      }

      // 만약 iframe_url 파라미터 방식일 경우 처리
      if (urlObj.searchParams.has('iframe_url') || urlObj.searchParams.has('iframe_url_utf8')) {
        const iframeUrl = urlObj.searchParams.get('iframe_url_utf8') || urlObj.searchParams.get('iframe_url');
        if (iframeUrl) {
          const decodedUrl = decodeURIComponent(iframeUrl);
          const clubidMatch = decodedUrl.match(/clubid=(\d+)/);
          const articleidMatch = decodedUrl.match(/articleid=(\d+)/);
          if (clubidMatch && articleidMatch) {
            clubid = clubidMatch[1];
            articleid = articleidMatch[1];
          }
        }
      }
    } catch (err) {
      // URL 파싱 실패는 무시하고, fallback 처리 진행
    }

    // 2. articleid가 여전히 없으면, 맨 끝 숫자만 추출
    if (!articleid) {
      const urlParts = normalizedUrl.split('/');
      articleid = urlParts[urlParts.length - 1].replace(/[^0-9]/g, '');
    }

    // 3. clubid(숫자) 찾기
    // 우선, clubid가 "숫자"가 아니라면(카페 영문 아이디라면), fetch로 HTML에서 추출
    let needHtmlFetch = !/^\d+$/.test(clubid);
    let html = '';

    if (needHtmlFetch || !clubid) {
      const pageResponse = await fetch(normalizedUrl);
      html = await pageResponse.text();

      // 다양한 방식으로 clubid 추출
      let cafeIdMatch =
        html.match(/g_sClubId\s*=\s*"(\d+)"/) ||    // 구버전
        html.match(/data-cafeid="(\d+)"/) ||        // 신버전
        html.match(/window\.__cafeId\s*=\s*['"]?(\d+)['"]?/); // 추가 fallback

      if (cafeIdMatch) {
        clubid = cafeIdMatch[1];
      } else {
        throw new Error('Failed to extract cafe ID');
      }
    }

    if (!articleid) throw new Error('Invalid article ID');
    if (!clubid) throw new Error('Invalid club ID');

    // 4. 댓글 추출 API 호출
    const comments: CommentData[] = [];
    let page = 1;

    while (true) {
      const commentApiUrl =
        `https://apis.naver.com/cafe-web/cafe-articleapi/cafes/${clubid}/articles/${articleid}/comments/pages/${page}?requestFrom=A&orderBy=asc`;

      const response = await fetch(commentApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': url,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();

      const pageComments = data.comments.items.map((comment: any) => {
        // 비공개/삭제 감지
        let contentsText = comment.content ?? '';
        const isDeleted = comment.deleted || contentsText.includes('삭제된 댓글입니다');
        const isPrivate = contentsText.includes('비밀 댓글입니다');
        if (isDeleted || isPrivate || !contentsText.trim()) {
          contentsText = '비밀댓글';
        } else {
          contentsText = contentsText
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line !== '')
            .map((line: string) => {
              if (line.includes('<img')) return '(이미지)';
              return line;
            })
            .join('\t') || '(이미지)';
        }
        return {
          id: comment.id,
          date: comment.updateDate,
          writer: {
            id: comment.writer.id,
            nick: comment.writer.nick,
          },
          contents: contentsText,
          parentCommentNo: comment.refId,
          isReply: comment.isRef,
        };
      });
      comments.push(...pageComments);
      if (!data.hasNext) break;
      page++;
    }
    return comments;
  } catch (error) {
    console.error('Error details:', error);
    return [];
  }
}

// 모든 컨텐츠가 렌더될 때까지 스크롤!
async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 500; // 한 번에 스크롤할 픽셀
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                // 끝까지 내렸으면 멈춤
                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
}

export async function crawlNaverSearch(keyword: string, resolution: { width: number; height: number } = { width: 1200, height: 7500 }, fullPage: boolean = false): Promise<ScrapeResult> {
  const { logFile, screenshotFile } = setupLogging(keyword);
  logToFile(logFile, `Starting crawl for keyword: ${keyword} at ${new Date().toISOString()}`);

  // 디버깅용 콘솔 로그 추가!
  // console.log('[DEBUG] process.cwd() =', process.cwd());
  // console.log('[DEBUG] logFile =', logFile);
  // console.log('[DEBUG] screenshotFile =', screenshotFile);
  
  const url = `https://search.naver.com/search.naver?where=nexearch&sm=tab_jum&query=${encodeURIComponent(keyword)}`;
  
  let browser: puppeteer.Browser | null = null;
  let mainPage: puppeteer.Page | null = null;
  
  try {
    // 브라우저 실행 설정 개선
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      timeout: 25000,
      // 브라우저 프로세스 관리 개선 (timeout 시간 감소)
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false
    });

    mainPage = await browser.newPage();
    await mainPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set viewport resolution
    await mainPage.setViewport({
      width: 1200,
      height: 7500,
      deviceScaleFactor: 1,
    });
    
    await mainPage.goto(url, { waitUntil: 'networkidle0', timeout: 25000 }).catch(error => {
      logToFile(logFile, `Failed to load page: ${error.message}`);
      throw error;
    });

    await mainPage.waitForSelector('div.fds-collection-root, section.sc_new.sp_nreview._fe_view_root._prs_ugB_bsR, div.fds-ugc-influencer', {
      timeout: 20000,
    }).catch(() => {
      logToFile(logFile, '일부 섹션이 로드되지 않음');
    });

    // ==== [여기서 자동 스크롤 다운] ====
    await autoScroll(mainPage);
    // 캡처
    try {
      await new Promise(res => setTimeout(res, 1000)); // 캡처 전 잠깐 대기

      if (fullPage) {
        await mainPage.screenshot({
          path: screenshotFile,
          fullPage: false
        });
      } else {
        await mainPage.screenshot({
          path: screenshotFile,
          clip: {
            x: 0,
            y: 0,
            width: resolution.width,
            height: resolution.height
          }
        });
      }
      logToFile(logFile, `Screenshot saved: ${screenshotFile}`);
    } catch (error) {
      logToFile(logFile, `Failed to capture screenshot: ${error.message}`);
    }

    // 1. 함께 많이 찾는 검색어 추출
    const relatedKeywords: RelatedKeyword[] = await mainPage.$$eval(
      'div.fds-keyword-item-root-also-search a span.sds-comps-text',
      els => els.map(el => ({ keyword: el.textContent?.trim() || '' })).filter(k => k.keyword)
    );

    const table: string[][] = [];
    for (let i = 0; i < relatedKeywords.length; i += 2) {
      table.push([relatedKeywords[i]?.keyword || '', relatedKeywords[i + 1]?.keyword || '']);
    }

    // 2. 인기 주제 추출
    const popularTopicsTable: string[][] = await mainPage.evaluate(() => {
      const topicRows: string[][] = [];
      document.querySelectorAll('div.fds-ugc-body-popular-topic-row').forEach(row => {
        const rowTopics: string[] = [];
        row.querySelectorAll('a span.fds-comps-keyword-chip-text').forEach(span => {
          const topic = span.textContent?.trim() || '';
          if (topic) rowTopics.push(topic);
        });
        if (rowTopics.length > 0) {
          topicRows.push(rowTopics);
        }
      });
      return topicRows;
    });

    const popularTopics: { topic: string }[] = popularTopicsTable.flat().map(topic => ({ topic }));

    
    // 3+4. 게시글/인플루언서 정보 추출
    const collectedAt = getCurrentKSTTimeStr();
    const { postsTable, influencerTable, mergedTable } = await mainPage.evaluate(
      (collectedAt) => {
        function parseDate(raw) {
          const now = new Date();
          const relativeMatch = raw.match(/(\d+)(시간|일|주|개월) 전/);
          if (relativeMatch) {
            const value = parseInt(relativeMatch[1], 10);
            if (raw.includes('시간')) now.setHours(now.getHours() - value);
            else if (raw.includes('일')) now.setDate(now.getDate() - value);
            else if (raw.includes('주')) now.setDate(now.getDate() - value * 7);
            else if (raw.includes('개월')) now.setMonth(now.getMonth() - value);
            return `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;
          }
          return raw;
        }
        function getMediaType(url) {
          if (!url) return '';
          return url.includes('cafe') ? '카페' : '블로그';
        }

        const postsTable = [];
        const influencerTable = [];
        const mergedTable = [];

        document.querySelectorAll('div.fds-collection-root, div.fds-ugc-influencer, section.sc_new.sp_nreview._fe_view_root._prs_ugB_bsR').forEach(sectionRoot => {

          // 일반 게시글 (fds-collection-root)
          if (sectionRoot.classList.contains('fds-collection-root')) {
            const section = sectionRoot.querySelector('span.fds-comps-header-headline')?.textContent?.trim() || '';
            sectionRoot.querySelectorAll('div.fds-article-simple-box').forEach(card => {
              let title = '';
              let url = '';
              let media = card.querySelector('a.fds-info-inner-text > span')?.textContent?.trim() || '';

              const titleEl = card.querySelector('a.fds-comps-right-image-text-title');
              if (titleEl) {
                const titleSpan = titleEl.querySelector('span');
                title = titleSpan?.textContent?.trim() || titleEl.textContent?.trim() || '';
                url = titleEl.getAttribute('href') || '';
              }

              if (!title && url.includes('cafe.naver.com')) {
                const cafeTitleEl = card.querySelector('a.fds-comps-right-image-content-desktop');
                title = cafeTitleEl?.textContent?.trim() || '';
                url = cafeTitleEl?.getAttribute('href') || url;
              }

              if (!title || !url) {
                const contentEl = card.querySelector('a.fds-comps-right-image-text-content');
                if (contentEl) {
                  if (!title) title = contentEl.textContent?.trim() || '';
                  if (!url) url = contentEl.getAttribute('href') || '';
                }
              }

              if (!url) {
                const svgEl = card.querySelector('svg._keep_trigger');
                url = svgEl?.getAttribute('data-url') || '';
              }

              const rawDate = card.querySelector('span.fds-info-sub-inner-text')?.textContent?.trim() || '';
              const date = parseDate(rawDate);
              if (!url || url === '#') return;

              if (media && title && media === title) {
                title = '비공개 게시글';
              }

              //media_type 추가
              const media_type = getMediaType(url);
              const postObj = { date, media, title, url, section, collected_at: collectedAt, media_type };

              postsTable.push(postObj);
              mergedTable.push({ ...postObj, type: 'post' });
            });
          }

          // 인플루언서 콘텐츠 (fds-ugc-influencer)
          else if (sectionRoot.classList.contains('fds-ugc-influencer')) {
            const sectionHeader = sectionRoot.querySelector('h2')?.textContent?.trim() || '';
            if (sectionHeader.includes('인플루언서 콘텐츠')) {
              sectionRoot.querySelectorAll('.fds-ugc-item-list > div').forEach(card => {
                let title = '';
                let url = '';

                let aTag = Array.from(card.querySelectorAll('a')).find(a =>
                  a.getAttribute('href')?.includes('/contents/internal/')
                );

                if (aTag) {
                  url = aTag.getAttribute('href') || '';
                  if (url && !url.startsWith('http')) url = '';
                  title = aTag.querySelector('span')?.textContent?.trim() || aTag.textContent?.trim() || '';
                }

                if (!title) {
                  const contentEl = card.querySelector('a.fds-comps-right-image-text-content');
                  if (contentEl) {
                    title = contentEl.textContent?.trim() || '';
                    url = url || contentEl.getAttribute('href') || '';
                    if (url && !url.startsWith('http')) url = '';
                  }
                }

                const media = card.querySelector('.fds-info-inner-text span')?.textContent?.trim() || '';
                if (!title) title = media;
                if (!url) {
                  const svgEl = card.querySelector('svg._keep_trigger');
                  url = svgEl?.getAttribute('data-url') || '';
                  if (url && !url.startsWith('http')) url = '';
                }

                const rawDate = card.querySelector('.sds-comps-profile-info-subtext')?.textContent?.trim() || '';
                const date = parseDate(rawDate);
                if ((!date && !media) || !url || url === '#') return;

                if (media && title && media === title) {
                  title = '비공개 게시글';
                }

                //media_type 추가
                const media_type = getMediaType(url);
                const influencerObj = { date, media, title, url, section: sectionHeader, collected_at: collectedAt, media_type };

                influencerTable.push(influencerObj);
                mergedTable.push({ ...influencerObj, type: 'influencer' });
              });
            }
          }

          // 인테리어·DIY 인기글 (sc_new)
          else if (sectionRoot.classList.contains('sc_new')) {
            const section = sectionRoot.querySelector('h2.title')?.textContent?.trim() || '인테리어·DIY 인기글';
            sectionRoot.querySelectorAll('li.bx').forEach(card => {
              let title = '';
              let url = '';

              const titleEl = card.querySelector('div.title_area a.title_link');
              if (titleEl) {
                title = titleEl.textContent?.trim() || '';
                url = titleEl.getAttribute('href') || '';
              }

              if (!title) {
                const contentEl = card.querySelector('a.dsc_link');
                if (contentEl) {
                  title = contentEl.textContent?.trim() || '';
                  url = url || contentEl.getAttribute('href') || '';
                }
              }

              if (!url) {
                const keepTrigger = card.querySelector('a.btn_save._keep_trigger');
                url = keepTrigger?.getAttribute('data-url') || '';
              }

              const media = card.querySelector('div.user_box_inner a.name')?.textContent?.trim() || '';
              const rawDate = card.querySelector('div.user_box span.date')?.textContent?.trim() || 
                              card.querySelector('div.user_box span:not(.spnew)')?.textContent?.trim() || '';
              const date = parseDate(rawDate);

              if (!url || url === '#') return;

              if (media && title && media === title) {
                title = '비공개 게시글';
              }

              // ⭐ media_type 추가
              const media_type = getMediaType(url);
              const postObj = { date, media, title, url, section, collected_at: collectedAt, media_type };

              postsTable.push(postObj);
              mergedTable.push({ ...postObj, type: 'post' });
            });
          }
        });

        return { postsTable, influencerTable, mergedTable };
      },
      collectedAt // 두 번째 인자로 수집시간 전달
    );

    // 게시글 상세 제목 보정 및 콘텐츠 추출
    for (const post of postsTable) {
    let detailPage: puppeteer.Page | null = null;

    try {
      if (post.title === '비공개 게시글') {
        logToFile(logFile, `[비공개 게시글] ${post.url}`);
        continue;
      }

      detailPage = await browser.newPage();
      await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      const response = await detailPage.goto(post.url, { 
        waitUntil: 'networkidle0', 
        timeout: 20000 
      }).catch(err => {
        logToFile(logFile, `페이지 로딩 중 에러 (계속 진행): ${post.url} - ${err.message}`);
        return null;
      });

      if (!response) {
        await safePageClose(detailPage, logFile);
        continue;
      }

      const finalUrl = response.url() || post.url;
      logToFile(logFile, `Processing URL: ${finalUrl}`);

      const html = await detailPage.content();
      const $ = cheerio.load(html);

      // ---------- 블로그 ----------
      if (finalUrl.includes('blog.naver.com')) {
        const frame = await detailPage.frames().find(f => f.name() === 'mainFrame');
        let blogComments: CommentData[] = [];
        try {
          if (frame) {
            // --- 구버전 블로그 (iframe) ---
            post.title = await frame.$eval('div.se-title-text', el => el.textContent?.trim() || '').catch(() => '');
            if (!post.title) {
              post.title = await frame.$eval('div.htitle', el => el.textContent?.trim() || '').catch(() => '');
            }
            try {
              const mainContainerText = await frame.$eval(
                'div.se-main-container',
                el => el.innerText.trim()
              ).catch(() => '');
              if (mainContainerText) {
                post.content = mainContainerText;
              } else {
                const oldContent = await frame.$eval(
                  '#post-view, #postViewArea',
                  el => el.innerText.trim()
                ).catch(() => '');
                post.content = oldContent;
              }
              post.content = cleanupContent(post.content);
              logToFile(logFile, `[블로그 콘텐츠 추출] ${finalUrl}`);
              logToFile(logFile, `제목: ${post.title}`);
              logToFile(logFile, `내용: ${post.content?.substring(0, 200)}...`);
              logToFile(logFile, '-'.repeat(80));
            } catch (contentErr) {
              logToFile(logFile, `블로그 콘텐츠 추출 실패: ${finalUrl} - ${contentErr.message}`);
            }

            // --- 블로그 댓글 추출 (iframe) ---
            try {
              blogComments = await extractNaverBlogComments(frame ?? detailPage, finalUrl);
              post.comments = blogComments;
              logToFile(logFile, `[블로그 댓글 ${blogComments.length}개 수집 완료] ${finalUrl}`);
            } catch (err) {
              logToFile(logFile, `블로그 댓글 수집 실패: ${finalUrl} - ${err.message}`);
              post.comments = [];
            }

          } else {
            // --- 신버전 블로그 (iframe 없음) ---
            post.title = await detailPage.$eval('div.se-title-text', el => el.textContent?.trim() || '').catch(() => '');
            if (!post.title) {
              post.title = await detailPage.$eval('div.htitle', el => el.textContent?.trim() || '').catch(() => '');
            }
            try {
              const mainContainerText = await detailPage.$eval(
                'div.se-main-container',
                el => el.innerText.trim()
              ).catch(() => '');
              if (mainContainerText) {
                post.content = mainContainerText;
              } else {
                const oldContent = await detailPage.$eval(
                  '#post-view, #postViewArea',
                  el => el.innerText.trim()
                ).catch(() => '');
                post.content = oldContent;
              }
              post.content = cleanupContent(post.content);
              logToFile(logFile, `[블로그 콘텐츠 추출: 신버전] ${finalUrl}`);
              logToFile(logFile, `제목: ${post.title}`);
              logToFile(logFile, `내용: ${post.content?.substring(0, 200)}...`);
              logToFile(logFile, '-'.repeat(80));
            } catch (contentErr) {
              logToFile(logFile, `블로그 콘텐츠 추출 실패(신버전): ${finalUrl} - ${contentErr.message}`);
            }

            // --- 블로그 댓글 추출 (신버전) ---
            try {
              blogComments = await extractNaverBlogComments(detailPage, finalUrl);
              post.comments = blogComments;
              logToFile(logFile, `[블로그 댓글 ${blogComments.length}개 수집 완료: 신버전] ${finalUrl}`);
            } catch (err) {
              logToFile(logFile, `블로그 댓글 수집 실패(신버전): ${finalUrl} - ${err.message}`);
              post.comments = [];
            }

          }
        } catch (err) {
          logToFile(logFile, `블로그 파트 전체 실패: ${finalUrl} - ${err.message}`);
          post.comments = [];
        }
        // 마지막 보정: 그래도 제목이 없으면 <meta>나 <title> 태그 활용
        if (!post.title) {
          post.title = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
        }
      }
      // ---------- 카페 ----------
      else if (finalUrl.includes('cafe.naver.com')) {
        let title = $('meta[property="og:title"]').attr('content') ||
                    $('div#app div.tit-box h2.tit').text().trim() ||
                    $('h3.title').text().trim();

        if (!title) {
          title = $('title').text().trim().replace(/ : 네이버 카페$/, '');
        }
        post.title = title || post.title;

        try {
          const specificSelector = '#app > div > div > div.ArticleContentBox > div.article_container > div:nth-child(1) > div > div:nth-child(2) > div.content.CafeViewer';
          const shortSelector = 'div.content.CafeViewer';
          let cafeContent = await detailPage.$eval(specificSelector, el => el.innerText.trim()).catch(() => '');
          if (!cafeContent) {
            cafeContent = await detailPage.$eval(shortSelector, el => el.innerText.trim()).catch(() => '');
          }
          if (!cafeContent) {
            const frames = await detailPage.frames();
            const cafeMainFrame = frames.find(f => 
              f.name() === 'cafe_main' || 
              f.url().includes('cafe.naver.com/ArticleRead.nhn') ||
              f.url().includes('cafe.naver.com/ca-fe/ArticleRead')
            );
            if (cafeMainFrame) {
              cafeContent = await cafeMainFrame.$eval(specificSelector, el => el.innerText.trim()).catch(() => '');
              if (!cafeContent) {
                cafeContent = await cafeMainFrame.$eval(shortSelector, el => el.innerText.trim()).catch(() => '');
              }
            }
          }
          post.content = cafeContent;
          post.content = cleanupContent(post.content);

          // ===== 조회수 추출 코드 =====
          let views = -1;
          let viewCount = '';
          try {
            let viewCount = await detailPage.$eval(
              'div.article_header span.count',
              el => el.textContent?.replace(/[^0-9]/g, '') || ''
            ).catch(() => '');
            if (!viewCount) {
              const frames = await detailPage.frames();
              const cafeMainFrame = frames.find(f => f.name() === 'cafe_main');
              if (cafeMainFrame) {
                viewCount = await cafeMainFrame.$eval(
                  'div.article_header span.count',
                  el => el.textContent?.replace(/[^0-9]/g, '') || ''
                ).catch(() => '');
              }
            }
            if (viewCount) {
              views = Math.max(0, parseInt(viewCount, 10) - 1);
            }
            post.viewCount = views;
            logToFile(logFile, `[카페 조회수] ${views}회 (${viewCount} → -1) - ${finalUrl}`);
          } catch (err) {
            logToFile(logFile, `카페 조회수 추출 실패: ${finalUrl} - ${err.message}`);
          }

          if (cafeContent) {
            logToFile(logFile, `[카페 콘텐츠 추출 성공] ${finalUrl}`);
            logToFile(logFile, `제목: ${post.title}`);
            logToFile(logFile, `내용: ${post.content?.substring(0, 200)}...`);
            logToFile(logFile, '-'.repeat(80));
          } else {
            logToFile(logFile, `카페 콘텐츠 추출 실패 (요청한 선택자를 찾지 못함): ${finalUrl}`);
            const pageStructure = await detailPage.evaluate(() => {
              const cafeViewerElement = document.querySelector('div.content.CafeViewer');
              return cafeViewerElement ? 'CafeViewer 요소 발견' : 'CafeViewer 요소 없음, 구조 다름';
            });
            logToFile(logFile, `페이지 구조 확인: ${pageStructure}`);
          }
        } catch (contentErr) {
          logToFile(logFile, `카페 콘텐츠 추출 실패: ${finalUrl} - ${contentErr.message}`);
        }

        // ======= [카페 댓글 수집] =======
        try {
          const comments = await extractComments(finalUrl);
          post.comments = comments;
          logToFile(logFile, `[카페 댓글 ${comments.length}개 수집 완료] ${finalUrl}`);
        } catch (err) {
          logToFile(logFile, `카페 댓글 수집 실패: ${finalUrl} - ${err.message}`);
          post.comments = [];
        }

        console.log(`Café title extracted from detail page: ${post.title} (URL: ${finalUrl})`);
      }

      // ---------- 기타 (일반 웹사이트) ----------
      else {
        post.title =
          $('meta[property="og:title"]').attr('content') ||
          $('title').text().trim() ||
          $('h1').text().trim() ||
          $('h2').text().trim() ||
          $('h3').text().trim() ||
          $('div.title').text().trim();

        try {
          const mainContent = $('article').text().trim() ||
                              $('main').text().trim() ||
                              $('div.content').text().trim();

          if (mainContent) {
            post.content = mainContent;
            post.content = cleanupContent(post.content);

            logToFile(logFile, `[일반 웹사이트 콘텐츠 추출] ${finalUrl}`);
            logToFile(logFile, `제목: ${post.title}`);
            logToFile(logFile, `내용: ${post.content?.substring(0, 200)}...`);
            logToFile(logFile, '-'.repeat(80));
          }
        } catch (contentErr) {
          logToFile(logFile, `일반 웹사이트 콘텐츠 추출 실패: ${finalUrl} - ${contentErr.message}`);
        }
      }

      // ===== [공통: 미디어=제목이면 비공개] =====
      if (post.media && post.title && post.media === post.title) {
        post.title = '비공개 게시글';
      }

      console.log(`Title extracted for ${post.url}: ${post.title}`);
      logToFile(logFile, `Title extracted: ${post.title}`);

    } catch (e) {
      logToFile(logFile, `Failed to fetch for ${post.url}: ${e.message}`);
      console.warn(`Failed to fetch title for ${post.url}: ${e.message}`);
      post.title = post.title || '';
    } finally {
      // 각 상세 페이지를 안전하게 닫기
      await safePageClose(detailPage, logFile);
    }
  }

    for (const item of mergedTable) {
      if (item.type === 'post') {
        const found = postsTable.find(p => p.url === item.url);
        if (found) {
          item.title = found.title;
          item.content = found.content;
          item.collected_at = found.collected_at; // 수집날짜 추가!
          item.comments = found.comments; // 댓글 추가
        }
      }
      if (item.media && item.title && item.media === item.title) {
        item.title = '비공개 게시글';
      }
      item.content = cleanupContent(item.content);
    }

    const resultData = {
      relatedKeywords,
      popularTopics,
      table,
      popularTopicsTable,
      postsTable,
      influencerTable,
      mergedTable,
    };
    
    const resultFile = path.join(path.dirname(logFile), `naver_result_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(resultFile, JSON.stringify(resultData, null, 2));
    logToFile(logFile, `결과 저장 완료: ${resultFile}`);
    
    
    console.log('연관 검색어:', relatedKeywords);
    console.log('인기 주제:', popularTopics);
    console.log('게시글 테이블:', postsTable);
    console.log('인플루언서 테이블:', influencerTable);
    console.log('웹 노출 순서 병합 테이블:', mergedTable);
    console.log(`로그 파일: ${logFile}`);
    console.log(`결과 파일: ${resultFile}`);
    console.log(`스크린샷 파일: ${screenshotFile}`);

    return resultData;
    
  } catch (error) {
    console.error(`Crawling failed: ${error.message}`);
    logToFile(logFile, `Critical error: ${error.message}`);
    throw error;
  } finally {
    // 모든 경우에 브라우저를 안전하게 종료
    await safeBrowserClose(browser, logFile);
    logToFile(logFile, `Crawling completed at ${new Date().toISOString()}`);
  }
}

export { crawlNaverSearch as scrapeNaverData };
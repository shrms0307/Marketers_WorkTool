import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

interface RelatedKeyword {
  keyword: string;
}

interface PostInfo {
  date: string;
  media: string;
  title: string;
  url: string;
  section: string;
  viewCount?: number;
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

/**
 * 브라우저와 모든 페이지를 안전하게 종료하는 함수
 * @param browser Puppeteer 브라우저 인스턴스
 */
async function safeBrowserClose(browser: puppeteer.Browser | null): Promise<void> {
  if (!browser) return;
  
  try {
    const pages = await browser.pages();
    for (const page of pages) {
      try {
        if (!page.isClosed()) {
          await page.close();
        }
      } catch (pageError) {
        console.error(`Error closing page: ${pageError.message}`);
      }
    }
    
    await browser.close();
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (browserError) {
    console.error(`Error during browser cleanup: ${browserError.message}`);
    
    try {
      const browserProcess = browser.process();
      if (browserProcess && !browserProcess.killed) {
        browserProcess.kill('SIGKILL');
      }
    } catch (killError) {
      console.error(`Error force killing browser: ${killError.message}`);
    }
  }
}

/**
 * 페이지를 안전하게 닫는 함수
 * @param page Puppeteer 페이지 인스턴스
 */
async function safePageClose(page: puppeteer.Page | null): Promise<void> {
  if (!page) return;
  
  try {
    if (!page.isClosed()) {
      await page.close();
    }
  } catch (error) {
    console.error(`Error closing page: ${error.message}`);
  }
}

// 모든 컨텐츠가 렌더될 때까지 스크롤
async function autoScroll(page: puppeteer.Page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

export async function crawlNaverSearch(
  keyword: string,
  resolution: { width: number; height: number } = { width: 1200, height: 7500 }
): Promise<ScrapeResult> {
  const url = `https://search.naver.com/search.naver?where=nexearch&sm=tab_jum&query=${encodeURIComponent(keyword)}`;
  
  let browser: puppeteer.Browser | null = null;
  let mainPage: puppeteer.Page | null = null;
  
  try {
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
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false
    });

    mainPage = await browser.newPage();
    await mainPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await mainPage.setViewport({
      width: 1200,
      height: 7500,
      deviceScaleFactor: 1,
    });
    
    await mainPage.goto(url, { waitUntil: 'networkidle0', timeout: 25000 }).catch(error => {
      throw error;
    });

    await mainPage.waitForSelector('div.fds-collection-root, section.sc_new.sp_nreview._fe_view_root._prs_ugB_bsR, div.fds-ugc-influencer', {
      timeout: 20000,
    }).catch(() => {});

    await autoScroll(mainPage);

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
        function parseDate(raw: string) {
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

        function getMediaType(url: string) {
          if (!url) return '';
          return url.includes('cafe') ? '카페' : '블로그';
        }

        const postsTable: PostInfo[] = [];
        const influencerTable: PostInfo[] = [];
        const mergedTable: (PostInfo & { type: 'post' | 'influencer' })[] = [];

        document.querySelectorAll('div.fds-collection-root, div.fds-ugc-influencer, section.sc_new.sp_nreview._fe_view_root._prs_ugB_bsR').forEach(sectionRoot => {
          // 일반 게시글
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

              const media_type = getMediaType(url);
              const postObj: PostInfo = { date, media, title, url, section, collected_at: collectedAt, media_type };

              postsTable.push(postObj);
              mergedTable.push({ ...postObj, type: 'post' });
            });
          }

          // 인플루언서 콘텐츠
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

                const media_type = getMediaType(url);
                const influencerObj: PostInfo = { date, media, title, url, section: sectionHeader, collected_at: collectedAt, media_type };

                influencerTable.push(influencerObj);
                mergedTable.push({ ...influencerObj, type: 'influencer' });
              });
            }
          }

          // 인테리어·DIY 인기글
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

              const media_type = getMediaType(url);
              const postObj: PostInfo = { date, media, title, url, section, collected_at: collectedAt, media_type };

              postsTable.push(postObj);
              mergedTable.push({ ...postObj, type: 'post' });
            });
          }
        });

        return { postsTable, influencerTable, mergedTable };
      },
      collectedAt
    );

    // 게시글 상세 제목 보정
    for (const post of postsTable) {
      let detailPage: puppeteer.Page | null = null;

      try {
        if (post.title === '비공개 게시글') {
          continue;
        }

        detailPage = await browser.newPage();
        await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        const response = await detailPage.goto(post.url, { 
          waitUntil: 'networkidle0', 
          timeout: 20000 
        }).catch(err => {
          console.warn(`페이지 로딩 중 에러 (계속 진행): ${post.url} - ${err.message}`);
          return null;
        });

        if (!response) {
          await safePageClose(detailPage);
          continue;
        }

        const finalUrl = response.url() || post.url;
        const html = await detailPage.content();
        const $ = cheerio.load(html);

        // 블로그 제목 보정
        if (finalUrl.includes('blog.naver.com')) {
          const frame = await detailPage.frames().find(f => f.name() === 'mainFrame');
          if (frame) {
            post.title = await frame.$eval('div.se-title-text', el => el.textContent?.trim() || '').catch(() => '');
            if (!post.title) {
              post.title = await frame.$eval('div.htitle', el => el.textContent?.trim() || '').catch(() => '');
            }
          } else {
            post.title = await detailPage.$eval('div.se-title-text', el => el.textContent?.trim() || '').catch(() => '');
            if (!post.title) {
              post.title = await detailPage.$eval('div.htitle', el => el.textContent?.trim() || '').catch(() => '');
            }
          }
          if (!post.title) {
            post.title = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
          }
        }
        // 카페 제목 보정
        else if (finalUrl.includes('cafe.naver.com')) {
          let title = $('meta[property="og:title"]').attr('content') ||
                      $('div#app div.tit-box h2.tit').text().trim() ||
                      $('h3.title').text().trim();
          if (!title) {
            title = $('title').text().trim().replace(/ : 네이버 카페$/, '');
          }
          post.title = title || post.title;
        }
        // 기타 웹사이트
        else {
          post.title =
            $('meta[property="og:title"]').attr('content') ||
            $('title').text().trim() ||
            $('h1').text().trim() ||
            $('h2').text().trim() ||
            $('h3').text().trim() ||
            $('div.title').text().trim();
        }

        if (post.media && post.title && post.media === post.title) {
          post.title = '비공개 게시글';
        }
      } catch (e) {
        console.warn(`Failed to fetch title for ${post.url}: ${e.message}`);
        post.title = post.title || '';
      } finally {
        await safePageClose(detailPage);
      }
    }

    for (const item of mergedTable) {
      if (item.type === 'post') {
        const found = postsTable.find(p => p.url === item.url);
        if (found) {
          item.title = found.title;
          item.collected_at = found.collected_at;
        }
      }
      if (item.media && item.title && item.media === item.title) {
        item.title = '비공개 게시글';
      }
    }

    const resultData: ScrapeResult = {
      relatedKeywords,
      popularTopics,
      table,
      popularTopicsTable,
      postsTable,
      influencerTable,
      mergedTable,
    };
    
    console.log('연관 검색어:', relatedKeywords);
    console.log('인기 주제:', popularTopics);
    console.log('게시글 테이블:', postsTable);
    console.log('인플루언서 테이블:', influencerTable);
    console.log('웹 노출 순서 병합 테이블:', mergedTable);

    return resultData;
  } catch (error) {
    console.error(`Crawling failed: ${error.message}`);
    throw error;
  } finally {
    await safeBrowserClose(browser);
  }
}

export { crawlNaverSearch as scrapeNaverData };
'use server'

interface CommentData {
  id: number;
  date: string;
  writer: {
    id: string;
    nick: string;
  };
  contents: string;
  scraps: number;
  parentCommentNo: number;
  isReply: boolean;
}

export async function extractComments(url: string): Promise<CommentData[]> {
  try {
    // 1. URL 정규화
    let normalizedUrl = url;
    
    // iframe_url 형식 처리
    if (url.includes('iframe_url')) {
      const params = new URLSearchParams(url.split('?')[1]);
      const iframeUrl = params.get('iframe_url_utf8') || params.get('iframe_url');
      if (iframeUrl) {
        // URL 디코딩
        const decodedUrl = decodeURIComponent(iframeUrl);
        // clubid와 articleid 추출
        const clubidMatch = decodedUrl.match(/clubid=(\d+)/);
        const articleidMatch = decodedUrl.match(/articleid=(\d+)/);
        
        if (clubidMatch && articleidMatch) {
          const clubid = clubidMatch[1];
          const articleid = articleidMatch[1];
          // 정규화된 URL 형식으로 변환
          normalizedUrl = `https://cafe.naver.com/${url.split('?')[0].split('/')[3]}/${articleid}`;
        }
      }
    }

    // 2. 게시글 ID 추출
    const urlParts = normalizedUrl.split('/');
    const pageidx = urlParts[urlParts.length - 1];
    
    if (!pageidx || isNaN(Number(pageidx))) {
      throw new Error('Invalid article ID');
    }

    // 3. 게시글 페이지에서 카페 ID 추출
    const pageResponse = await fetch(normalizedUrl);
    const html = await pageResponse.text();
    const cafeIdMatch = html.match(/g_sClubId = "(\d+)"/);
    
    if (!cafeIdMatch) {
      throw new Error('Failed to extract cafe ID');
    }
    
    const cafeid = cafeIdMatch[1];
    const comments: CommentData[] = [];
    let page = 1;
    
    while (true) {
      // 3. 실제 댓글 API 호출 (PHP 코드와 동일한 엔드포인트 사용)
      const commentApiUrl = `https://apis.naver.com/cafe-web/cafe-articleapi/cafes/${cafeid}/articles/${pageidx}/comments/pages/${page}?requestFrom=A&orderBy=asc`;
      
      const response = await fetch(commentApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': url
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      console.log('API Response:', data);

      const pageComments = data.comments.items.map((comment: any) => ({
        id: comment.id,
        date: comment.updateDate,
        writer: {
          id: comment.writer.id,
          nick: comment.writer.nick
        },
        contents: comment.content
          ? comment.content
              .split('\n')
              .map((line: string) => line.trim())
              .filter((line: string) => line !== '')
              .map((line: string) => {
                if (line.includes('<img')) {
                  return '(이미지)';
                }
                return line;
              })
              .join('\t') || '(이미지)'
          : '(이미지)',
        scraps: comment.sympathyCount || 0,
        parentCommentNo: comment.refId,
        isReply: comment.isRef
      }));

      console.log('Processed comments:', pageComments);

      comments.push(...pageComments);

      // 5. 다음 페이지 확
      if (!data.hasNext) {
        break;
      }
      
      page++;
    }

    return comments;

  } catch (error) {
    console.error('Error details:', error);
    throw error;
  }
} 
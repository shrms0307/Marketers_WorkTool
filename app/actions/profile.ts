'use server'

import { ProfileData } from '@/types/profile'

export async function getProfileData(address: string): Promise<ProfileData> {
  try {
    // address에 /myFan 추가하여 URL 구성
    const targetUrl = address.endsWith('/myFan') ? address : `${address}/myFan`;
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = await response.text();
    
    // initialState 스크립트 찾기
    const scriptRegex = /<script id="initialState">[^]*?window\.__PRELOADED_STATE__\s*=\s*({[^]*?});/;
    const match = html.match(scriptRegex);
    
    if (!match) {
      console.log('데이터를 찾을 수 없음');
      return {
        subscriberCount: 0,
        expertType: '',
        styleType: ''
      };
    }

    const data = JSON.parse(match[1]);
    const spaceData = data.space.data;

    return {
      subscriberCount: spaceData.stats.subscriberCount || 0,
      expertType: spaceData.myKeyword.keyword || '',
      styleType: spaceData.categoryMyType || ''
    };

  } catch (error) {
    console.error('프로필 데이터 fetch 실패 상세:', error);
    return {
      subscriberCount: 0,
      expertType: '',
      styleType: ''
    };
  }
} 
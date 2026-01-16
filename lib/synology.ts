import axios from 'axios';
import https from 'https';

if (!process.env.SYNOLOGY_URL || !process.env.SYNOLOGY_PORT) {
  throw new Error('SYNOLOGY_URL 또는 SYNOLOGY_PORT 환경 변수가 설정되지 않았습니다.');
}

const baseURL = `${process.env.SYNOLOGY_URL}:${process.env.SYNOLOGY_PORT}`;

// 시놀로지 인증 함수
async function getSynologySession() {
  try {
    const response = await axios.get(`${baseURL}/webapi/auth.cgi`, {
      params: {
        api: 'SYNO.API.Auth',
        version: '3',
        method: 'login',
        account: process.env.SYNOLOGY_USER,
        passwd: process.env.SYNOLOGY_PASSWORD,
        session: 'FileStation',
        format: 'sid'
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    if (!response.data.success) {
      throw new Error('시놀로지 인증 실패');
    }

    return response.data.data.sid;
  } catch (error) {
    console.error('시놀로지 세션 생성 실패:', error);
    throw error;
  }
}

// 시놀로지 서버 기본 설정
const synologyAxios = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  paramsSerializer: (params) => {
    return Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(typeof value === 'string' ? value : JSON.stringify(value))}`)
      .join('&');
  }
});

// 요청 인터셉터 추가
synologyAxios.interceptors.request.use(async (config) => {
  // 세션 ID 가져오기
  const sid = await getSynologySession();
  
  // POST 요청을 GET 요청으로 변환하고 데이터를 params로 이동
  if (config.method?.toLowerCase() === 'post') {
    config.method = 'get';
    config.params = { 
      ...config.params, 
      ...config.data,
      _sid: sid  // 세션 ID 추가
    };
    delete config.data;
  } else {
    config.params = {
      ...config.params,
      _sid: sid  // 세션 ID 추가
    };
  }
  return config;
});

// 파일 다운로드 함수 추가
async function downloadFile(path: string): Promise<Buffer> {
  const sid = await getSynologySession();
  
  const response = await axios.get(`${baseURL}/webapi/entry.cgi`, {
    params: {
      api: 'SYNO.FileStation.Download',
      version: '2',
      method: 'download',
      path,
      _sid: sid,
      mode: 'download'  // 다운로드 모드 추가
    },
    responseType: 'arraybuffer',
    headers: {
      'Accept': '*/*',  // 모든 타입 허용
    },
    maxRedirects: 0,  // 리다이렉트 비활성화
    validateStatus: (status) => {
      return status >= 200 && status < 400;  // 302도 성공으로 처리
    },
    httpsAgent: new https.Agent({ 
      rejectUnauthorized: false,
      keepAlive: true
    })
  }).catch(error => {
    if (error.response?.status === 302) {
      // 리다이렉트 URL로 직접 요청
      const redirectUrl = error.response.headers.location;
      if (!redirectUrl) throw new Error('리다이렉트 URL이 없습니다');

      return axios.get(`${baseURL}${redirectUrl}`, {
        responseType: 'arraybuffer',
        headers: {
          'Cookie': `id=${sid}`  // 세션 쿠키 추가
        },
        httpsAgent: new https.Agent({ 
          rejectUnauthorized: false,
          keepAlive: true
        })
      });
    }
    throw error;
  });

  return Buffer.from(response.data);
}

// synologyClient 객체 생성
const synologyClient = {
  ...synologyAxios,
  downloadFile
};

export { synologyAxios };
export default synologyClient; 
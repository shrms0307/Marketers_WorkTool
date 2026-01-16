import { NextRequest, NextResponse } from 'next/server';
import synologyClient, { synologyAxios } from '@/lib/synology';
import axios from 'axios';

// 보안을 위한 경로 검증 함수
function isValidPath(path: string): boolean {
    // 기본 경로 검증
    const isBasicValid = path.startsWith('/TVNAS132/smart_service/Project_Report/') &&
        !path.includes('..') &&
        !path.includes('~');

    // 파일명 패턴 검증 (YYYYMMDD(숫자,숫자).jpg 형식 또는 비슷한 패턴)
    const fileName = path.split('/').pop() || '';
    const filePattern = /^\d{8}\(\d+,.*\)\.jpg$/;  // 더 유연한 패턴으로 수정

    console.log('파일명 검증:', {
        fileName,
        isBasicValid,
        matchesPattern: filePattern.test(fileName)
    });

    return isBasicValid && filePattern.test(fileName);
}

export async function GET(request: NextRequest) {
    try {
        // URL에서 path 쿼리 파라미터 추출 및 디코딩
        const { searchParams } = new URL(request.url);
        const encodedPath = searchParams.get('path');
        
        if (!encodedPath) {
            return new NextResponse('파일 경로가 필요합니다.', { status: 400 });
        }

        const path = decodeURIComponent(encodedPath);
        console.log('요청된 파일 경로:', path);
        
        // 경로 검증
        if (!isValidPath(path)) {
            console.log('경로 검증 실패:', path);
            return new NextResponse('잘못된 파일 경로입니다.', { status: 403 });
        }

        try {
            console.log('시놀로지 다운로드 시작...');
            
            // 시놀로지 API 호출 전에 파일 존재 여부 확인
            const listResponse = await synologyAxios.post('/webapi/entry.cgi', {
                api: 'SYNO.FileStation.List',
                version: '2',
                method: 'list',
                folder_path: path.substring(0, path.lastIndexOf('/')),
                pattern: path.split('/').pop(),
                additional: '["size","time"]'
            });
            
            console.log('파일 정보 조회 결과:', listResponse.data);
            
            if (!listResponse.data.success || !listResponse.data.data?.files?.length) {
                console.log('파일을 찾을 수 없음');
                return new NextResponse('파일을 찾을 수 없습니다.', { status: 404 });
            }

            // 파일 다운로드
            const fileBuffer = await synologyClient.downloadFile(path);
            console.log('시놀로지 다운로드 완료');
            
            if (!fileBuffer) {
                console.log('파일 버퍼가 비어있음');
                throw new Error('파일을 읽을 수 없습니다.');
            }
            
            // Response 헤더 수정
            const headers = new Headers();
            headers.set('Content-Type', 'image/jpeg');
            headers.set('Content-Length', fileBuffer.length.toString());
            headers.set('Cache-Control', 'public, max-age=31536000');  // 1년간 캐시
            
            // 스트림으로 반환
            return new NextResponse(fileBuffer, {
                status: 200,
                headers,
            });

        } catch (error) {
            // Axios 에러인 경우 상세 정보 로깅
            if (axios.isAxiosError(error)) {
                console.error('시놀로지 API 에러:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    headers: error.response?.headers,
                    config: {
                        url: error.config?.url,
                        method: error.config?.method,
                        params: error.config?.params,
                        headers: error.config?.headers
                    }
                });
            } else {
                console.error('일반 에러:', error);
            }
            
            return new NextResponse(
                '이미지 파일을 찾을 수 없습니다.', 
                { status: 404 }
            );
        }
    } catch (error) {
        console.error('이미지 처리 중 오류:', error);
        return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
    }
} 
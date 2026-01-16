import { NextResponse } from 'next/server';
import synologyClient from '@/lib/synology';

export async function POST(request: Request) {
  try {
    const { path, method = 'list', pattern, additional } = await request.json();

    // API 요청 파라미터 구성
    const params = {
      api: 'SYNO.FileStation.List',
      version: '2',
      method,
      folder_path: path,
      ...(pattern && { pattern }),
      ...(additional && { additional })
    };

    // 시놀로지 API 호출
    const response = await synologyClient.request('/webapi/entry.cgi', JSON.stringify(params));

    return NextResponse.json(response);
  } catch (error) {
    console.error('시놀로지 API 요청 실패:', error);
    return NextResponse.json(
      { error: '시놀로지 API 요청에 실패했습니다' },
      { status: 500 }
    );
  }
} 
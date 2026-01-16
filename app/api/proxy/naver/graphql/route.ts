import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 네이버 GraphQL API 호출
    const response = await fetch('https://in.naver.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://in.naver.com',
        'Referer': 'https://in.naver.com',
        'inf-fe-version': '2024.11.28',
        'x-api-level': '11',
        'Cookie': req.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Naver API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
} 
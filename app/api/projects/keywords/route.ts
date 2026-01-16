import { NextResponse } from 'next/server'
import { withConnection } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { projectId, keyword } = await request.json()

    const result = await withConnection(async (connection) => {
      // 키워드 추가
      const [result] = await connection.execute(`
        INSERT INTO project_keywords 
        (project_id, keyword, search_ranks, created_at, updated_at)
        VALUES (?, ?, '', NOW(), NOW())
      `, [projectId, keyword])

      // 새로 추가된 키워드 정보 조회
      const [rows] = await connection.execute(`
        SELECT id, project_id, keyword, search_ranks, created_at, updated_at
        FROM project_keywords
        WHERE id = LAST_INSERT_ID()
      `)

      return (rows as any[])[0]
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('키워드 추가 중 오류 발생:', error)
    return NextResponse.json(
      { error: '키워드를 추가하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 
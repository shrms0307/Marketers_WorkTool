import { NextResponse } from 'next/server'
import { withConnection } from '@/lib/db'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { keyword } = await request.json()
    const keywordId = params.id

    const result = await withConnection(async (connection) => {
      // 키워드 수정
      await connection.execute(`
        UPDATE project_keywords 
        SET keyword = ?, updated_at = NOW()
        WHERE id = ?
      `, [keyword, keywordId])

      // 수정된 키워드 정보 조회
      const [rows] = await connection.execute(`
        SELECT id, project_id, keyword, search_ranks, created_at, updated_at
        FROM project_keywords
        WHERE id = ?
      `, [keywordId])

      return (rows as any[])[0]
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('키워드 수정 중 오류 발생:', error)
    return NextResponse.json(
      { error: '키워드를 수정하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const keywordId = params.id

    await withConnection(async (connection) => {
      await connection.execute(`
        DELETE FROM project_keywords 
        WHERE id = ?
      `, [keywordId])
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('키워드 삭제 중 오류 발생:', error)
    return NextResponse.json(
      { error: '키워드를 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 
'use server'

import { withConnection } from "@/lib/db"

interface CompleteProjectPost {
  blogId: string
  postUrl: string
  likeCount: number | null
  commentCount: number | null
  postDate: string | null
}

// URL 검증 함수를 async로 변경
export async function validateBlogUrl(url: string, bloggerId: string) {
  try {
    // 기본 URL 형식 검증
    const urlPattern = /^https:\/\/blog\.naver\.com\/([^\/]+)\/(\d+)$/
    const match = url.match(urlPattern)
    if (!match) {
      return {
        isValid: false,
        error: `올바르지 않은 URL 형식입니다: ${url}`
      }
    }

    // 블로거 ID 검증
    const [, urlBloggerId] = match
    if (urlBloggerId !== bloggerId) {
      return {
        isValid: false,
        error: `블로그 게시글의 URL이 일치하지 않습니다: ${bloggerId} ≠ ${urlBloggerId}`
      }
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: 'URL 검증 중 오류가 발생했습니다.'
    }
  }
}

// 프로젝트 완료 처리 함수
export async function completeProject(
  projectId: number,
  posts: CompleteProjectPost[]
) {
  return withConnection(async (connection) => {
    try {
      await connection.beginTransaction()

      try {
        // 1. 포스트 데이터 업데이트 (병렬 처리)
        await Promise.all(posts.map(post => 
          connection.execute(`
            UPDATE project_posts 
            SET 
              like_count = ?,
              comment_count = ?,
              post_date = ?,
              updated_at = NOW()
            WHERE project_id = ? AND blogger_id = ?
          `, [
            post.likeCount,
            post.commentCount,
            post.postDate,
            projectId,
            post.blogId
          ])
        ))

        // 2. 프로젝트 상태 업데이트
        await connection.execute(`
          UPDATE projects 
          SET 
            status = 'completed',
            updated_at = NOW()
          WHERE id = ?
        `, [projectId])

        await connection.commit()
        return { success: true }

      } catch (error) {
        await connection.rollback()
        throw error
      }
    } catch (error) {
      console.error('프로젝트 완료 처리 실패:', error)
      throw new Error('프로젝트 완료 처리에 실패했습니다.')
    }
  })
} 
'use server'

import { withConnection } from "@/lib/db"
import { format } from 'date-fns'

export async function updateProjectPost(
  projectId: string,
  bloggerId: string,
  postUrl: string
) {
  return withConnection(async (connection) => {
    try {
      // 기존 포스트 확인
      const [existing] = await connection.execute(
        `SELECT id FROM project_posts 
         WHERE project_id = ? AND blogger_id = ?`,
        [projectId, bloggerId]
      )

      if ((existing as any[]).length > 0) {
        // 기존 포스트가 있으면 업데이트
        await connection.execute(
          `UPDATE project_posts 
           SET post_url = ?, 
               updated_at = NOW()
           WHERE project_id = ? 
           AND blogger_id = ?`,
          [postUrl, projectId, bloggerId]
        )
      } else {
        // 새 포스트 추가
        await connection.execute(
          `INSERT INTO project_posts 
           (project_id, blogger_id, post_url, status, created_at) 
           VALUES (?, ?, ?, 'published', NOW())`,
          [projectId, bloggerId, postUrl]
        )
      }

      return { success: true }
    } catch (error) {
      console.error('포스트 URL 업데이트 실패:', error)
      throw error
    }
  })
}

export async function deleteProjectPost(
  projectId: string,
  bloggerId: string
) {
  return withConnection(async (connection) => {
    try {
      await connection.execute(
        `DELETE FROM project_posts 
         WHERE project_id = ? 
         AND blogger_id = ?`,
        [projectId, bloggerId]
      )
      return { success: true }
    } catch (error) {
      console.error('포스트 URL 삭제 실패:', error)
      throw error
    }
  })
}

export async function updatePostStatus(
  projectId: string,
  bloggerId: string,
  status: 'draft' | 'published' | 'rejected' | 'confirmed'
) {
  return withConnection(async (connection) => {
    try {
      await connection.execute(
        `UPDATE project_posts 
         SET status = ?,
             updated_at = NOW()
         WHERE project_id = ? 
         AND blogger_id = ?`,
        [status, projectId, bloggerId]
      )
      return { success: true }
    } catch (error) {
      console.error('포스트 상태 업데이트 실패:', error)
      throw error
    }
  })
}

export async function updateProjectBloggerStatus(
  updates: Array<{ 
    blogId: string; 
    status: string;
  }>, 
  projectId: string
) {
  return withConnection(async (connection) => {
    try {
      await connection.beginTransaction()

      // 각 블로거의 상태 업데이트
      const results = await Promise.all(
        updates.map(({ blogId, status }) => 
          connection.execute(
            `UPDATE project_bloggers 
             SET status = ?
             WHERE blogger_id = ? 
             AND project_id = ?`,
            [status, blogId, projectId]
          )
        )
      )

      // 업데이트된 행이 있는지 확인
      const updatedRows = results.reduce((sum, [result]: any) => 
        sum + result.affectedRows, 0
      )

      if (updatedRows === 0) {
        throw new Error('업데이트할 블로거를 찾을 수 없습니다')
      }

      await connection.commit()
      return { success: true, updatedRows }
    } catch (error) {
      await connection.rollback()
      throw error
    }
  })
}

export async function updateProject(
  id: number, 
  data: {
    name: string
    startDate: Date
    endDate: Date
    targetPosts: number
  }
) {
  return withConnection(async (connection) => {
    await connection.execute(`
      UPDATE projects 
      SET name = ?, 
          start_date = ?, 
          end_date = ?,
          target_posts = ?
      WHERE id = ?
    `, [
      data.name,
      format(data.startDate, 'yyyy-MM-dd'),
      format(data.endDate, 'yyyy-MM-dd'),
      data.targetPosts,
      id
    ])

    return { success: true }
  })
}

// 프로젝트 블로거 목록 조회 액션 추가
export async function getProjectBloggers(projectId: string) {
  return withConnection(async (connection) => {
    // 모든 블로거 조회 (rejected 포함)
    const [rows] = await connection.execute(`
      SELECT 
        b.*,
        pb.status,
        pp.post_url,
        pp.status as post_status,
        pp.created_at as post_created_at
      FROM project_bloggers pb
      JOIN blogger_data b ON pb.blogger_id = b.inf_blogid
      LEFT JOIN project_posts pp ON pb.project_id = pp.project_id 
        AND pb.blogger_id = pp.blogger_id
      WHERE pb.project_id = ?
      ORDER BY 
        CASE 
          WHEN pb.status = 'rejected' THEN 1 
          ELSE 0 
        END,
        b.inf_nickname
    `, [projectId])

    // 데이터 구조 변환
    return {
      bloggers: (rows as any[]).map(row => ({
        ...row,
        post: row.post_url ? {
          url: row.post_url,
          status: row.post_status,
          created_at: row.post_created_at
        } : undefined
      })),
      rejectedBloggers: (rows as any[])
        .filter(row => row.status === 'rejected')
        .map(row => ({
          inf_blogid: row.inf_blogid,
          inf_nickname: row.inf_nickname
        }))
    }
  })
}

export async function updateManagerCheck(
  projectId: string,
  bloggerId: string,
  status: 'confirmed' | 'published'
) {
  return withConnection(async (connection) => {
    try {
      console.log('Updating manager check:', { projectId, bloggerId, status })
      
      await connection.execute(`
        UPDATE project_posts 
        SET status = ?,
            updated_at = NOW()
        WHERE project_id = ? 
        AND blogger_id = ?
      `, [status, projectId, bloggerId])

      return { success: true }
    } catch (error) {
      console.error('Manager check update error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  })
}

// 프로젝트 완료 처리 액션
export async function completeProject(
  projectId: number,
  posts: Array<{
    blogId: string
    postUrl: string
    likeCount: number
    commentCount: number
    postDate: string
  }>
) {
  return withConnection(async (connection) => {
    try {
      // 트랜잭션 시작
      await connection.beginTransaction()

      try {
        // 1. 포스트 데이터 업데이트
        for (const post of posts) {
          await connection.execute(`
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
        }

        // 2. 프로젝트 상태 업데이트
        await connection.execute(`
          UPDATE projects 
          SET 
            status = 'completed',
            updated_at = NOW()
          WHERE id = ?
        `, [projectId])

        // 트랜잭션 커밋
        await connection.commit()

        return { success: true }
      } catch (error) {
        // 오류 발생 시 롤백
        await connection.rollback()
        throw error
      }
    } catch (error) {
      console.error('프로젝트 완료 처리 실패:', error)
      throw new Error('프로젝트 완료 처리에 실패했습니다.')
    }
  })
} 
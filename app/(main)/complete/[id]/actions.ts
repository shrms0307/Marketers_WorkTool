'use server'

import { withConnection } from '@/lib/db'
import { ProjectWithStats, ProjectKeyword } from "@/types/project"
import { format, parse } from 'date-fns'

export async function getProjectDetail(id: number): Promise<ProjectWithStats> {
  console.log('Project Detail Access:', { projectId: id })

  return withConnection(async (connection) => {
    // 프로젝트 기본 정보와 통계 조회
    const [rows] = await connection.execute(`
      SELECT 
        p.*,
        p.created_by_name as createdByName,
        p.target_posts as targetPosts,
        DATEDIFF(p.end_date, CURDATE()) as remaining_days,
        (
          SELECT COUNT(DISTINCT blogger_id) 
          FROM project_bloggers 
          WHERE project_id = p.id
        ) as blogger_count,
        (
          SELECT GROUP_CONCAT(blogger_id)
          FROM project_bloggers
          WHERE project_id = p.id
        ) as blogger_ids,
        (
          SELECT COUNT(*) 
          FROM project_posts 
          WHERE project_id = p.id
        ) as completed_posts
      FROM projects p
      WHERE p.id = ?
    `, [id])

    if (!(rows as any[]).length) {
      throw new Error('프로젝트를 찾을 수 없습니다')
    }

    const project = (rows as any[])[0]

    // 프로젝트 키워드 조회
    const [keywordRows] = await connection.execute(`
      SELECT id, project_id, keyword, search_ranks, created_at, updated_at
      FROM project_keywords
      WHERE project_id = ?
    `, [id])

    // 참여 블로거 정보 조회
    const [bloggers] = await connection.execute(`
      SELECT 
        b.*,
        pb.status,
        pp.post_url,
        pp.status as post_status,
        pp.created_at as post_created_at,
        b.visitor_yesterday,
        b.visitor_avg,
        b.follower_count,
        (
          SELECT update_datetime 
          FROM blogger_data 
          WHERE inf_blogid = b.inf_blogid 
          LIMIT 1
        ) as update_datetime
      FROM project_bloggers pb
      JOIN blogger_data b ON pb.blogger_id = b.inf_blogid
      LEFT JOIN project_posts pp ON pp.project_id = pb.project_id 
        AND pp.blogger_id = pb.blogger_id
      WHERE pb.project_id = ?
      ORDER BY 
        CASE 
          WHEN pb.status = 'rejected' THEN 1 
          ELSE 0 
        END,  -- 제거된 유저를 아래로
        CASE 
          WHEN pb.status = 'rejected' THEN pb.updated_at 
          ELSE pb.created_at 
        END DESC  -- 제거된 유저는 최근 제거 순, 나머지는 참여 순
    `, [id])

    // 블로거 데이터 가공
    const processedBloggers = (bloggers as any[]).map(blogger => {
      let visitorStats = {};
      try {
        visitorStats = JSON.parse(blogger.visitor_yesterday || '{}');
      } catch (error) {
        console.error('방문자 통계 파싱 실패:', error);
      }

      // 최근 7일간의 데이터만 사용
      const trends = Object.entries(visitorStats)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .slice(-7)
        .map(([date, count]) => ({
          date,
          visitors: Number(count) || 0,
          followers: Number(blogger.follower_count) || 0,
          average: Number(blogger.visitor_avg) || 0
        }));

      return {
        ...blogger,
        trends
      };
    });

    return {
      ...project,
      startDate: new Date(project.start_date).toISOString(),
      endDate: new Date(project.end_date).toISOString(),
      createdAt: new Date(project.created_at).toISOString(),
      updatedAt: new Date(project.updated_at).toISOString(),
      createdBy: project.created_by,
      createdByName: project.created_by_name,
      targetPosts: project.target_posts,
      bloggerCount: project.blogger_count || 0,
      bloggerIds: project.blogger_ids ? project.blogger_ids.split(',') : [],
      completedPosts: project.completed_posts || 0,
      progress: Math.round((project.completed_posts || 0) / project.target_posts * 100),
      keywords: keywordRows as ProjectKeyword[],
      bloggers: processedBloggers
    }
  })
}

export async function updateProject(
  id: number,
  userId: string,
  data: {
    name: string
    startDate: Date
    endDate: Date
    targetPosts: number
  }
) {
  return withConnection(async (connection) => {
    try {
      console.log('Update project request:', { id, userId, data })

      // 권한 체크
      const [rows] = await connection.execute(
        'SELECT created_by FROM projects WHERE id = ?',
        [id]
      )
      
      const project = (rows as any[])[0]
      console.log('Project auth check:', { 
        project, 
        userId, 
        hasPermission: project?.created_by === userId 
      })

      if (!project || project.created_by !== userId) {
        throw new Error('프로젝트를 수정할 권한이 없습니다.')
      }

      // 프로젝트 업데이트
      const params = [
        data.name,
        format(data.startDate, 'yyyy-MM-dd'),
        format(data.endDate, 'yyyy-MM-dd'),
        data.targetPosts,
        id
      ]
      console.log('Update query params:', params)

      await connection.execute(`
        UPDATE projects 
        SET name = ?, 
            start_date = ?, 
            end_date = ?,
            target_posts = ?,
            updated_at = NOW()
        WHERE id = ?
      `, params)

      return { success: true }
    } catch (error) {
      console.error('Project update error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  })
}

export async function updateProjectMemo(
  id: number,
  userId: string,
  memo: string
) {
  return withConnection(async (connection) => {
    try {
      // 권한 체크
      const [rows] = await connection.execute(
        'SELECT created_by FROM projects WHERE id = ?',
        [id]
      )
      
      const project = (rows as any[])[0]
      if (!project || project.created_by !== userId) {
        throw new Error('프로젝트를 수정할 권한이 없습니다.')
      }

      // 메모 업데이트
      await connection.execute(`
        UPDATE projects 
        SET promotion_memo = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [memo, id])

      return { success: true }
    } catch (error) {
      console.error('프로모션 메모 업데이트 실패:', error)
      throw error
    }
  })
}

export async function updateProjectStatus(projectId: number, status: 'completed') {
  console.log('Updating project status:', { projectId, status })  // 로그 추가
  
  return withConnection(async (connection) => {
    try {
      const [result] = await connection.execute(`
        UPDATE projects 
        SET 
          status = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [status, projectId])

      console.log('Update result:', result)  // 로그 추가
      return { success: true }
    } catch (error) {
      console.error('프로젝트 상태 업데이트 실패:', error)
      throw error
    }
  })
}

// 프로젝트 요약 데이터 조회
export async function getProjectSummary(projectId: number) {
  return withConnection(async (connection) => {
    try {
      // 1. 프로젝트 기본 정보와 블로거 목록 조회
      const [projectResult] = await connection.execute(`
        SELECT 
          p.start_date,
          p.end_date,
          GROUP_CONCAT(DISTINCT pb.blogger_id) as blogger_ids,
          GROUP_CONCAT(DISTINCT b.inf_nickname) as blogger_names
        FROM projects p
        LEFT JOIN project_bloggers pb ON p.id = pb.project_id
        LEFT JOIN blogger_data b ON pb.blogger_id = b.inf_blogid
        WHERE p.id = ?
        GROUP BY p.id
      `, [projectId])

      const project = (projectResult as any[])[0]
      if (!project) throw new Error('프로젝트를 찾을 수 없습니다')

      // 2. 포스팅 수, 공감 수, 댓글 수, 포스트 목록 조회
      const [statsResult] = await connection.execute(`
        SELECT 
          pp.*
        FROM project_posts pp
        WHERE pp.project_id = ?
        ORDER BY pp.created_at DESC
      `, [projectId])

      const stats = {
        total_posts: statsResult.length,
        total_likes: statsResult.reduce((sum: number, post: any) => sum + (post.like_count || 0), 0),
        total_comments: statsResult.reduce((sum: number, post: any) => sum + (post.comment_count || 0), 0)
      }

      // 3. 방문자 통계 데이터 조회
      const [visitorResult] = await connection.execute(`
        SELECT 
          b.inf_blogid,
          bvf.visitor_yesterday
        FROM project_bloggers pb
        JOIN blogger_data b ON pb.blogger_id = b.inf_blogid
        JOIN blog_visitor_follower bvf ON b.inf_blogid = bvf.inf_blogid
        WHERE pb.project_id = ?
        ORDER BY bvf.update_datetime DESC  -- 최신 데이터부터 정렬
      `, [projectId])

      // 데이터 형식 확인을 위한 로그
      console.log('Raw Visitor Data:', {
        first_row: visitorResult[0],
        visitor_yesterday: visitorResult[0]?.visitor_yesterday,
        visitor_hex: visitorResult[0]?.visitor_hex,
        type: typeof visitorResult[0]?.visitor_yesterday
      })

      // 4. 프로젝트 기간 동안의 날짜 배열 생성
      const startDate = new Date(project.start_date)
      const endDate = new Date(project.end_date)
      const dates: string[] = []
      let currentDate = startDate
      
      while (currentDate <= endDate) {
        dates.push(format(currentDate, 'yyyyMMdd'))
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // 5. 블로거별 방문자 통계 데이터 처리
      const bloggerIds = project.blogger_ids?.split(',') || []
      const bloggerNames = project.blogger_names?.split(',') || []
      
      // 블로거별 방문자 데이터 정리
      const visitorMap = new Map()
      visitorResult.forEach((row: any) => {
        try {
          let visitorData
          if (typeof row.visitor_yesterday === 'string') {
            // 이미 문자열인 경우
            visitorData = JSON.parse(row.visitor_yesterday)
          } else if (Buffer.isBuffer(row.visitor_yesterday)) {
            // Buffer인 경우 문자열로 변환
            visitorData = JSON.parse(row.visitor_yesterday.toString('utf8'))
          } else {
            // 그 외의 경우
            visitorData = row.visitor_yesterday
          }

          console.log('Parsed Visitor Data:', {
            blogId: row.inf_blogid,
            data: visitorData
          })

          const currentData = visitorMap.get(row.inf_blogid) || {}
          
          if (typeof visitorData === 'object' && visitorData !== null) {
            Object.entries(visitorData).forEach(([date, count]) => {
              if (!currentData[date] || currentData[date] < count) {
                currentData[date] = count
              }
            })
          }
          
          visitorMap.set(row.inf_blogid, currentData)
        } catch (error) {
          console.error('방문자 데이터 파싱 실패:', {
            blogId: row.inf_blogid,
            raw_data: row.visitor_yesterday,
            hex_data: row.visitor_hex,
            error
          })
        }
      })

      const visitorStats = bloggerIds.map((bloggerId: string, index: number) => ({
        bloggerName: bloggerNames[index],
        stats: dates.map(date => ({
          date: date.substring(4, 8).replace(/(\d{2})(\d{2})/, '$1/$2'),  // yyyyMMdd -> MM/dd
          visitors: visitorMap.get(bloggerId)?.[date] ?? null
        }))
      }))

      return {
        openDate: format(new Date(project.start_date), 'yy. MM. dd'),
        endDate: format(new Date(project.end_date), 'yy. MM. dd'),
        totalPosts: stats.total_posts,
        totalLikes: stats.total_likes,
        totalComments: stats.total_comments,
        visitorStats,
        posts: statsResult  // 포스트 목록 추가
      }
    } catch (error) {
      console.error('프로젝트 요약 데이터 조회 실패:', error)
      throw error
    }
  })
}

interface CompleteProjectPost {
  blogId: string
  postUrl: string
  likeCount: number | null
  commentCount: number | null
  postDate: string | null
}

// 프로젝트 완료 처리 액션
export async function completeProject(projectId: number, posts: CompleteProjectPost[]) {
  return withConnection(async (connection) => {
    try {
      await connection.beginTransaction()

      try {
        // 포스트 데이터 업데이트
        await Promise.all(posts.map(post => {
          const postDate = post.postDate ? new Date(post.postDate).toISOString().split('T')[0] : null
          
          return connection.execute(`
            UPDATE project_posts 
            SET 
              like_count = ?,
              comment_count = ?,
              post_date = ?,
              status = 'published',
              updated_at = NOW()
            WHERE project_id = ? AND blogger_id = ?
          `, [
            post.likeCount,
            post.commentCount,
            postDate,  // 변환된 날짜
            projectId,
            post.blogId
          ])
        }))

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

export async function addProjectKeyword(projectId: number, keyword: string) {
  return withConnection(async (connection) => {
    try {
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

      return (rows as any[])[0] as ProjectKeyword
    } catch (error) {
      console.error('키워드 추가 중 오류 발생:', error)
      throw new Error('키워드를 추가하는 중 오류가 발생했습니다.')
    }
  })
}

export async function updateProjectKeyword(keywordId: number, keyword: string) {
  return withConnection(async (connection) => {
    try {
      await connection.execute(`
        UPDATE project_keywords
        SET keyword = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [keyword, keywordId])

      return { success: true }
    } catch (error) {
      console.error('Error updating project keyword:', error)
      return { success: false, error: '키워드 수정 중 오류가 발생했습니다.' }
    }
  })
}

export async function getProjectKeywords(projectId: string) {
  return withConnection(async (connection) => {
    try {
      const [rows] = await connection.execute(`
        SELECT id, project_id, keyword, search_ranks, created_at, updated_at
        FROM project_keywords
        WHERE project_id = ?
        ORDER BY created_at DESC
      `, [projectId])
      
      return rows as ProjectKeyword[]
    } catch (error) {
      console.error('Error fetching project keywords:', error)
      throw new Error('프로젝트 키워드를 가져오는데 실패했습니다.')
    }
  })
} 

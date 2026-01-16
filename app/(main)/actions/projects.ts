import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { ProjectFilters, Project, ProjectWithStats } from "@/types/project"
import { withConnection } from '@/lib/db'

export interface ProjectListFilters extends ProjectFilters {
  includeCompleted?: boolean
}

// 프로젝트 목록 조회
export async function getProjects(filters: ProjectListFilters) {
  return withConnection(async (connection) => {
    let query = `
      SELECT 
        p.*,
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
      WHERE 1=1
    `
    const params: any[] = []

    // 상태 필터링
    if (filters.includeCompleted) {
      // 성과 페이지용: active + completed
      query += ` AND p.status IN ('active', 'completed')`
    } else {
      // 현황 페이지용: active + cancelled
      query += ` AND p.status IN ('active', 'cancelled')`
    }

    // 검색 필터
    if (filters.search) {
      query += ` AND p.name LIKE ?`
      params.push(`%${filters.search}%`)
    }

    // 특정 상태만 필터링
    if (filters.status) {
      query += ` AND p.status = ?`
      params.push(filters.status)
    }

    // 내 프로젝트 필터링
    if (filters.createdBy) {
      query += ` AND p.created_by = ?`
      params.push(filters.createdBy)
    }

    // 정렬 및 페이지네이션
    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    params.push(filters.limit || 10, ((filters.page || 1) - 1) * (filters.limit || 10))

    const [rows] = await connection.execute(query, params)

    if (!Array.isArray(rows)) {
      throw new Error('프로젝트 데이터가 배열이 아닙니다')
    }

    // 데이터 가공
    const projects = (rows as any[]).map(row => ({
      ...row,
      startDate: new Date(row.start_date).toISOString(),
      endDate: new Date(row.end_date).toISOString(),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      createdByName: row.created_by_name,
      bloggerCount: row.blogger_count || 0,
      bloggerIds: row.blogger_ids ? row.blogger_ids.split(',') : [],
      completedPosts: row.completed_posts || 0,
      progress: Math.round((row.completed_posts || 0) / row.target_posts * 100)
    }))

    return {
      projects,
      total: projects.length
    }
  })
}

// 프로젝트 상태 업데이트
export async function updateProjectStatus(
  projectId: number,
  status: 'active' | 'completed' | 'cancelled',
  userId: string
) {
  return withConnection(async (connection) => {
    await connection.execute(`
      UPDATE projects
      SET 
        status = ?,
        updated_at = NOW()
      WHERE id = ? AND created_by = ?
    `, [status, projectId, userId])

    return { success: true }
  })
} 
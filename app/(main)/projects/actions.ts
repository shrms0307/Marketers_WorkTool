'use server'

import { ProjectFilters, Project, ProjectWithStats } from "@/types/project"
import { withConnection } from '@/lib/db'
import { serverClient } from '@/lib/supabase/server'

export interface Blogger {
  inf_blogid: string;
  inf_nickname: string;
  inf_profileimage?: string;
}

// 프로젝트 생성
export async function createProject(data: {
  name: string
  startDate: Date
  endDate: Date
  targetPosts: number
  bloggerIds: string[]
}) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) throw new Error('인증이 필요합니다')

  return withConnection(async (connection) => {
    try {
      // 1. 프로젝트 생성
      const [result] = await connection.execute(
        `INSERT INTO projects (
          name, start_date, end_date, target_posts,
          created_by, created_by_name, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [
          data.name,
          data.startDate,
          data.endDate,
          data.targetPosts,
          session.user.id,
          session.user.user_metadata.name
        ]
      )

      const projectId = (result as any).insertId

      // 2. 블로거 매핑
      if (data.bloggerIds.length > 0) {
        const values = data.bloggerIds
          .map(() => "(?, ?)")
          .join(", ")

        const params = data.bloggerIds.flatMap(id => [projectId, id])

        await connection.execute(
          `INSERT INTO project_bloggers (project_id, blogger_id) VALUES ${values}`,
          params
        )
      }

      return { success: true, projectId }
    } catch (error) {
      console.error('프로젝트 생성 실패:', error)
      throw new Error('프로젝트 생성에 실패했습니다')
    }
  })
}

// 프로젝트 목록 조회
export async function getProjects(filters: ProjectFilters) {
  return withConnection(async (connection) => {
    // 전체 프로젝트 수 조회
    let countQuery = `
      SELECT COUNT(*) as total
      FROM projects p
      WHERE p.status IN ('active', 'cancelled')
    `
    const countParams: any[] = []

    // 검색 필터
    if (filters.search) {
      countQuery += ` AND p.name LIKE ?`
      countParams.push(`%${filters.search}%`)
    }

    // 특정 상태만 필터링
    if (filters.status) {
      countQuery += ` AND p.status = ?`
      countParams.push(filters.status)
    }

    // 내 프로젝트 필터링
    if (filters.createdBy) {
      countQuery += ` AND p.created_by = ?`
      countParams.push(filters.createdBy)
    }

    const [totalRows] = await connection.execute(countQuery, countParams)
    const total = (totalRows as any[])[0].total

    // 프로젝트 목록 조회
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
      WHERE p.status IN ('active', 'cancelled')
    `
    const params: any[] = []

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
    params.push(filters.limit || 12, ((filters.page || 1) - 1) * (filters.limit || 12))

    const [rows] = await connection.execute(query, params)

    if (!Array.isArray(rows)) {
      throw new Error('프로젝트 데이터가 배열이 아닙니다')
    }

    // 데이터 가공

    const projects = (rows as any[]).map(row => {
      // 날짜 변환 헬퍼 함수
      const toISOString = (date: any) => {
        if (!date) return null;
        try {
          return new Date(date).toISOString();
        } catch (error) {
          console.error('Invalid date:', date);
          return null;
        }
      };

      return {
        ...row,
        startDate: toISOString(row.start_date),
        endDate: toISOString(row.end_date),
        createdAt: toISOString(row.created_at),
        updatedAt: toISOString(row.updated_at),
        createdByName: row.created_by_name,
        bloggerCount: row.blogger_count || 0,
        bloggerIds: row.blogger_ids ? row.blogger_ids.split(',') : [],
        completedPosts: row.completed_posts || 0,
        targetPosts: row.target_posts,
        progress: Math.round((row.completed_posts || 0) / row.target_posts * 100)
      };
    });


    return {
      projects,
      total
    }
  })
} 

// 프로젝트의 블로거 목록 조회
export async function getProjectBloggers(projectId: string) {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(`
      SELECT 
        b.inf_blogid,
        b.inf_nickname,
        b.inf_profileimage
      FROM project_bloggers pb
      JOIN blogger_data b ON pb.blogger_id = b.inf_blogid
      WHERE pb.project_id = ?
    `, [projectId])

    return rows as Blogger[]
  })
}

// 블로거 정보 조회
export async function getBloggerInfo(bloggerIds: string[]) {
  return withConnection(async (connection) => {
    if (!bloggerIds.length) return [];  // 빈 배열 처리

    // IN 절을 위한 placeholder 생성 ("?,?,?" 형태)
    const placeholders = bloggerIds.map(() => "?").join(",");

    const [rows] = await connection.execute(`
      SELECT 
        inf_blogid,
        inf_nickname,
        inf_profileimage
      FROM blogger_data

      WHERE inf_blogid IN (${placeholders})
    `, bloggerIds);  // 배열을 직접 전달

    return rows as Blogger[];
  });
}

// 프로젝트에 블로거 추가
export async function addBloggersToProject(projectId: string, bloggerIds: string[]) {
  return withConnection(async (connection) => {
    // 중복 체크를 위한 기존 블로거 조회
    const [existing] = await connection.execute(`
      SELECT blogger_id
      FROM project_bloggers
      WHERE project_id = ? AND blogger_id IN (?)
    `, [projectId, bloggerIds])

    // 중복 제외한 새로운 블로거만 추가
    const existingIds = new Set((existing as any[]).map(row => row.blogger_id))
    const newBloggerIds = bloggerIds.filter(id => !existingIds.has(id))

    if (newBloggerIds.length > 0) {
      const values = newBloggerIds.map(() => "(?, ?)").join(", ")
      const params = newBloggerIds.flatMap(id => [projectId, id])

      await connection.execute(`
        INSERT INTO project_bloggers (project_id, blogger_id)
        VALUES ${values}
      `, params)
    }

    return { added: newBloggerIds.length }
  })
} 
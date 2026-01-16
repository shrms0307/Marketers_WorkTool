'use server'

import { ProjectFilters, Project, ProjectWithStats, ProjectDetailData } from "@/types/project"
import { withConnection } from '@/lib/db'
import { getBlogPostStats } from '@/app/(main)/actions/blog-post'
import synologyAxios from '@/lib/synology'
import { format } from 'date-fns'
import ExcelJS from 'exceljs'
import { headers } from 'next/headers'
import type { Database } from '@/types/supabase'
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

// 프로젝트 목록 조회 (active + completed)
export async function getProjects({ page = 1, limit = 12, search, status, createdBy }: {
  page?: number
  limit?: number
  search?: string
  status?: ProjectStatus
  createdBy?: string
}) {
  return withConnection(async (connection) => {
    // 기본 쿼리 구성
    let query = `
      SELECT 
        p.*,
        u.name as created_by_name,
        COUNT(DISTINCT pb.blogger_id) as blogger_count,
        COUNT(DISTINCT CASE WHEN pb.status = 'completed' THEN pb.blogger_id END) as completed_count
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN project_bloggers pb ON p.id = pb.project_id
    `

    // WHERE 절 조건 배열
    const conditions = ['p.deleted_at IS NULL']
    const values: any[] = []
    let valueIndex = 1

    // 검색어 조건
    if (search) {
      conditions.push(`p.title ILIKE $${valueIndex}`)
      values.push(`%${search}%`)
      valueIndex++
    }

    // 상태 필터 조건
    if (status) {
      conditions.push(`p.status = $${valueIndex}`)
      values.push(status)
      valueIndex++
    }

    // 생성자 필터 조건
    if (createdBy) {
      conditions.push(`p.created_by = $${valueIndex}`)
      values.push(createdBy)
      valueIndex++
    }

    // WHERE 절 추가
    query += ' WHERE ' + conditions.join(' AND ')

    // GROUP BY 절 추가
    query += ' GROUP BY p.id, u.name'

    // 전체 카운트 쿼리
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) 
      FROM projects p 
      WHERE ${conditions.join(' AND ')}
    `

    // 정렬 및 페이지네이션
    query += ` ORDER BY p.created_at DESC LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`
    values.push(limit, (page - 1) * limit)

    // 쿼리 실행
    const [{ count }] = await connection.query(countQuery, values.slice(0, -2))
    const rows = await connection.query(query, values)

    // 결과 매핑
    const projects: ProjectWithStats[] = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      bloggerCount: row.blogger_count || 0,
      completedCount: row.completed_count || 0,
      progress: row.blogger_count ? Math.round((row.completed_count || 0) / row.blogger_count * 100) : 0
    }))

    return {
      projects,
      total: Number(count)
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

// 프로젝트 상태 전환
export async function toggleProjectStatus(projectId: number, userId: string) {
  return withConnection(async (connection) => {
    // 현재 프로젝트 상태 확인
    const [project] = await connection.query(
      'SELECT status FROM projects WHERE id = $1 AND created_by = $2',
      [projectId, userId]
    )

    if (!project) {
      throw new Error('프로젝트를 찾을 수 없거나 권한이 없습니다.')
    }

    // 새로운 상태 결정
    const newStatus = project.status === 'completed' ? 'active' : 'completed'

    // 상태 업데이트
    await connection.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, projectId]
    )

    return {
      success: true,
      newStatus
    }
  })
}

// 실시간 프로젝트 통계 조회
export async function getProjectStats(projectId: number) {
  // TODO: 실시간 스크래핑 로직 구현
  return {
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    // ... 기타 통계 데이터
  }
}

export async function getProject(projectId: string): Promise<ProjectWithStats> {
  return withConnection(async (connection) => {
    // 프로젝트 기본 정보 조회
    const [projectRows] = await connection.execute(`
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM project_bloggers WHERE project_id = p.id) as blogger_count,
        (SELECT COUNT(*) FROM project_posts WHERE project_id = p.id) as post_count
      FROM projects p
      WHERE p.id = ?
    `, [projectId])

    if (!Array.isArray(projectRows) || !projectRows.length) {
      throw new Error('프로젝트를 찾을 수 없습니다')
    }

    const project = projectRows[0] as any

    // 프로젝트의 포스트 목록 조회
    const [postRows] = await connection.execute(`
      SELECT 
        pp.*,
        b.inf_nickname as blogger_nickname
      FROM project_posts pp
      LEFT JOIN blogger_data b ON pp.blogger_id = b.inf_blogid
      WHERE pp.project_id = ?
    `, [projectId])

    return {
      ...project,
      id: project.id.toString(),
      startDate: new Date(project.start_date).toISOString(),
      endDate: new Date(project.end_date).toISOString(),
      createdAt: new Date(project.created_at).toISOString(),
      updatedAt: new Date(project.updated_at).toISOString(),
      bloggerCount: project.blogger_count,
      posts: Array.isArray(postRows) ? (postRows as any[]).map(post => ({
        id: post.id.toString(),
        projectId: post.project_id.toString(),
        blogger_id: post.blogger_id,
        blogger_nickname: post.blogger_nickname,
        post_url: post.post_url,
        status: post.status,
        created_at: new Date(post.created_at).toISOString(),
        updated_at: new Date(post.updated_at).toISOString()
      })) : []
    }
  })
}

export async function getProjectPosts(projectId: string): Promise<ProjectPost[]> {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(`
      SELECT 
        pp.*,
        b.inf_nickname as blogger_nickname
      FROM project_posts pp
      LEFT JOIN blogger_data b ON pp.blogger_id = b.inf_blogid
      WHERE pp.project_id = ?
    `, [projectId])

    if (!Array.isArray(rows)) {
      throw new Error('포스트 데이터가 배열이 아닙니다')
    }

    return (rows as any[]).map(row => ({
      id: row.id.toString(),
      projectId: row.project_id.toString(),
      blogger_id: row.blogger_id,
      blogger_nickname: row.blogger_nickname,
      post_url: row.post_url,
      status: row.status,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString()
    }))
  })
}

interface BlogPostStats {
  likeCount: number
  commentCount: number
  postDate?: string
}

export async function getProjectSummary(projectId: string): Promise<ProjectSummaryData> {
  return withConnection(async (connection) => {
    // 프로젝트 기본 정보 조회
    const [projectRows] = await connection.execute(`
      SELECT 
        p.start_date, 
        p.end_date,
        (SELECT COUNT(*) FROM project_posts WHERE project_id = p.id) as post_count
      FROM projects p
      WHERE p.id = ?
    `, [projectId])

    if (!Array.isArray(projectRows) || !projectRows.length) {
      throw new Error('프로젝트를 찾을 수 없습니다')
    }

    const project = projectRows[0] as any

    // 프로젝트의 포스트 목록 조회
    const [postRows] = await connection.execute(`
      SELECT post_url
      FROM project_posts
      WHERE project_id = ?
    `, [projectId])

    // 각 포스트의 통계 데이터 수집
    let totalLikes = 0
    let totalComments = 0

    if (Array.isArray(postRows)) {
      const statsPromises = (postRows as any[]).map(post => 
        getBlogPostStats(post.post_url)
          .then((stats: BlogPostStats) => ({
            likes: stats.likeCount || 0,
            comments: stats.commentCount || 0
          }))
          .catch(() => ({ likes: 0, comments: 0 }))
      )

      const statsResults = await Promise.all(statsPromises)
      
      // 0은 실패로 간주하고 합계에서 제외
      statsResults.forEach((stat: { likes: number, comments: number }) => {
        if (stat.likes > 0) totalLikes += stat.likes
        if (stat.comments > 0) totalComments += stat.comments
      })
    }

    const startDate = new Date(project.start_date)
    const endDate = new Date(project.end_date)

    // 날짜 배열 생성 (프로젝트 기간)
    const dates: string[] = []
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // 방문자 통계 데이터 조회
    const [visitorRows] = await connection.execute(`
      SELECT 
        b.inf_blogid,
        b.inf_nickname,
        bvf.visitor_yesterday,
        bvf.update_datetime
      FROM project_bloggers pb
      LEFT JOIN blogger_data b ON pb.blogger_id = b.inf_blogid
      LEFT JOIN blog_visitor_follower bvf ON b.inf_blogid = bvf.inf_blogid
      WHERE pb.project_id = ?
      ORDER BY bvf.update_datetime DESC
    `, [projectId])

    // 블로거 목록 조회
    const [bloggerRows] = await connection.execute(`
      SELECT 
        b.inf_blogid,
        b.inf_nickname
      FROM project_bloggers pb
      JOIN blogger_data b ON pb.blogger_id = b.inf_blogid
      WHERE pb.project_id = ?
    `, [projectId])

    // 각 블로거별로 날짜 데이터 초기화
    const visitorStats = (bloggerRows as any[]).map(blogger => ({
      bloggerId: blogger.inf_blogid,
      bloggerName: blogger.inf_nickname,
      stats: dates.map(date => ({
        date,
        visitors: null  // 기본값은 null (누락)
      }))
    }))

    // 방문자 데이터 매핑
    if (Array.isArray(visitorRows)) {
      const visitorStatsByBlogger = new Map()

      visitorRows.forEach((row: any) => {
        if (row.visitor_yesterday && row.inf_blogid) {
          try {
            const visitorData = JSON.parse(row.visitor_yesterday.replace(/'/g, '"'))
            
            // 블로거별 초기 데이터 설정
            if (!visitorStatsByBlogger.has(row.inf_blogid)) {
              visitorStatsByBlogger.set(row.inf_blogid, {
                bloggerName: row.inf_nickname || '알 수 없음',
                visitorData: {}
              })
            }

            const currentStats = visitorStatsByBlogger.get(row.inf_blogid)

            // 각 날짜별로 더 큰 값으로 업데이트
            for (const [date, count] of Object.entries(visitorData)) {
              const visitorCount = Number(count)
              if (!currentStats.visitorData[date] || visitorCount > currentStats.visitorData[date]) {
                currentStats.visitorData[date] = visitorCount
                console.log(`블로거 ${currentStats.bloggerName} - ${date}: ${visitorCount}명 방문`)
              }
            }
          } catch (e) {
            console.error('방문자 데이터 파싱 실패:', e)
          }
        }
      })

      // Map을 객체로 변환
      visitorStatsByBlogger.forEach((value, key) => {
        summary.visitorStats[key] = value
      })
    }

    return {
      openDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      postCount: project.post_count,
      totalLikes,
      totalComments,
      visitorStats
    }
  })
}

export async function getProjectKeywords(projectId: string) {
  console.log('getProjectKeywords 호출됨:', projectId);
  return withConnection(async (connection) => {
    try {
      const [rows] = await connection.execute(`
        SELECT id, keyword
        FROM project_keywords
        WHERE project_id = ?
        ORDER BY created_at ASC
      `, [projectId]);

      console.log('조회된 키워드 데이터:', rows);

      if (!Array.isArray(rows)) {
        console.log('rows가 배열이 아님');
        return [];
      }

      const result = (rows as any[]).map(row => ({
        id: row.id,
        keyword: row.keyword
      }));

      console.log('반환할 키워드 데이터:', result);
      return result;
    } catch (error) {
      console.error('키워드 조회 실패:', error);
      return [];
    }
  });
}

// 프로젝트 이름 조회
export async function getProjectName(projectId: string): Promise<string> {
  return withConnection(async (connection) => {
    try {
      const [rows] = await connection.execute(`
        SELECT name
        FROM projects
        WHERE id = ?
      `, [projectId]);

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('프로젝트를 찾을 수 없습니다');
      }

      return (rows[0] as any).name;
    } catch (error) {
      console.error('프로젝트 이름 조회 실패:', error);
      throw error;
    }
  });
}

// 시놀로지에서 프로젝트 이미지 정보 조회
interface ProjectImageInfo {
  ranks: number[];
  keyword: string;
  imageUrl?: string;
}

// 순위 정보 파싱 함수
function parseRanks(fileName: string): number[] {
  const match = fileName.match(/\(([0-9,]+)\)/);
  if (!match) return [];
  return match[1].split(',').filter(Boolean).map(Number);
}

export async function getProjectExposureImage(projectId: string, keyword: string): Promise<ProjectImageInfo | null> {
  try {
    const keywordPath = `/TVNAS132/smart_service/Project_Report/${projectId}/${keyword}`;
    console.log('검색할 경로:', keywordPath);
    
    const response = await synologyAxios.post('/webapi/entry.cgi', {
      api: 'SYNO.FileStation.List',
      version: '2',
      method: 'list',
      folder_path: keywordPath,
      pattern: '*.jpg',
      additional: '["size","time"]'
    });

    // console.log('시놀로지 응답:', response.data);

    if (!response.data.success || !response.data.data?.files?.length) {
      console.log('이미지를 찾을 수 없음:', keywordPath);
      return null;
    }

    const jpgFiles = response.data.data.files
      .sort((a: any, b: any) => b.additional.time.mtime - a.additional.time.mtime);

    const latestFile = jpgFiles[0];
    // console.log('선택된 파일:', latestFile);
    
    const ranks = parseRanks(latestFile.name);
    const imagePath = `${keywordPath}/${latestFile.name}`;
    const imageUrl = `/api/synology/image?path=${imagePath}`;
    // console.log('이미지 URL:', imageUrl);
    
    if (!ranks || !imageUrl) {
      console.log('필수 데이터 누락:', { ranks, imageUrl });
      return null;
    }

    return {
      ranks,
      keyword,
      imageUrl
    };
  } catch (error) {
    console.error('프로젝트 이미지 조회 실패:', error);
    return null;
  }
}

export async function downloadProjectExcel(projectId: string) {
  const workbook = new ExcelJS.Workbook()
  
  try {
    // 프로젝트 데이터 조회
    const data = await getProjectDetailData(projectId)
    if (!data) throw new Error('프로젝트 데이터를 찾을 수 없습니다.')
    
    // 1. 요약 시트
    const summarySheet = workbook.addWorksheet('요약')
    summarySheet.columns = [
      { header: '구분', key: 'category', width: 20 },
      { header: '내용', key: 'content', width: 40 }
    ]
    
    // 프로젝트 기본 정보
    summarySheet.addRow({ category: '프로젝트명', content: data.project.name })
    summarySheet.addRow({ 
      category: '프로젝트 기간', 
      content: `${format(new Date(data.project.start_date), 'yyyy.MM.dd')} ~ ${format(new Date(data.project.end_date), 'yyyy.MM.dd')}` 
    })
    summarySheet.addRow({ category: '목표 포스팅', content: data.project.target_posts })
    summarySheet.addRow({ category: '완료 포스팅', content: data.summary.totalPosts })
    summarySheet.addRow({ category: '총 좋아요', content: data.summary.totalReactions })
    summarySheet.addRow({ category: '총 댓글', content: data.summary.totalComments })

    // 방문자 통계 추가
    summarySheet.addRow({ category: '', content: '' }) // 빈 줄
    summarySheet.addRow({ category: '방문자 통계', content: '' })
    
    // 날짜 목록 생성 (프로젝트 기간 동안)
    const startDate = new Date(data.project.start_date)
    const endDate = new Date(data.project.end_date)
    const dates: string[] = []
    let currentDate = new Date(endDate)
    
    while (currentDate >= startDate) {
      dates.push(format(currentDate, 'yyyyMMdd'))
      currentDate.setDate(currentDate.getDate() - 1)
    }

    // 방문자 통계 헤더 추가
    const visitorHeaders = ['블로거', ...dates.map(date => format(new Date(
      parseInt(date.slice(0, 4)),
      parseInt(date.slice(4, 6)) - 1,
      parseInt(date.slice(6, 8))
    ), 'MM.dd'))]
    summarySheet.addRow(visitorHeaders)

    // 블로거별 방문자 데이터 추가
    Object.entries(data.summary.visitorStats).forEach(([bloggerId, stats]) => {
      const rowData = [
        stats.bloggerName,
        ...dates.map(date => stats.visitorData[date] || '누락')
      ]
      summarySheet.addRow(rowData)
    })
    
    // 2. 포스트 목록 시트
    const postsSheet = workbook.addWorksheet('포스트 목록')
    postsSheet.columns = [
      { header: '블로거', key: 'blogger', width: 20 },
      { header: '포스트 URL', key: 'url', width: 50 },
      { header: '상태', key: 'status', width: 15 },
      { header: '등록일', key: 'date', width: 15 },
      { header: '좋아요', key: 'reactions', width: 10 },
      { header: '댓글', key: 'comments', width: 10 }
    ]
    
    data.posts.forEach(post => {
      postsSheet.addRow({
        blogger: post.blogger_name,
        url: post.post_url,
        status: post.status === 'published' ? '완료' : '진행중',
        date: format(new Date(post.created_at), 'yyyy.MM.dd'),
        reactions: post.stats?.reactions || 0,
        comments: post.stats?.comments || 0
      })
    })
    
    // 3. 게시글 노출 시트
    const exposureSheet = workbook.addWorksheet('게시글 노출')
    exposureSheet.columns = [
      { header: '키워드', key: 'keyword', width: 30 },
      { header: '순위', key: 'rank', width: 30 }
    ]
    
    // 키워드와 노출 정보 매칭
    data.keywords.forEach(keyword => {
      const exposureInfo = data.exposureImages.find(img => img.keyword === keyword.keyword)
      exposureSheet.addRow({
        keyword: keyword.keyword,
        rank: exposureInfo ? exposureInfo.ranks.join(', ') : '노출 안됨'
      })
    })
    
    // 엑셀 파일 생성
    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer).toString('base64')
    
  } catch (error) {
    console.error('엑셀 파일 생성 실패:', error)
    throw error
  }
}

export async function getProjectDetailData(projectId: string): Promise<ProjectDetailData> {
  if (!projectId) throw new Error('프로젝트 ID가 필요합니다')

  return withConnection(async (connection) => {
    // 1. 프로젝트 기본 정보 조회
    const [projectRows] = await connection.execute(`
      SELECT 
        id, name, start_date, end_date, target_posts,
        status, created_by, created_by_name
      FROM projects 
      WHERE id = ?
    `, [projectId])

    if (!Array.isArray(projectRows) || !projectRows.length) {
      throw new Error('프로젝트를 찾을 수 없습니다')
    }

    const row = projectRows[0] as any
    const project: ProjectDetailData['project'] = {
      id: Number(row.id || 0),
      name: String(row.name || ''),
      start_date: String(row.start_date || ''),
      end_date: String(row.end_date || ''),
      target_posts: Number(row.target_posts || 0),
      status: String(row.status || ''),
      created_by: String(row.created_by || ''),
      created_by_name: String(row.created_by_name || '')
    }

    // 2. 프로젝트 요약 정보 조회
    const [summaryRows] = await connection.execute(`
      SELECT 
        COALESCE(
          (SELECT COUNT(*) FROM project_posts WHERE project_id = ? AND status = 'published'),
          0
        ) as completed_posts
    `, [projectId])

    // 3. 게시글 통계 조회
    const [publishedPosts] = await connection.execute(`
      SELECT post_url
      FROM project_posts
      WHERE project_id = ? AND post_url IS NOT NULL
    `, [projectId])

    let totalReactions = 0
    let totalComments = 0

    const publishedUrls = (publishedPosts as any[])
      .map(row => String(row.post_url || ''))
      .filter(url => url.length > 0)

    if (publishedUrls.length > 0) {
      const stats = await getBlogPostStats(publishedUrls)
      Object.values(stats).forEach(stat => {
        if (stat) {
          totalReactions += stat.reactions || 0
          totalComments += stat.comments || 0
        }
      })
    }

    const summary: ProjectDetailData['summary'] = {
      totalPosts: publishedUrls.length,
      totalReactions,
      totalComments,
      visitorStats: {}
    }

    // 4. 방문자 통계 조회
    const [visitorRows] = await connection.execute(`
      SELECT 
        b.inf_blogid,
        b.inf_nickname,
        bvf.visitor_yesterday,
        bvf.update_datetime
      FROM project_bloggers pb
      LEFT JOIN blogger_data b ON pb.blogger_id = b.inf_blogid
      LEFT JOIN blog_visitor_follower bvf ON b.inf_blogid = bvf.inf_blogid
      WHERE pb.project_id = ?
      ORDER BY bvf.update_datetime DESC
    `, [projectId])

    if (Array.isArray(visitorRows)) {
      const visitorStatsByBlogger = new Map()

      visitorRows.forEach((row: any) => {
        if (row.visitor_yesterday && row.inf_blogid) {
          try {
            const visitorData = JSON.parse(row.visitor_yesterday.replace(/'/g, '"'))
            
            if (!visitorStatsByBlogger.has(row.inf_blogid)) {
              visitorStatsByBlogger.set(row.inf_blogid, {
                bloggerName: row.inf_nickname || '알 수 없음',
                visitorData: {}
              })
            }

            const currentStats = visitorStatsByBlogger.get(row.inf_blogid)

            for (const [date, count] of Object.entries(visitorData)) {
              const visitorCount = Number(count)
              if (!currentStats.visitorData[date] || visitorCount > currentStats.visitorData[date]) {
                currentStats.visitorData[date] = visitorCount
              }
            }
          } catch (e) {
            console.error('방문자 데이터 파싱 실패:', e)
          }
        }
      })

      visitorStatsByBlogger.forEach((value, key) => {
        summary.visitorStats[key] = value
      })
    }

    // 5. 포스트 목록 조회
    const [postRows] = await connection.execute(`
      SELECT 
        pp.*,
        b.inf_nickname as blogger_name
      FROM project_posts pp
      LEFT JOIN blogger_data b ON pp.blogger_id = b.inf_blogid
      WHERE pp.project_id = ?
      ORDER BY pp.created_at DESC
    `, [projectId])

    const posts: ProjectDetailData['posts'] = (postRows as any[]).map(post => ({
      id: Number(post.id || 0),
      blogger_id: String(post.blogger_id || ''),
      blogger_name: String(post.blogger_name || post.blogger_id || '알 수 없음'),
      post_url: String(post.post_url || ''),
      status: String(post.status || 'draft'),
      created_at: String(post.created_at || new Date().toISOString())
    }))

    const postUrls = posts.map(post => post.post_url).filter(Boolean)
    
    if (postUrls.length > 0) {
      const stats = await getBlogPostStats(postUrls)
      posts.forEach(post => {
        if (post.post_url && stats[post.post_url]) {
          post.stats = stats[post.post_url]
        }
      })
    }

    // 6. 키워드 목록 조회
    const [keywordRows] = await connection.execute(`
      SELECT id, keyword, created_at
      FROM project_keywords
      WHERE project_id = ?
      ORDER BY created_at ASC
    `, [projectId])

    const keywords: ProjectDetailData['keywords'] = (keywordRows as any[]).map(row => ({
      id: Number(row.id),
      keyword: String(row.keyword || ''),
      created_at: String(row.created_at || new Date().toISOString())
    }))

    // 7. 노출 이미지 조회
    const exposureImages: ProjectDetailData['exposureImages'] = []
    for (const keyword of keywords) {
      const imageInfo = await getProjectExposureImage(projectId, keyword.keyword)
      if (imageInfo) {
        exposureImages.push(imageInfo)
      }
    }

    return {
      project,
      summary,
      posts,
      keywords,
      exposureImages
    }
  })
}


// 엑셀 다운로드 로그 기록
export async function recordExcelDownload(projectId: string) {
  const supabase = createServerActionClient<Database>({ cookies })

  try {
    // 현재 세션에서 사용자 정보 가져오기
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    await withConnection(async (connection) => {
      // MySQL에서 프로젝트 정보 가져오기
      const [projects] = await connection.query(
        'SELECT name FROM projects WHERE id = ?',
        [projectId]
      )
      const project = projects as any[]

      if (!project || !project[0]) {
        throw new Error('프로젝트를 찾을 수 없습니다.')
      }

      // MySQL에 다운로드 로그 기록
      await connection.query(
        `INSERT INTO report_logs (
          supabase_uid, user_email, project_id, project_name, 
          file_name, download_status, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          session.user.id,
          session.user.email,
          projectId,
          project[0].name,
          `${project[0].name}_보고서.xlsx`,
          'success',
          null // 성공 시 에러 메시지 없음
        ]
      )
    })

  } catch (error) {
    console.error('다운로드 로그 기록 실패:', error)
    throw error
  }
} 
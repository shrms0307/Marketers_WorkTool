'use server'

import { withConnection } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export interface BlogRankingData extends RowDataPacket {
  idx: number;
  inf_nickname: string;
  inf_blogid: string;
  inf_profileimage: string;
  inf_address: string | null;
  category: string;
  blogger_type: string;
  blog_startdate: Date;
  follower_count: number;
  visitor_avg: number;
  total_post_count: number;
  changed_type: string | null;
  visitor_rank: string;  // JSON string
  comment_rank: string;  // JSON string
}

export async function getBlogRankings(category: string = "전체"): Promise<BlogRankingData[]> {
  return withConnection(async (connection) => {
    try { 
      let whereClause = '';
      const queryParams: any[] = [];

      if (category !== "전체") {
        whereClause = 'WHERE b.category = ?';
        queryParams.push(category);
      }

      const [rows] = await connection.execute<BlogRankingData[]>(`
        SELECT 
          b.idx,
          b.inf_nickname,
          b.inf_blogid,
          b.inf_profileimage,
          b.inf_address,
          b.category,
          b.blogger_type,
          b.blog_startdate,
          b.follower_count,
          b.visitor_avg,
          b.total_post_count,
          b.changed_type,
          b.visitor_diff,
          br.visitor_rank,
          br.comment_rank
        FROM blogger_data b
        LEFT JOIN blogger_rank br ON b.inf_blogid = br.inf_blogid
        ${whereClause}
        ORDER BY b.visitor_avg DESC
      `, queryParams);
      
      return rows;

    } catch (error) {
      console.error('블로그 랭킹 조회 실패:', {
        error,
        category,
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof Error) {
        throw new Error(`블로그 랭킹 조회 실패: ${error.message}`);
      }
      throw new Error('블로그 랭킹을 가져오는데 실패했습니다.');
    }
  });
}
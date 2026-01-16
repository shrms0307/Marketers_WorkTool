import { RowDataPacket } from "mysql2";

export interface BlogRankingData extends RowDataPacket {
  idx: number;
  inf_nickname: string;
  inf_blogid: string;
  inf_profileimage?: string;
  inf_address: string | null;
  blogger_type: string;
  blog_startdate: Date;
  follower_count: number;
  visitor_avg: number;
  total_post_count: number;
  category: string;
}

export interface BlogAnalysisData extends RowDataPacket {
  inf_blogid: string;
  inf_nickname: string;
  inf_profileimage: string;
  inf_blogname: string;
  blog_address: string;
  category: string;
  follower_count: number;
  visitor_total: number;
  visitor_yesterday: string;
  visitor_avg: number;
  post_count: number;
  total_post_count: number;
  blog_startdate: Date;
  blogger_type: string;
  description: string;
  update_datetime: string;
} 
export interface SearchResponse {
  items: {
    inf_nickname: string;
    inf_blogid: string;
    blogger_type: string;
    blog_startdate: string;
    follower_count: number;
    visitor_avg: number;
    total_post_count: number;
  }[];
} 
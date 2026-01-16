export type ProjectStatus = 'active' | 'completed' | 'cancelled'

// 프로젝트 키워드 타입 추가
export interface ProjectKeyword {
  id: number
  project_id: number
  keyword: string
  search_ranks: string
  created_at: string
  updated_at: string
}

// 프로젝트 기본 정보
export interface Project {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  targetPosts: number;
  status: ProjectStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

// 프로젝트 상세 정보에 추가될 타입들
export interface ProjectBlogger {
  inf_blogid: string
  inf_nickname: string
  inf_profileimage?: string
  inf_address?: string
  category: string
  visitor_avg: number
  follower_count: number
  status?: string
  post_url?: string
  manager_confirmed?: boolean
  blogger_type?: string
  post?: {
    url: string
    status: 'draft' | 'published' | 'confirmed' | 'rejected'
    created_at: string
  }
}

interface ProjectPost {
  id: number;
  project_id: number;
  blogger_id: string;
  post_url: string;
  status: 'draft' | 'published' | 'rejected';
  created_at: string;
}

// 프로젝트 상세 정보 타입 확장
export interface ProjectWithStats {
  id: number
  name: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
  createdBy: string
  createdByName: string
  targetPosts: number
  status: string
  bloggerCount: number
  completedPosts: number
  progress: number
  remainingDays: number
  bloggerIds: string[]
  bloggers: ProjectBlogger[]
  keywords: ProjectKeyword[]
  promotion_memo?: string
}

// 필터링 옵션
export interface ProjectFilters {
  status?: ProjectStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof Project;
  sortOrder?: 'asc' | 'desc';
  createdBy?: string;  // 'me'일 경우 내 프로젝트만 필터링
} 

interface ProjectBloggerRow {
  inf_blogid: string
  inf_nickname: string
  inf_profileimage: string
  category: string
  blogger_type: string
  follower_count: number
  visitor_avg: number
  post_url?: string
  inf_address?: string
  status: 'pending' | 'accepted' | 'rejected'
  post?: {
    url: string
    status: 'draft' | 'published' | 'rejected'
    created_at: string
  }
  manager_check: boolean
  manager_checked_at?: string
} 

export interface ProjectDetailData {
  project: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    target_posts: number;
    status: string;
    created_by: string;
    created_by_name: string;
  }
  summary: {
    totalPosts: number;
    completedPosts: number;
    totalBloggers: number;
    totalReactions: number;
    totalComments: number;
    visitorStats: {
      [bloggerId: string]: {
        bloggerName: string;
        visitorData: {
          [date: string]: number;
        };
      };
    };
  }
  posts: {
    id: number;
    blogger_id: string;
    blogger_name: string;
    post_url: string;
    status: string;
    created_at: string;
    stats?: {
      comments: number;
      reactions: number;
    };
  }[];
  keywords: {
    id: number;
    keyword: string;
    created_at: string;
  }[];
  exposureImages: ProjectImageInfo[];
}

export interface ProjectImageInfo {
  keyword: string;
  imageUrl: string;
  ranks: number[];
}

export interface BlogPostStats {
  [url: string]: {
    reactions: number;
    comments: number;
  } | undefined;
} 
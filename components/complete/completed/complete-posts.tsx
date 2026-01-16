'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from 'lucide-react'
import { cn } from "@/lib/utils"

interface CompletePostsProps {
  posts: {
    id: number
    blogger_id: string
    blogger_name: string
    post_url: string
    status: string
    created_at: string
    stats?: {
      comments: number
      reactions: number
    }
  }[]
}

export function CompletePosts({ posts }: CompletePostsProps) {
  const [search, setSearch] = useState('')

  // 블로거 ID로 필터링
  const filteredPosts = posts.filter(post =>
    post.blogger_id.toLowerCase().includes(search.toLowerCase()) ||
    post.blogger_name.toLowerCase().includes(search.toLowerCase())
  )

  const renderStatValue = (value: number | undefined) => {
    if (value === undefined) {
      return <Badge variant="secondary">누락</Badge>
    }
    return value.toLocaleString()
  }

  if (!posts.length) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">
            포스트가 없습니다.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>포스트 목록</CardTitle>
          <Input 
            placeholder="블로거 검색..." 
            className="w-[250px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>블로거</TableHead>
              <TableHead>포스팅 URL</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">공감</TableHead>
              <TableHead className="text-right">댓글</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPosts.map((post) => (
              <TableRow key={post.id}>
                <TableCell>{post.blogger_name || post.blogger_id}</TableCell>
                <TableCell>
                  <a 
                    href={post.post_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-500 hover:underline"
                  >
                    {post.post_url.length > 50 
                      ? post.post_url.substring(0, 50) + '...' 
                      : post.post_url}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={cn(
                      post.status === 'rejected' && "bg-muted text-muted-foreground border-muted-foreground",
                      post.status === 'draft' && "bg-gray-100 text-gray-800 hover:bg-gray-100/80",
                      post.status === 'published' && "bg-sky-100 text-sky-800 hover:bg-sky-100/80",
                      post.status === 'confirmed' && "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80"
                    )}
                  >
                    {post.status === 'draft' ? '작성 대기' :
                     post.status === 'published' ? '작성 완료' :
                     post.status === 'confirmed' ? '확인 완료' :
                     post.status === 'rejected' ? '반려' : 
                     '작성 대기'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {renderStatValue(post.stats?.reactions)}
                </TableCell>
                <TableCell className="text-right">
                  {renderStatValue(post.stats?.comments)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
} 
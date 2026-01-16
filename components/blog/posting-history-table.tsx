'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PostingData } from "@/app/blog-analysis/actions"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, ThumbsUp, Image } from "lucide-react"
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface PostingHistoryTableProps {
  data: PostingData[]
}

const statusVariants = {
  "active": "bg-green-100 text-green-800",
  "pending": "bg-yellow-100 text-yellow-800",
  "completed": "bg-blue-100 text-blue-800",
  "cancelled": "bg-red-100 text-red-800",
}

export function PostingHistoryTable({ data }: PostingHistoryTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>날짜</TableHead>
            <TableHead>제목</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-center">상호작용</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((posting) => (
            <TableRow key={posting.idx}>
              <TableCell>
                {format(new Date(posting.post_date), 'yyyy-MM-dd', { locale: ko })}
              </TableCell>
              <TableCell>
                <a 
                  href={posting.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-500 hover:underline"
                >
                  {posting.post_title}
                </a>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={statusVariants[posting.post_status as keyof typeof statusVariants] || ""}
                >
                  {posting.post_status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-center gap-4">
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{posting.like_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{posting.comment_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Image className="h-4 w-4" />
                    <span>{posting.image_count}</span>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 
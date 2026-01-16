'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import Link from "next/link"

interface ProjectBloggerStatsProps {
  bloggers: Array<{
    inf_blogid: string
    inf_nickname: string
    inf_profileimage: string
    category: string
    visitor_avg: number
    follower_count: number
  }>
}

export function ProjectBloggerStats({ bloggers }: ProjectBloggerStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {bloggers.map((blogger) => (
        <Card key={blogger.inf_blogid}>
          <CardHeader className="space-y-0 pb-2">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={blogger.inf_profileimage} />
                <AvatarFallback>{blogger.inf_nickname[0]}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">
                    {blogger.inf_nickname}
                  </CardTitle>
                  <Link 
                    href={`https://blog.naver.com/${blogger.inf_blogid}`}
                    target="_blank"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {blogger.category}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground">방문자</div>
              <div className="text-right">{blogger.visitor_avg.toLocaleString()}</div>
              <div className="text-muted-foreground">이웃수</div>
              <div className="text-right">{blogger.follower_count.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 
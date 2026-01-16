"use client"

import * as React from "react"
import {
  BookOpen,
  Bot,
 Home,
  Users,
  MessageSquare,
  BarChart,
  FileSpreadsheet,
  Eye,
  Command,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
  User,
  ClipboardList,
  Search,
  Radar
} from "lucide-react"


import { NavMain } from "@/components/navbar/nav-main"
import { NavProjects } from "@/components/navbar/nav-projects"
import { NavSecondary } from "@/components/navbar/nav-secondary"

import { NavUser } from "@/components/navbar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from '@/contexts/AuthContext'
import Image from "next/image"
import { IMAGE_PATHS } from '@/lib/constants'
import { useUser } from '@/hooks/use-user'
import { useRouter } from 'next/navigation'
const data = {
  navSecondary: [
    // {
    //   title: "Support",
    //   url: "#",
    //   icon: LifeBuoy,
    // },
    // {
    //   title: "Feedback",
    //   url: "#",
    //   icon: Send,
    // },
  ],
  navMain: {
    title: "블로그",
    items: [
      {
        title: "메인페이지",
        url: "/",
        icon: Home,
      },
    ]
  },
  projects: {
    title: "마케팅 업무지원 도구",
    collapsible: true,
    items: [
      {
          title: "카페 게시글 댓글 추출",
          url: "/cafe-comments",
          icon: MessageSquare,
        },
      {
        title: "블로그 방문자수 확인",
        url: "/blog-stats",
        icon: BarChart,
      },
      {
        title: "조회수 확인",
        url: "/views",
        icon: Eye,
      },
      {
        title: "키워드 검색",
        url: "/KeywordSearch",
        icon: Search,
      },
      {
        title: "키워드 모니터링", // 추가
        url: "/keyword_reports", 
        icon: FileSpreadsheet,   
      },
      {
        title: "키워드 크롤러", // 추가
        url: "/keyword_crawler", 
        icon: Radar,   
      },
    ],
  },
  projectManagement: {
    title: "프로젝트 관리",
    collapsible: true,
    items: [
      {
        title: "프로젝트 현황",
        url: "/projects",
        icon: ClipboardList,
      },
      {
        title: "프로젝트 성과",
        url: "/complete",
        icon: ClipboardList,
      }
    ],
  },
}

const sidebarItems = [
  // ... 기존 메뉴 항목들
  {
    title: "프로젝트",
    items: [
      {
        title: "프로젝트 현황",
        href: "/projects",
        icon: ClipboardList,  // 또는 다른 적절한 아이콘
      },
      // 추가 다른 프로젝트 관련 메뉴 추가 가능
    ],
  },
  // ... 기존 메뉴 항목들
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const user = useUser()


  return (
    <Sidebar
      className="border-r bg-gray-100/40 dark:bg-gray-800/40"
      collapsible="icon"
      collapsed={isCollapsed}
      onCollapsedChange={setIsCollapsed}
      {...props}
    >
      <SidebarHeader className="border-b bg-gray-50 dark:bg-gray-800/60">
        <div className="flex items-center justify-center h-[3rem]">
          <Image
            src={`${IMAGE_PATHS.ICONS}/logo.png`}
            alt="Logo"
            width={160}
            height={48}
            priority
            className="w-auto h-full dark:brightness-0 dark:invert"
            onClick={() => router.push('/')}
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="space-y-4 py-4">
          <NavMain items={data.navMain} collapsed={isCollapsed.toString()} />
          <NavProjects items={data.projectManagement} collapsed={isCollapsed.toString()} />
          <NavProjects items={data.projects} collapsed={isCollapsed.toString()} />
          <NavSecondary 
            items={data.navSecondary} 
            collapsed={isCollapsed.toString()} 
            className="mt-auto" 
          />      
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t bg-gray-50 dark:bg-gray-800/60">
        {user ? (
          <NavUser
            user={{
              name: user.user_metadata?.name || '없음',
              email: user.email || '',
              avatar: user.user_metadata?.avatar_url || '',
            }}
            collapsed={isCollapsed.toString()}
          />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/login">
                  {isCollapsed ? <User className="h-4 w-4" /> : "로그인"}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}


"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavMainProps {
  items: {
    title: string
    items: {
      title: string
      url: string
      icon: LucideIcon
    }[]
  }
  collapsed?: string | undefined
}

export function NavMain({ items, collapsed }: NavMainProps) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        {collapsed !== "true" && items.title}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.url}
            >
              <Link href={item.url}>
                <item.icon className="h-4 w-4" />
                {collapsed !== "true" && <span>{item.title}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

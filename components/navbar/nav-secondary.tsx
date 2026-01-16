import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavSecondaryProps {
  items: {
    title: string
    url: string
    icon: LucideIcon
  }[]
  collapsed?: string | undefined
  className?: string
}

export function NavSecondary({ items, collapsed, className }: NavSecondaryProps) {
  const pathname = usePathname()

  return (
    <SidebarMenu className={className}>
      {items.map((item) => (
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
  )
}

"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

interface NavProjectsProps {
  items: {
    title: string
    collapsible?: boolean
    items: {
      title: string
      url: string
      icon: LucideIcon
    }[]
  }
  collapsed?: string | undefined
}

export function NavProjects({ items, collapsed }: NavProjectsProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)

  if (!items.collapsible) {
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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer">
            {collapsed !== "true" && (
              <>
                {items.title}
                <ChevronRight
                  className={`ml-auto h-4 w-4 transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                />
              </>
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
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
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

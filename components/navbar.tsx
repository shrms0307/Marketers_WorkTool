'use client'

import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

interface NavbarProps {
  children: React.ReactNode
}

export function Navbar({ children }: NavbarProps) {
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          <SidebarTrigger />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              {/* 추후 필요한 액션 버튼들 추가 가능 */}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <SidebarInset className="flex-1 overflow-auto">
        <div className="w-full space-y-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </>
  )
} 
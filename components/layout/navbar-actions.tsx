'use client'

import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'

export function NavbarActions() {
  return (
    <>
      <SidebarTrigger />
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 추후 필요한 액션 버튼들 추가 가능 */}
        </div>
        <ThemeToggle />
      </div>
    </>
  )
} 
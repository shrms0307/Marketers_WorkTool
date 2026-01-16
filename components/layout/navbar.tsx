'use client'

import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { useNavbar } from './navbar-provider'

export function Navbar() {
  const { title } = useNavbar()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        <SidebarTrigger />
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-lg font-semibold">
            {title}
          </h1>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
} 
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { Navbar } from "@/components/layout/navbar"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Toaster />
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 w-full flex flex-col">
          <Navbar />
          <div className="flex-1">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </div>
  )
} 
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from '@/components/ui/toaster'
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="relative min-h-screen">
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        {children}
        <Toaster />
      </div>
    </ThemeProvider>
  )
} 
'use client'

interface PageContainerProps {
  subtitle?: string
  description?: string
  children: React.ReactNode
}

export function PageContainer({
  subtitle,
  description,
  children
}: PageContainerProps) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {(subtitle || description) && (
        <div className="flex flex-col gap-1">
          {subtitle && (
            <h2 className="text-xl font-semibold tracking-tight">
              {subtitle}
            </h2>
          )}
          {description && (
            <div className="text-sm text-muted-foreground">
              {description}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
} 
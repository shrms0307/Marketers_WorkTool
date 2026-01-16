interface LoadingScreenProps {
  message?: string
  description?: string
}

export function LoadingScreen({ 
  message = "프로젝트 성과를 분석하고 있습니다", 
  description = "잠시만 기다려주세요..."
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{message}</h2>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
} 
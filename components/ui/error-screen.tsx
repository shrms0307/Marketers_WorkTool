interface ErrorScreenProps {
  message?: string
  description?: string
  onRetry?: () => void
}

export function ErrorScreen({ 
  message = "데이터를 불러오는데 실패했습니다", 
  description = "잠시 후 다시 시도해주세요",
  onRetry = () => window.location.reload()
}: ErrorScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold mb-2">{message}</h2>
        <p className="text-gray-600">{description}</p>
        <button 
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          새로고침
        </button>
      </div>
    </div>
  )
} 
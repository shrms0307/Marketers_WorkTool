'use client'

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function BlogAnalysisError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-sm space-y-6 p-4 text-center">
        <h1 className="text-3xl font-bold text-destructive">데이터 조회 실패</h1>
        <p className="text-gray-500">
          블로그 데이터를 가져오는데 실패했습니다.<br />
          잠시 후 다시 시도해주세요.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => router.back()}>
            이전으로
          </Button>
          <Button onClick={() => reset()}>
            다시 시도
          </Button>
        </div>
      </div>
    </div>
  )
} 
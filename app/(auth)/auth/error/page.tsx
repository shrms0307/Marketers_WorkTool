import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AuthError() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-sm space-y-6 p-4 text-center">
        <h1 className="text-3xl font-bold text-destructive">인증 오류</h1>
        <p className="text-gray-500">
          로그인 처리 중 오류가 발생했습니다.<br />
          다시 시도해주세요.
        </p>
        <Button asChild>
          <Link href="/auth/login">
            로그인으로 돌아가기
          </Link>
        </Button>
      </div>
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { createClient } from '@/lib/supabase/client'
import { registerUser } from './actions'

export default function AgreementPage() {
  const [isAgreed, setIsAgreed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // 세션 체크 및 리다이렉트
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          // 세션 없으면 로그인 페이지로 이동 시 토스트
          toast({
             title: "세션 만료",
             description: "다시 로그인해주세요.",
             variant: "destructive",
          });
          router.push('/login');
          return;
        }

        // 메타데이터에서 서비스 승인 상태 확인
        if (session.user.user_metadata?.smartservice_approved) {
          // 이미 승인되었으면 메인 페이지로 이동 시 토스트
           toast({
               title: "서비스 이용 가능",
               description: "메인 페이지로 이동합니다.",
           });
          router.push('/');
          return;
        }

        // 세션 있고 미승인 상태이면 로딩 해제
        setIsLoading(false);

      } catch (error) {
        console.error('Session check error:', error);
        toast({
          variant: "destructive",
          title: "오류",
          description: "사용자 확인 중 오류가 발생했습니다."
        });
        console.log('사용자 확인 중 오류가 발생했습니다.', error); // 디버그용 로그 제거
        // 오류 발생 시 로그인 페이지로 이동 시 토스트
        toast({
            title: "오류 발생",
            description: "로그인 페이지로 이동합니다.",
            variant: "destructive",
        });
        router.push('/login');
      }
    };

    checkSession();
  }, [router, supabase, toast]);

  const handleAgree = async () => {
    if (!isAgreed) {
      toast({
        variant: "destructive",
        title: "동의 필요",
        description: "서비스 이용을 위해 동의가 필요합니다."
      });
      return;
    }

    setIsLoading(true); // 동의 처리 중 로딩 시작
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
         // 다시 한번 세션 확인, 없으면 에러
         throw new Error('로그인이 필요합니다.')
      }

      // Server Action 호출 (사용자 등록/업데이트 및 메타데이터 업데이트)
      await registerUser(
        session.user.id,
        session.user.email!,
        session.user.user_metadata.name
      )

      // Server Action 성공 후 클라이언트 세션 갱신
      await supabase.auth.refreshSession()

      // 등록 완료 및 메인 페이지 이동 토스트
      toast({
        title: "등록 완료",
        description: "서비스 이용이 가능합니다. 메인 페이지로 이동합니다."
      })

      // 메인 페이지로 이동
      router.push('/')

    } catch (error) {
      console.error('Agreement error:', error)
      toast({
        variant: "destructive",
        title: "오류",
        description: error instanceof Error ? error.message : "사용자 등록 중 오류가 발생했습니다."
      })
      setIsLoading(false) // 에러 발생 시 로딩 해제
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>확인중...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>서비스 이용 동의</CardTitle>
          <CardDescription>
            스마트서비스 이용을 위해 아래 내용에 동의해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              1. 수집하는 개인정보 항목<br />
              - 이메일 주소<br />
              - 이름<br />
              - 프로필 정보<br /><br />
              2. 수집 목적<br />
              - 서비스 이용자 식별<br />
              - 서비스 기능 제공<br />
              - 개인정보 보호<br /><br />
              3. 보유 기간<br />
              - 회원 탈퇴 이후 즉시 파기
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="terms" 
              checked={isAgreed}
              onCheckedChange={(checked) => setIsAgreed(checked as boolean)}
              disabled={isLoading}
            />
            <Label htmlFor="terms">
              위 내용에 동의합니다
            </Label>
          </div>
          <Button 
            className="w-full" 
            onClick={handleAgree}
            disabled={isLoading || !isAgreed}
          >
            {isLoading ? "처리중..." : "동의하고 시작하기"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 
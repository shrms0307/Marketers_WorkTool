// 슈퍼베이스에서 사용자 정보를 가져오는 훅
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
// Supabase User 타입 임포트
import { User } from '@supabase/supabase-js'

export const useUser = () => {
  // 상태 타입을 User | null로 명시
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()

    // 세션 변경 이벤트 리스너 추가 (선택 사항이지만 실시간 업데이트에 유용)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // console.log(event, session); // 디버그용
      setUser(session?.user ?? null);
    });

    // 클린업 함수에서 리스너 구독 해제
    return () => {
      subscription?.unsubscribe();
    };

  }, [supabase]) // 의존성 배열

  return user
}
'use server'

import { supabase } from '@/lib/supabase'
import { withConnection } from '@/lib/db'
import { serverClient } from '@/lib/supabase/server'
import { z } from 'zod'

// IP 주소 변환 함수
async function normalizeIpAddress(ip: string, email?: string): Promise<string> {
    // ::ffff: 접두사 제거
    const cleanIp = ip.replace(/^::ffff:/, '')

    // 한샘가온 사용자 확인
    if (email) {
        const { data: userData } = await supabase
            .from('user')
            .select('company')
            .eq('email', email)
            .single()

        if (userData?.company === '한샘가온') {
            return '121.166.75.182'
        }
    }
    
    // localhost 관련 IP들
    if (cleanIp === '::1' || cleanIp === 'localhost' || cleanIp === '127.0.0.1') {
        return '106.101.131.24'
    }
    
    // 내부망 IP (192.168.x.x)
    if (cleanIp.startsWith('192.168.')) {
        return '106.101.131.24'
    }

    // 그 외의 경우는 정리된 IP 반환
    return cleanIp
}

// 로그인 히스토리 기록 함수
async function recordLoginHistory(
  supabase_uid: string, 
  email: string, 
  login_ip: string,
  user_agent: string,
  login_status: boolean,
  failure_reason?: string
) {
  // IP 주소 정규화
  const normalizedIp = await normalizeIpAddress(login_ip, email)

  return withConnection(async (connection) => {
    await connection.execute(
      `INSERT INTO login_history 
       (supabase_uid, email, login_ip, user_agent, login_status, failure_reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [supabase_uid, email, normalizedIp, user_agent, login_status, failure_reason || '']
    );
  });
}

const loginSchema = z.object({
  email: z.string().email({ message: "유효한 이메일 주소를 입력해주세요." }),
  password: z.string().min(6, { message: "비밀번호는 최소 6자 이상이어야 합니다." }),
});

export async function login(formData: FormData): Promise<{ success: boolean; message?: string }> {
  const supabase = await serverClient()

  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  try {
    // Zod를 사용하여 입력 데이터 유효성 검사
    const validatedData = loginSchema.parse(data);

    // Supabase Server Action 클라이언트를 사용하여 로그인 처리
    const { error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
       console.error('Supabase login error:', error.message);
      // Supabase 에러 메시지를 클라이언트에 전달
      return { success: false, message: error.message };
    }

    // 로그인 성공 시
    // Server Action에서 직접 redirect 할 수도 있지만,
    // 클라이언트 컴포넌트에서 router.push를 사용하도록 하려면 성공 응답만 반환
    console.log('Login successful via Server Action.');
    return { success: true };

  } catch (error) {
    console.error('Login Server Action error:', error);
    // Zod 유효성 검사 오류 또는 기타 오류 처리
    if (error instanceof z.ZodError) {
      // Zod 오류 메시지를 구조화하여 클라이언트에 전달
      return { success: false, message: error.errors[0].message || '입력 형식이 올바르지 않습니다.' };
    }
    return { success: false, message: (error as Error).message || '알 수 없는 로그인 오류가 발생했습니다.' };
  }
}

export async function resetUserPassword(email: string, newPassword: string) {
    try {
        const { error } = await supabase.rpc('reset_user_password', {
            user_email: email,
            new_password: newPassword
        });

        if (error) throw error;

        return { 
            success: true, 
            message: "비밀번호가 성공적으로 재설정되었습니다." 
        };

    } catch (error) {
        console.error('비밀번호 재설정 중 오류:', error);
        return { 
            success: false, 
            message: "비밀번호 재설정 중 오류가 발생했습니다." 
        };
    }
}

// SQL 함수 생성 쿼리 (한 번만 실행하면 됨)
/*
CREATE OR REPLACE FUNCTION reset_user_password(user_email TEXT, new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf')) 
    WHERE email = user_email;
END;
$$;
*/

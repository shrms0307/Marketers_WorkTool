'use server'

import { withConnection } from "@/lib/db"
import { serverClient } from "@/lib/supabase/server"

export async function registerUser(supabase_uid: string, email: string, name: string) {
  return withConnection(async (connection) => {
    try {
      console.log('Register attempt:', { supabase_uid, email, name })
      
      // 이미 존재하는지 확인
      const [rows] = await connection.execute<any[]>(
        'SELECT id FROM users WHERE supabase_uid = ?',
        [supabase_uid]
      )

      // 이미 존재하면 성공으로 처리
      if (rows.length > 0) {
        console.log('User already exists:', supabase_uid)
        return { success: true }
      }

      // 새 사용자 등록
      console.log('Creating new user...')
      await connection.execute(`
        INSERT INTO users (
          supabase_uid, 
          email, 
          name, 
          role,
          last_login_at,
          api_call_count,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 'user', NOW(), 0, NOW(), NOW())
      `, [supabase_uid, email, name])

      // Supabase 메타데이터 업데이트
      const supabase = await serverClient()
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          smartservice_approved: true,
          approved_at: new Date().toISOString()
        }
      })

      if (updateError) throw updateError

      console.log('User created successfully')
      return { success: true }

    } catch (error) {
      console.error('User registration error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw new Error('사용자 등록에 실패했습니다.')
    }
  })
} 
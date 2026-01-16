'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { useToast } from '@/hooks/use-toast'


interface AuthContextType {
  user: User | null
  isLoading: boolean
  role: 'user' | 'admin' | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  role: null
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'user' | 'admin' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('AuthProvider session:', session)

        if (session?.user) {
          setUser(session.user)
          try {
            // const userRole = await getUserRole()
            // console.log('User role:', userRole)
            // setRole(userRole)
          } catch (roleError) {
            console.error('Role fetch error:', roleError)
            toast({
              variant: "destructive",
              title: "오류",
              description: "사용자 정보를 가져오는데 실패했습니다."
            })
          }
        }
      } catch (error) {
        console.error('Auth error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const userRole = await getUserRole()
        setRole(userRole)
      } else {
        setUser(null)
        setRole(null)
      }
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, isLoading, role }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 
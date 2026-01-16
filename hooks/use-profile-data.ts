import { useQuery } from '@tanstack/react-query'
import { getProfileData } from '@/app/actions/profile'
import type { ProfileData } from '@/types/profile'

export function useProfileData(address: string | null) {
  return useQuery<ProfileData>({
    queryKey: ['profile-data', address],
    queryFn: () => getProfileData(address!),
    enabled: !!address, // address가 있을 때만 쿼리 실행
    staleTime: 1000 * 60 * 5,
  })
} 
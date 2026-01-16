'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function TestPage() {
  const [keyword, setKeyword] = useState('')
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!keyword) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/proxy/naver/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationName: "getSearchParticipatedKeywords",
          variables: {
            input: {
              sort: "VIEW_COUNT",
              ownerId: 132886994721952,
              keyword: keyword
            },
            paging: { limit: 20 }
          },
          query: `query getSearchParticipatedKeywords($input: ParticipatedKeywordsInput!, $paging: PagingInput!) {
            searchParticipatedKeywords(input: $input, paging: $paging) {
              items {
                id
                name
                categoryId
                rank
                viewCount
                challengeCount
                lastChallengedAt
                contents {
                  id
                  title
                  description
                  url
                  thumbnailUrl
                  viewCount
                  likeCount
                  createdAt
                }
                __typename
              }
              paging {
                nextCursor
                total
                __typename
              }
              __typename
            }
          }`
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('검색 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-8 space-y-4">
      <h1 className="text-2xl font-bold">키워드 ID 검색</h1>
      
      <div className="flex gap-2">
        <Input
          placeholder="키워드를 입력하세요"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="max-w-xl"
        />
        <Button 
          onClick={handleSearch}
          disabled={isLoading || !keyword}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              검색 중...
            </>
          ) : (
            '검색'
          )}
        </Button>
      </div>

      {error && (
        <div className="text-red-500">
          {error}
        </div>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>검색 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-4 rounded-lg overflow-auto bg-gray-100 text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 
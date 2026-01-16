'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface CompleteExposureProps {
  keywords: {
    id: number
    keyword: string
    created_at: string
  }[]
  exposureImages: {
    keyword: string
    imageUrl: string
    ranks: number[]
  }[]
}

export function CompleteExposure({ keywords, exposureImages }: CompleteExposureProps) {
  // 순위를 문자열로 변환 (1,3,5 -> "1,3,5위")
  const formatRanks = (ranks: number[]) => {
    return ranks.length > 0 ? ranks.join(',') + '위' : '-'
  }

  // 키워드에 해당하는 이미지 정보 찾기
  const getImageInfo = (keyword: string) => {
    return exposureImages.find(img => img.keyword === keyword)
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-2rem)]">
      {/* 좌측 키워드 테이블 */}
      <div className="w-[300px] flex-shrink-0">
        <Card className="h-full">
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>키워드</TableHead>
                  <TableHead>순위</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((keyword) => {
                  const imageInfo = getImageInfo(keyword.keyword)
                  return (
                    <TableRow key={keyword.id}>
                      <TableCell>{keyword.keyword}</TableCell>
                      <TableCell>{imageInfo ? formatRanks(imageInfo.ranks) : '-'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 우측 이미지 영역 - 가로 스크롤 */}
      <div className="flex-1">
        <Card className="h-full">
          <CardContent className="p-4 h-full">
            <ScrollArea className="w-[56vw]">
              <div className="flex gap-4 pb-4">
                {keywords.map((keyword) => {
                  const imageInfo = getImageInfo(keyword.keyword)
                  return (
                    <div key={keyword.id} className="flex-none w-[400px]">
                      <div className="mb-4 flex justify-between items-center">
                        <h3 className="text-lg font-semibold">{keyword.keyword}</h3>
                        <span>{imageInfo ? formatRanks(imageInfo.ranks) : '-'}</span>
                      </div>
                      <div className="h-[calc(100vh-14rem)] bg-gray-100 rounded-lg overflow-auto">
                        {imageInfo?.imageUrl ? (
                          <img 
                            src={imageInfo.imageUrl}
                            alt={`${keyword.keyword} 순위 이미지`}
                            className="w-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            순위가 기록된적이 없습니다.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
'use client'

import { useState, useCallback, useEffect, useMemo } from "react"
import * as XLSX from 'xlsx'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/blog/ranking/data-table"
import { BlogRankingData } from "@/components/blog/types"
import { columns } from "@/components/blog/ranking/columns"
import { useNavbar } from "@/components/layout/navbar-provider"
import { Table as TableInstance } from "@tanstack/react-table"
import { useBlogRankings } from '@/hooks/use-blog-rankings'
import { CreateProjectDialog } from "@/components/project/create-project-dialog"
import { useSelectedBloggers } from "@/store/use-selected-bloggers"

export default function HomePage() {
  const { setTitle } = useNavbar()
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(["전체"]))
  const [allCategories, setAllCategories] = useState<string[]>(["전체"])
  const [table, setTable] = useState<TableInstance<any> | null>(null)
  const { 
    selectedRows, 
    updateSelection, 
    setCurrentPage,
    setPageCount
  } = useSelectedBloggers()

  // 전체 데이터를 한 번만 가져오기
  const { data: allRankings, isLoading } = useBlogRankings("전체")

  // 선택된 카테고리에 따라 데이터 필터링
  const filteredRankings = useMemo(() => {
    if (!allRankings) return []
    
    let filtered = selectedCategories.has("전체") 
      ? allRankings
      : allRankings.filter(blogger => selectedCategories.has(blogger.category))

    // 선택된 블로거들 처리를 별도의 배열로 관리
    const selectedBloggerIds = Object.keys(selectedRows).filter(id => selectedRows[id])
    const selectedBloggers = selectedBloggerIds.length > 0
      ? allRankings.filter(blogger => selectedBloggerIds.includes(blogger.inf_blogid))
      : []

    // 현재 필터링된 결과에 없는 선택된 블로거만 추가
    const additionalBloggers = selectedBloggers.filter(
      blogger => !filtered.some(f => f.inf_blogid === blogger.inf_blogid)
    )
    
    return filtered.concat(additionalBloggers)
  }, [allRankings, selectedCategories])

  // 선택 상태 변경을 별도로 처리
  const handleSelectionChange = useCallback((table: TableInstance<any>) => {
    const currentSelection = table.getState().rowSelection
    if (JSON.stringify(currentSelection) !== JSON.stringify(selectedRows)) {
      updateSelection(currentSelection)
    }
  }, [selectedRows, updateSelection])

  // 페이지 타이틀 설정
  useEffect(() => {
    setTitle('블로그 분석')
  }, [setTitle])

  // 카테고리 목록 최초 1회만 설정
  useEffect(() => {
    if (allRankings?.length && allCategories.length === 1) {
      const uniqueCategories = new Set(allRankings.map(item => item.category))
      const sortedCategories = Array.from(uniqueCategories).sort()
      setAllCategories(["전체", ...sortedCategories])
    }
  }, [allRankings, allCategories.length])

  const handleCategoryClick = useCallback((category: string, ctrlKey: boolean) => {
    setSelectedCategories(prev => {
      const newSelection = new Set(prev)
      
      // 전체 카테고리 클릭 
      if (category === "전체") {
        return new Set(["전체"])
      }

      // Ctrl 키를 누르지 않은 경우 단일 선택
      if (!ctrlKey) {
        return new Set([category])
      }

      // Ctrl 키를 누른 경우 다중 선택
      if (newSelection.has(category)) {
        // 선택 해제 (최소 하나는 선택되어야 함)
        if (newSelection.size > 1) {
          newSelection.delete(category)
        }
      } else {
        // 새로운 카테고리 선택 시 '전체' 제거
        newSelection.delete("전체")
        newSelection.add(category)
      }

      return newSelection
    })
  }, [])

  // 검색어에 따른 카테고리 자동 선택
  const handleSearch = (searchTerm: string) => {
    if (!allRankings) return;
    
    if (!searchTerm) {
      // 검색어가 없으면 '전체' 카테고리만 선택
      setSelectedCategories(new Set(["전체"]))
      return
    }

    // 검색어에 해당하는 블로거들 찾기
    const matchedBloggers = allRankings.filter(blogger => 
      blogger.inf_nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blogger.inf_blogid.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // 검색 결과가 있는 경우에만 해당 카테고리들 선택
    if (matchedBloggers.length > 0) {
      const matchedCategories = new Set(matchedBloggers.map(blogger => blogger.category))
      setSelectedCategories(matchedCategories)
    } else {
      // 검색 결과가 없으면 카테고리 선택 초기화
      setSelectedCategories(new Set())
    }
  }

  return (
    <div className="flex-1 p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="text-sm text-muted-foreground mb-2 w-full">
              Ctrl + 클릭으로 다중 선택이 가능합니다
            </div>
            {allCategories.map((category) => (
              <Button
                key={category}
                variant={selectedCategories.has(category) ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleCategoryClick(category, e.ctrlKey)}
                className={`
                  ${selectedCategories.has(category)
                    ? "bg-[#58c2ec] text-white hover:bg-[#58c2ec]/90 dark:bg-[#58c2ec] dark:text-white dark:hover:bg-[#58c2ec]/90" 
                    : "hover:bg-accent dark:text-white dark:bg-[#262626] dark:hover:bg-[#2e2e2e]"
                  }
                `}
              >
                {category}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns} 
            data={filteredRankings} 
            onSearch={handleSearch}
            loading={isLoading}
            onTableChange={handleSelectionChange}
            getRowId={(row) => row.inf_blogid}
          />
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground text-center mt-4">
      회원탈퇴 및 서비스 문의는 account1@the-viral.co.kr 로 요청해주시기 바랍니다.
      </p>
    </div>
  )
} 0
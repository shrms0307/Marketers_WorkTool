'use client'

import { useState, useEffect } from 'react'
import { ProjectList } from "@/components/project/project-list"
import { useNavbar } from "@/components/layout/navbar-provider"

export default function ProjectsPage() {
  const { setTitle } = useNavbar()

  useEffect(() => {
    setTitle('프로젝트 현황')
  }, [setTitle])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">프로젝트 현황</h2>
      </div>
      <ProjectList />
    </div>
  )
} 
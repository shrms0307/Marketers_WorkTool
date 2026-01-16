export function canEditProject(project: ProjectWithStats, userId?: string) {
  if (!userId) return false
  return project.createdBy === userId
} 
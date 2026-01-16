'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { ko } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { getProjects, createProject, getProjectBloggers, getBloggerInfo, addBloggersToProject, type Blogger } from "@/app/(main)/projects/actions"
import { ProjectWithStats } from "@/types/project"
import { createClient } from '@/lib/supabase/client'
import { useSelectedBloggers } from "@/store/use-selected-bloggers"

interface CreateProjectDialogProps {
  selectedBloggers: string[]
  onSuccess: () => void
}

interface ProjectBloggerList {
  existing: Blogger[];
  new: Blogger[];
  duplicates: string[];
}

// 새 프로젝트 생성 컴포넌트
function NewProjectDialog({ 
  open, 
  onOpenChange,
  selectedBloggers,
  onSuccess 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedBloggers: string[]
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [targetPosts, setTargetPosts] = useState("")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !startDate || !endDate || !targetPosts) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "모든 필드를 입력해주세요."
      })
      return
    }

    setLoading(true)
    try {
      const { projectId } = await createProject({
        name,
        startDate,
        endDate,
        targetPosts: Number(targetPosts),
        bloggerIds: selectedBloggers
      })

      toast({
        title: "성공",
        description: "프로젝트가 생성되었습니다.",
        duration: Infinity,
        action: (
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => {
                window.location.href = `/projects/${projectId}`
              }}
            >
              이동
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                toast({
                  title: "성공",
                  description: "프로젝트가 생성되었습니다.",
                  duration: 3000,
                })
              }}
            >
              취소
            </Button>
          </div>
        ),
      })
      
      setName("")
      setStartDate(undefined)
      setEndDate(undefined)
      setTargetPosts("")
      
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('프로젝트 생성 실패:', error)
      toast({
        variant: "destructive",
        title: "오류",
        description: error instanceof Error ? error.message : "프로젝트 생성 중 오류가 발생했습니다."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 프로젝트 생성</DialogTitle>
          <DialogDescription>
          ※ 프로젝트 정보는 추후 수정 가능합니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">프로젝트명</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트명을 입력하세요"
            />
          </div>
          <div className="grid gap-2">
            <Label>시작일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP', { locale: ko }) : "시작일 선택"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label>종료일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP', { locale: ko }) : "종료일 선택"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="targetPosts">목표 포스팅 수</Label>
            <Input
              id="targetPosts"
              type="number"
              value={targetPosts}
              onChange={(e) => setTargetPosts(e.target.value)}
              placeholder="목표 포스팅 수를 입력하세요"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              생성
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 메로거 목록 컴포넌트
function BloggerList({ 
  title, 
  bloggers, 
  isDuplicate 
}: { 
  title: string;
  bloggers: Blogger[];
  isDuplicate?: (id: string) => boolean;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title} ({bloggers.length}명)</h3>
      <div className="space-y-1 max-h-[360px] overflow-y-auto pr-2">
        {bloggers.map(blogger => (
          <div 
            key={blogger.inf_blogid}
            className={cn(
              "flex items-center gap-2 p-2 rounded-md",
              isDuplicate?.(blogger.inf_blogid) && "text-muted-foreground bg-muted"
            )}
          >
            {blogger.inf_profileimage && (
              <img 
                src={blogger.inf_profileimage} 
                alt="" 
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="truncate">{blogger.inf_nickname}</span>
            {isDuplicate?.(blogger.inf_blogid) && (
              <span className="text-xs text-yellow-600 shrink-0">이미 등록됨</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// 메인 컴포넌트
export function CreateProjectDialog({ selectedBloggers, onSuccess }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [bloggerList, setBloggerList] = useState<ProjectBloggerList>({
    existing: [],
    new: [],
    duplicates: []
  })
  const { toast } = useToast()
  const { selectedRows, resetSelectedRows } = useSelectedBloggers()

  // 사용자 정보 가져오기
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user)
    }
    getUser()
  }, [supabase])

  // 내 프로젝트 목록 가져오기
  useEffect(() => {
    const fetchProjects = async () => {
      if (user) {
        const { projects } = await getProjects({ 
          createdBy: user.id,
          status: 'active'  // 진행중인 프로젝트만
        })
        setProjects(projects)
      }
    }
    fetchProjects()
  }, [user])

  // 프로젝트 선택시 기존 블로거 목록 가져오기
  useEffect(() => {
    if (selectedProject) {
      const fetchProjectBloggers = async () => {
        try {
          // 기존 프로젝트의 블로거 목록 가져오기
          const existingBloggers = await getProjectBloggers(selectedProject);
          
          // 새로 추가될 블로거들의 정보 져오기
          const newBloggers = await getBloggerInfo(selectedBloggers);
          
          // 중복 체크
          const duplicateIds = selectedBloggers.filter(id => 
            existingBloggers.some(b => b.inf_blogid === id)
          );

          setBloggerList({
            existing: existingBloggers,
            new: newBloggers,
            duplicates: duplicateIds
          });
        } catch (error) {
          console.error('블로거 목록 조회 실패:', error);
        }
      };
      
      fetchProjectBloggers();
    }
  }, [selectedProject, selectedBloggers]);

  const handleSave = async () => {
    if (!selectedProject) return

    try {
      // 중복을 제외한 블로거들만 프로젝트에 추가
      const { added } = await addBloggersToProject(
        selectedProject, 
        selectedBloggers.filter(id => !bloggerList.duplicates.includes(id))
      );

      toast({
        title: "성공",
        description: `${added}명의 인플루언서가 추가되었습니다.`
      });

      setOpen(false);
      resetSelectedRows();
      onSuccess();
    } catch (error) {
      console.error('블로거 추가 실패:', error);
      toast({
        variant: "destructive",
        title: "오류",
        description: error instanceof Error ? error.message : "인플루언서 추가 중 오류가 발생했습니다."
      });
    }
  }

  return (
    <>
      <Dialog 
        open={open} 
        onOpenChange={setOpen}
      >
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            disabled={selectedBloggers.length === 0}
            title={selectedBloggers.length === 0 ? "블로거를 선택해주세요" : ""}
          >
            인플루언서 저장
          </Button>
        </DialogTrigger>
        <DialogContent className={cn(
          "transition-all duration-300",
          selectedProject ? "max-w-[800px]" : "max-w-[400px]"
        )}>
          <DialogHeader>
            <DialogTitle>인플루언서 저장</DialogTitle>
            <DialogDescription>
              {selectedProject ? 
                "선택한 프로젝트에 인플루언서를 추가합니다." : 
                "인플루언서를 추가할 프로젝트를 선택해주세요."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Select 
                value={selectedProject} 
                onValueChange={setSelectedProject}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="프로젝트 선택" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  setOpen(false)
                  setNewProjectOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {selectedProject ? (
              <>
                <div className="grid grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2 border rounded-lg p-4">
                    <BloggerList 
                      title="현재 인플루언서"
                      bloggers={bloggerList.existing}
                    />
                  </div>
                  <div className="space-y-2 border rounded-lg p-4">
                    <BloggerList 
                      title="추가될 인플루언서"
                      bloggers={bloggerList.new}
                      isDuplicate={(id) => bloggerList.duplicates.includes(id)}
                    />
                  </div>
                </div>

                {bloggerList.duplicates.length > 0 && (
                  <div className="text-sm text-yellow-600 text-center">
                    * 이미 등록된 인플루언서는 제외하고 저장됩니다.
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-yellow-600 text-center">
                * 프로젝트를 선택해주세요.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {selectedProject ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!selectedProject}
                  >
                    저장
                  </Button>
                </>
              ) : (
                <div className="w-full flex justify-center">
                  <Button
                    onClick={() => {
                      setOpen(false)
                      setNewProjectOpen(true)
                    }}
                  >
                    새로 만들기
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <NewProjectDialog 
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        selectedBloggers={selectedBloggers}
        onSuccess={() => {
          onSuccess()
          if (user) {
            getProjects({ createdBy: user.id, status: 'active' })
              .then(({ projects }) => setProjects(projects))
          }
        }}
      />
    </>
  )
} 
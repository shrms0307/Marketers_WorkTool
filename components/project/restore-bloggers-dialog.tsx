'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"

interface RestoreBloggersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rejectedBloggers: Array<{
    inf_blogid: string
    inf_nickname: string
  }>
  onConfirm: (bloggerIds: string[]) => void
}

export function RestoreBloggersDialog({
  open,
  onOpenChange,
  rejectedBloggers,
  onConfirm
}: RestoreBloggersDialogProps) {
  const [selectedBloggers, setSelectedBloggers] = useState<Set<string>>(new Set())

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedBloggers(new Set(rejectedBloggers.map(b => b.inf_blogid)))
    } else {
      setSelectedBloggers(new Set())
    }
  }

  const handleToggle = (bloggerId: string) => {
    const newSelection = new Set(selectedBloggers)
    if (newSelection.has(bloggerId)) {
      newSelection.delete(bloggerId)
    } else {
      newSelection.add(bloggerId)
    }
    setSelectedBloggers(newSelection)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>제거된 블로거 복구</DialogTitle>
          <DialogDescription>
            복구할 블로거를 선택해주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center space-x-2 pb-4">
            <Checkbox 
              id="select-all"
              checked={selectedBloggers.size === rejectedBloggers.length}
              onCheckedChange={handleToggleAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              전체 선택
            </label>
          </div>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {rejectedBloggers.map((blogger) => (
                <div key={blogger.inf_blogid} className="flex items-center space-x-2">
                  <Checkbox
                    id={blogger.inf_blogid}
                    checked={selectedBloggers.has(blogger.inf_blogid)}
                    onCheckedChange={() => handleToggle(blogger.inf_blogid)}
                  />
                  <label htmlFor={blogger.inf_blogid} className="flex-1 text-sm">
                    <span className="font-medium">{blogger.inf_nickname}</span>
                    <span className="text-muted-foreground ml-2">
                      ({blogger.inf_blogid})
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button 
            onClick={() => {
              onConfirm(Array.from(selectedBloggers))
              onOpenChange(false)
              setSelectedBloggers(new Set())
            }}
            disabled={selectedBloggers.size === 0}
          >
            복구
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
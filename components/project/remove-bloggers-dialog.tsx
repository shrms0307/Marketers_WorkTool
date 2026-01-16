'use client'

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

interface RemoveBloggersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedBloggers: Array<{
    inf_blogid: string
    inf_nickname: string
  }>
  onConfirm: () => void
}

export function RemoveBloggersDialog({
  open,
  onOpenChange,
  selectedBloggers,
  onConfirm
}: RemoveBloggersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>블로거 제거</DialogTitle>
          <DialogDescription>
            선택한 블로거를 프로젝트에서 제거하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[200px] mt-4">
          <div className="space-y-2">
            {selectedBloggers.map((blogger) => (
              <div key={blogger.inf_blogid} className="flex items-center gap-2">
                <span>• {blogger.inf_nickname}</span>
                <span className="text-xs text-muted-foreground">
                  ({blogger.inf_blogid})
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            제거
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
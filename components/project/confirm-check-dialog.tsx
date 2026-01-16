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

interface ConfirmCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
}

export function ConfirmCheckDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "담당자 확인",
  description = "담당자 확인을 체크하시겠습니까?"
}: ConfirmCheckDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button 
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
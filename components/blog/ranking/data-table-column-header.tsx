"use client"

import { Column } from "@tanstack/react-table"
import { ChevronsUpDown, EyeOff, SortAsc, SortDesc, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
  description?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  description,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <div className={cn("flex items-center gap-0.5", className)}>
        <span>{title}</span>
        {description && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                >
                  <span>{title}</span>
                  {description && (
                    <HelpCircle className="ml-0.5 h-4 w-4 text-muted-foreground" />
                  )}
                  {column.getIsSorted() === "desc" ? (
                    <SortDesc className="ml-0.5 h-4 w-4" />
                  ) : column.getIsSorted() === "asc" ? (
                    <SortAsc className="ml-0.5 h-4 w-4" />
                  ) : (
                    <ChevronsUpDown className="ml-0.5 h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {description && (
              <TooltipContent>
                <p>{description}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <SortAsc className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            오름차순
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <SortDesc className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            내림차순
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 
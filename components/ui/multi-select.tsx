'use client'

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface MultiSelectProps {
  options: { id: string; name: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const handleSelectAll = () => {
    onChange(options.map((opt) => opt.id))
  }

  const handleClearAll = () => {
    onChange([])
  }

  const selectedNames = options
    .filter((opt) => selected.includes(opt.id))
    .map((opt) => opt.name)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <div className="flex flex-wrap gap-1 flex-1 mr-2">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selected.length <= 3 ? (
              selectedNames.map((name) => (
                <Badge
                  key={name}
                  variant="secondary"
                  className="mr-1"
                >
                  {name}
                </Badge>
              ))
            ) : (
              <span className="text-sm">
                {selected.length} selected
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-2 border-b flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs h-7"
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs h-7"
          >
            Clear All
          </Button>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {options.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(option.id)}
                onCheckedChange={() => handleToggle(option.id)}
              />
              <span className="text-sm flex-1">{option.name}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="p-2 border-t text-xs text-muted-foreground">
            {selected.length} of {options.length} selected
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

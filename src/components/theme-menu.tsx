"use client"

import * as React from "react"
import { Sun, Moon, Laptop } from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

const themes = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Laptop },
] as const

interface ThemeMenuProps {
  variant?: 'dropdown' | 'buttons'
}

export function ThemeMenu({ variant = 'dropdown' }: ThemeMenuProps) {
  const { setTheme, theme } = useTheme()
  const tTheme = useTranslations('theme')

  if (variant === 'buttons') {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          {tTheme('theme')}
        </h3>
        <div className="space-y-2">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            return (
              <Button
                key={themeOption.value}
                variant={theme === themeOption.value ? "secondary" : "ghost"}
                onClick={() => setTheme(themeOption.value)}
                className="w-full justify-start gap-3"
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{tTheme(themeOption.value)}</span>
                {theme === themeOption.value && (
                  <div className="ml-auto h-2 w-2 bg-primary rounded-full" />
                )}
              </Button>
            );
          })}
        </div>
      </div>
    )
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center gap-3">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span>{tTheme('theme')}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className={cn(
                "flex items-center gap-3",
                theme === themeOption.value && "bg-accent text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tTheme(themeOption.value)}</span>
              {theme === themeOption.value && (
                <div className="ml-auto h-2 w-2 bg-primary rounded-full" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Chart Container
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: Record<string, unknown>
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
  }
>(({ className, config, children, ...props }, ref) => {
  const id = React.useId()
  
  return (
    <>
      <style>
        {`[data-chart="${id}"] {
          ${Object.entries(config || {})
            .map(([key, value]) => {
              if (typeof value === 'object' && value !== null && 'color' in value) {
                return `--color-${key}: ${value.color};`
              }
              return ''
            })
            .filter(Boolean)
            .join('\n')}
        }`}
      </style>
      <div
        data-chart={id}
        ref={ref}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/20 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </>
  )
})
ChartContainer.displayName = "Chart"

// Chart Tooltip
const ChartTooltip = RechartsPrimitive.Tooltip

// Chart Tooltip Content
interface TooltipPayloadItem {
  dataKey?: string
  name?: string
  value?: string | number
  color?: string
  payload?: Record<string, unknown>
}

interface ChartTooltipContentProps extends React.ComponentProps<"div"> {
  active?: boolean
  payload?: Array<TooltipPayloadItem>
  label?: string
  labelFormatter?: (value: unknown, payload: TooltipPayloadItem[]) => React.ReactNode
  formatter?: (value: unknown, name: unknown, item: TooltipPayloadItem, index: number, payload: TooltipPayloadItem[]) => React.ReactNode
  color?: string
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string
  labelKey?: string
  labelClassName?: string
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      labelKey,
    },
    ref
  ) => {
    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item.dataKey || item.name || "value"}`
      const value = !labelFormatter && item.payload?.[key] ? item.payload[key] : label
      const formattedValue = labelFormatter ? labelFormatter(value, payload) : value

      return (
        <div className={cn("font-medium", labelClassName)}>
          {formattedValue as React.ReactNode}
        </div>
      )
    }, [label, labelFormatter, payload, hideLabel, labelKey, labelClassName])

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {tooltipLabel}
        <div className="grid gap-1.5">
          {payload.map((item: TooltipPayloadItem, index: number) => {
            const indicatorColor = color || item.payload?.fill || item.color

            return (
              <div
                key={item.dataKey || item.name || index}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {!hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                      {
                        "h-2.5 w-2.5": indicator === "dot",
                        "w-1": indicator === "line",
                        "w-0 border-[1.5px] border-dashed bg-transparent":
                          indicator === "dashed",
                        "my-0.5": indicator === "dashed" || indicator === "line",
                      }
                    )}
                    style={
                      {
                        "--color-bg": indicatorColor,
                        "--color-border": indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div
                  className={cn(
                    "flex flex-1 justify-between leading-none",
                    hideIndicator ? "items-end" : "items-center"
                  )}
                >
                  <div className="grid gap-1.5">
                    <span className="text-muted-foreground">
                      {item.name}
                    </span>
                  </div>
                  {item.value && (
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {formatter ? formatter(item.value, item.name, item, index, payload) : item.value}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

// Chart Legend
const ChartLegend = RechartsPrimitive.Legend

// Chart Legend Content
interface LegendPayloadItem {
  value?: string
  dataKey?: string
  color?: string
  payload?: Record<string, unknown>
}

interface ChartLegendContentProps extends React.ComponentProps<"div"> {
  hideIcon?: boolean
  nameKey?: string
  verticalAlign?: "top" | "bottom"
  payload?: Array<LegendPayloadItem>
}

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  ChartLegendContentProps
>(({ className, hideIcon = false, payload = [], verticalAlign = "bottom" }, ref) => {
  if (!payload?.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" && "pb-3",
        className
      )}
    >
      {payload.map((item: LegendPayloadItem) => {
        return (
          <div
            key={item.value}
            className={cn(
              "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
            )}
          >
            {!hideIcon && (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            <span className="text-muted-foreground">
              {item.value}
            </span>
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = "ChartLegendContent"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
}
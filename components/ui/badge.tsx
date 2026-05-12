import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight uppercase transition-colors",
  {
    variants: {
      variant: {
        default: "border-ink/20 bg-ink text-bg",
        secondary: "border-line bg-mute text-ink-soft",
        destructive: "border-danger/30 bg-danger-soft text-danger",
        outline: "border-line text-ink-soft",
        success: "border-ok/30 bg-ok-soft text-ok",
        warning: "border-warn/30 bg-warn-soft text-warn",
        info: "border-info/30 bg-info-soft text-info",
        accent: "border-accent/30 bg-accent-soft text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

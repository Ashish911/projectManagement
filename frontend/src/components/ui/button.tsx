import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/components/lib/utils"

// Sizes and colours follow the ProjoMan design (34px controls, strong border, 8px radius)
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[13.5px] font-medium leading-none transition duration-fast ease-out active:scale-[.97] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-[17px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover",
        destructive:
          "border border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border-strong bg-card text-foreground hover:bg-surface-2",
        secondary:
          "border border-border-strong bg-card text-foreground hover:bg-surface-2",
        ghost: "border border-transparent text-muted-foreground hover:bg-surface-2 hover:text-foreground",
        link: "text-accent-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[34px] px-3",
        sm: "h-7 rounded-md px-2.5 text-[12.5px]",
        lg: "h-10 px-5",
        icon: "size-[34px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

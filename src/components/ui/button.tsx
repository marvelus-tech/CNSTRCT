import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "hud-btn__inner inline-flex items-center justify-center gap-2 rounded-none font-medium uppercase tracking-[0.14em] transition disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-foreground text-white shadow-[0_8px_24px_rgba(28,25,21,0.18)] hover:bg-[#2a2722]",
        outline: "border border-foreground/20 bg-card/80 text-foreground hover:bg-white hover:border-foreground/35",
        ghost: "normal-case tracking-normal bg-transparent text-foreground hover:bg-black/5 shadow-none",
        danger:
          "border border-danger/35 bg-card text-danger shadow-none hover:bg-danger/5 normal-case tracking-normal",
      },
      size: {
        default: "h-11 px-6 text-[11px]",
        lg: "h-12 px-8 text-xs",
        sm: "h-9 px-4 text-[10px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  const frameVariant = variant === "outline" ? "hud-btn-frame--secondary" : variant === "default" ? "hud-btn-frame--primary" : "hud-btn-frame--plain";
  const wantsFull = Boolean(className?.includes("w-full"));
  return (
    <span className={cn("hud-btn-frame", frameVariant, wantsFull && "w-full")}>
      <span className="hud-corner hud-corner--tl" aria-hidden />
      <span className="hud-corner hud-corner--tr" aria-hidden />
      <span className="hud-corner hud-corner--bl" aria-hidden />
      <span className="hud-corner hud-corner--br" aria-hidden />
      <Comp className={cn(buttonVariants({ variant, size }), wantsFull && "w-full", className)} {...props} />
    </span>
  );
}
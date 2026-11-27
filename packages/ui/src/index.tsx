import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
const variants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--editorial-red,#a93632)] text-white hover:bg-[var(--lyor-brand-hover,#8f2d2b)]",
        secondary:
          "bg-[var(--lyor-action,#5b6248)] text-white hover:bg-[var(--editorial-green,#32392c)]",
        outline:
          "border border-[var(--editorial-line,#dedace)] bg-[var(--lyor-surface,#fffdfa)] text-[var(--editorial-ink,#3d3a30)] hover:bg-[var(--editorial-soft,#efeee4)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export function Button({
  asChild = false,
  className,
  variant,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof variants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return (
    <Component className={cn(variants({ variant }), className)} {...props} />
  );
}

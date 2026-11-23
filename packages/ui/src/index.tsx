import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
const variants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#df1f3d] text-white hover:bg-[#bb1430]",
        secondary: "bg-[#f4f2ef] text-[#252824] hover:bg-[#e8e5e1]",
        outline:
          "border border-[#d8d8d2] bg-white text-[#252824] hover:bg-[#f7f7f3]",
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

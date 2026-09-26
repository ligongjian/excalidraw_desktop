import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]";

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-sm",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400",
  secondary:
    "bg-white text-zinc-700 border border-zinc-300 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-white",
  ghost:
    "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
  danger:
    "bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "secondary", size = "md", className = "", ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
        {...rest}
      />
    );
  },
);

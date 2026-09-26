import type { ButtonHTMLAttributes } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function IconButton({ className = "", ...rest }: IconButtonProps) {
  return (
    <button
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 disabled:opacity-50 disabled:cursor-not-allowed dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${className}`}
      {...rest}
    />
  );
}

type StatusBarProps = {
  count: number;
  zoom: number | null;
};

export default function StatusBar({ count, zoom }: StatusBarProps) {
  const pct = zoom != null ? Math.round(zoom * 100) : null;
  return (
    <div className="flex h-7 shrink-0 select-none items-center justify-between border-t border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50 px-3 text-[11px] text-zinc-500 dark:border-zinc-700/80 dark:from-zinc-800 dark:to-zinc-800 dark:text-zinc-400">
      <div className="flex items-center gap-3">
        <span>
          元素 {count}
        </span>
        {pct != null && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.3-4.3M8 11h6" />
            </svg>
            {pct}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden md:inline">空格 拖动画布</span>
        <span className="hidden md:inline">·</span>
        <span>Ctrl+S 保存</span>
      </div>
    </div>
  );
}

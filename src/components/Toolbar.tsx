type ToolbarProps = {
  filename: string | null;
  dirty: boolean;
  theme: "light" | "dark";
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportPng: () => void;
  onExportWebp: () => void;
  onToggleTheme: () => void;
  disabled?: boolean;
};

const btn =
  "inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

export default function Toolbar(p: ToolbarProps) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mr-1 flex min-w-0 items-center gap-2">
        <span
          className={`max-w-[200px] truncate text-sm font-semibold ${
            p.dirty ? "text-amber-600 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-200"
          }`}
          title={p.filename ?? ""}
        >
          {p.filename ?? "未命名画布"}
        </span>
        {p.dirty && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">● 未保存</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className={btn} onClick={p.onNew} disabled={p.disabled}>
          新建
        </button>
        <button className={btn} onClick={p.onOpen} disabled={p.disabled}>
          打开…
        </button>
        <button className={btn} onClick={p.onSave} disabled={p.disabled}>
          保存
        </button>
        <button className={btn} onClick={p.onSaveAs} disabled={p.disabled}>
          另存为…
        </button>
        <button className={btn} onClick={p.onExportPng} disabled={p.disabled}>
          导出 PNG
        </button>
        <button className={btn} onClick={p.onExportWebp} disabled={p.disabled}>
          导出 WebP
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          onClick={p.onToggleTheme}
          title="切换深色/浅色模式"
        >
          {p.theme === "dark" ? "🌙 深色" : "☀️ 浅色"}
        </button>
      </div>
    </div>
  );
}

import { Button } from "./ui/Button";
import {
  FolderOpenIcon,
  ImageIcon,
  MoonIcon,
  PlusIcon,
  SaveAsIcon,
  SaveIcon,
  SunIcon,
} from "./icons";

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

export default function Toolbar(p: ToolbarProps) {
  const name = p.filename ? p.filename.split(/[\\/]/).pop() : "未命名画布";

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-zinc-200/80 bg-white px-2.5 dark:border-zinc-700/80 dark:bg-zinc-900">
      {/* 文件名 + 保存状态 */}
      <div className="flex min-w-0 items-center gap-2 pr-1">
        <span
          className="max-w-[220px] truncate text-[13px] font-semibold text-zinc-800 dark:text-zinc-100"
          title={p.filename ?? ""}
        >
          {name}
        </span>
        {p.dirty ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            未保存
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            已保存
          </span>
        )}
      </div>

      <div className="mx-1 h-5 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700" />

      {/* 文件操作 */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={p.onNew} disabled={p.disabled} title="新建画布">
          <PlusIcon /> 新建
        </Button>
        <Button variant="ghost" size="sm" onClick={p.onOpen} disabled={p.disabled} title="打开画布">
          <FolderOpenIcon /> 打开
        </Button>
        <Button variant="ghost" size="sm" onClick={p.onSave} disabled={p.disabled} title="保存">
          <SaveIcon /> 保存
        </Button>
        <Button variant="ghost" size="sm" onClick={p.onSaveAs} disabled={p.disabled} title="另存为">
          <SaveAsIcon /> 另存为
        </Button>
      </div>

      <div className="mx-1 h-5 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700" />

      {/* 导出 */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={p.onExportPng} disabled={p.disabled} title="导出为 PNG">
          <ImageIcon /> PNG
        </Button>
        <Button variant="ghost" size="sm" onClick={p.onExportWebp} disabled={p.disabled} title="导出为 WebP">
          <ImageIcon /> WebP
        </Button>
      </div>

      <div className="ml-auto flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={p.onToggleTheme}
          title="切换深色/浅色模式"
          className="text-zinc-600 dark:text-zinc-300"
        >
          {p.theme === "dark" ? <SunIcon /> : <MoonIcon />}
          <span className="hidden sm:inline">{p.theme === "dark" ? "浅色" : "深色"}</span>
        </Button>
      </div>
    </div>
  );
}

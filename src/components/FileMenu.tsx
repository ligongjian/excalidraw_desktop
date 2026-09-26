import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  CopyIcon,
  FileTextIcon,
  FolderOpenIcon,
  ImageIcon,
  InfoIcon,
  MenuIcon,
  MoonIcon,
  PlusIcon,
  SaveAsIcon,
  SaveIcon,
  SunIcon,
} from "./icons";

type IconType = ComponentType<{ className?: string }>;

type FileMenuProps = {
  dirty: boolean;
  theme: "light" | "dark";
  disabled?: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportPng: () => void;
  onExportWebp: () => void;
  onExportSvg: () => void;
  onExportPdf: () => void;
  onCopyImage: () => void;
  onCopyJson: () => void;
  onToggleTheme: () => void;
  onAbout: () => void;
};

// 顶部工具栏的操作收敛为这个下拉菜单，挂在标签栏最右侧
export default function FileMenu(p: FileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 点击菜单外关闭；Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const groups: {
    label: string;
    items: {
      icon: IconType;
      label: string;
      shortcut?: string;
      onClick: () => void;
    }[];
  }[] = [
    {
      label: "文件",
      items: [
        { icon: PlusIcon, label: "新建画布", onClick: p.onNew },
        { icon: FolderOpenIcon, label: "打开…", onClick: p.onOpen },
        { icon: SaveIcon, label: "保存", shortcut: "Ctrl+S", onClick: p.onSave },
        {
          icon: SaveAsIcon,
          label: "另存为",
          shortcut: "Ctrl+Shift+S",
          onClick: p.onSaveAs,
        },
      ],
    },
    {
      label: "导出",
      items: [
        { icon: ImageIcon, label: "导出为 PNG", onClick: p.onExportPng },
        { icon: ImageIcon, label: "导出为 WebP", onClick: p.onExportWebp },
        { icon: FileTextIcon, label: "导出为 SVG", onClick: p.onExportSvg },
        { icon: FileTextIcon, label: "导出为 PDF", onClick: p.onExportPdf },
      ],
    },
    {
      label: "复制",
      items: [
        { icon: CopyIcon, label: "复制为图片", onClick: p.onCopyImage },
        { icon: CopyIcon, label: "复制为 JSON", onClick: p.onCopyJson },
      ],
    },
    {
      label: "视图",
      items: [
        {
          icon: p.theme === "dark" ? SunIcon : MoonIcon,
          label: p.theme === "dark" ? "切换为浅色" : "切换为深色",
          onClick: p.onToggleTheme,
        },
      ],
    },
    {
      label: "帮助",
      items: [{ icon: InfoIcon, label: "关于…", onClick: p.onAbout }],
    },
  ];

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        title="菜单"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <MenuIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-black/10 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40"
        >
          {/* 保存状态 */}
          <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1">
            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
              保存状态
            </span>
            {p.dirty ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                未保存
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                已保存
              </span>
            )}
          </div>
          <div className="mb-1 h-px bg-zinc-100 dark:bg-zinc-800" />

          {groups.map((g, gi) => (
            <div key={g.label} className="group/menu">
              <div className="px-2.5 pb-0.5 pt-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                {g.label}
              </div>
              {g.items.map((it) => (
                <button
                  key={it.label}
                  role="menuitem"
                  onClick={run(it.onClick)}
                  disabled={p.disabled}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <it.icon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
                  <span className="flex-1">{it.label}</span>
                  {it.shortcut && (
                    <span className="text-[10.5px] text-zinc-400 dark:text-zinc-500">
                      {it.shortcut}
                    </span>
                  )}
                </button>
              ))}
              {gi < groups.length - 1 && (
                <div className="mt-1.5 h-px bg-zinc-100 dark:bg-zinc-800" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

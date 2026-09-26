import { PlusIcon, XIcon } from "./icons";
import FileMenu from "./FileMenu";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";

export type TabData = {
  id: string;
  name: string;
  filePath: string | null;
  dirty: boolean;
  count: number;
  zoom: number | null;
  baseline: string;
  baselineReady: boolean;
  /** 打开文件时传入的初始场景，仅用于该标签首次挂载时初始化画布 */
  initialData?: ExcalidrawInitialDataState;
  /** 从草稿恢复的标签：保持"未保存"提示，直到用户正式保存 */
  restored?: boolean;
};

type TabBarProps = {
  tabs: TabData[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  dirty: boolean;
  theme: "light" | "dark";
  disabled?: boolean;
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

export default function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
  dirty,
  theme,
  disabled,
  onOpen,
  onSave,
  onSaveAs,
  onExportPng,
  onExportWebp,
  onExportSvg,
  onExportPdf,
  onCopyImage,
  onCopyJson,
  onToggleTheme,
  onAbout,
}: TabBarProps) {
  return (
    <div className="flex h-10 shrink-0 items-end gap-1.5 border-b border-zinc-200 bg-zinc-200/40 px-2.5 pt-2 dark:border-zinc-700 dark:bg-zinc-950/60">
      <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.id === activeId;
          return (
            <div
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(t.id)}
              className={`group relative flex h-8 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-t-lg px-3 text-[12.5px] transition-all duration-150 ${
                active
                  ? "border border-b-0 border-zinc-200 bg-white font-semibold text-brand-700 shadow-[0_-1px_2px_rgba(0,0,0,0.04)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-brand-300"
                  : "border border-transparent text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
              }`}
            >
              <span className="max-w-[140px] truncate">{t.name}</span>
              {t.dirty ? (
                <span
                  title="有未保存的更改"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 shadow-[0_0_0_2px_rgba(251,191,36,0.25)]"
                />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/80 dark:bg-emerald-500/70" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(t.id);
                }}
                title="关闭标签"
                className={`flex h-4 w-4 items-center justify-center rounded-md transition-colors ${
                  active
                    ? "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                    : "text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-300/70 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                }`}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={onNew}
        title="新建画布标签"
        className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-300/60 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
      <FileMenu
        dirty={dirty}
        theme={theme}
        disabled={disabled}
        onNew={onNew}
        onOpen={onOpen}
        onSave={onSave}
        onSaveAs={onSaveAs}
        onExportPng={onExportPng}
        onExportWebp={onExportWebp}
        onExportSvg={onExportSvg}
        onExportPdf={onExportPdf}
        onCopyImage={onCopyImage}
        onCopyJson={onCopyJson}
        onToggleTheme={onToggleTheme}
        onAbout={onAbout}
      />
    </div>
  );
}

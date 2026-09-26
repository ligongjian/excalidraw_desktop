import { PlusIcon, XIcon } from "./icons";
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
};

type TabBarProps = {
  tabs: TabData[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
};

export default function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
}: TabBarProps) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-zinc-200/80 bg-zinc-50/70 px-2.5 dark:border-zinc-700/80 dark:bg-zinc-900">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.id === activeId;
          return (
            <div
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(t.id)}
              className={`group flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12.5px] font-medium transition-colors duration-150 ${
                active
                  ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-600"
                  : "text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {t.dirty && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              )}
              <span className="max-w-[140px] truncate">{t.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(t.id);
                }}
                title="关闭标签"
                className={`flex h-4 w-4 items-center justify-center rounded-md text-zinc-400 transition-colors ${
                  active
                    ? "hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                    : "opacity-0 group-hover:opacity-100 hover:bg-zinc-300/70 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
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
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

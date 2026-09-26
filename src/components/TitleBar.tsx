import { useEffect, useState } from "react";

type WinApi = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
};

async function getWindowApi(): Promise<WinApi | null> {
  // 仅 Tauri 环境可用；纯 vite 调试时返回 null
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return null;
  }
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  return {
    minimize: () => win.minimize(),
    toggleMaximize: () => win.toggleMaximize(),
    close: () => win.close(),
  };
}

export default function TitleBar() {
  const [api, setApi] = useState<WinApi | null>(null);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getWindowApi().then((a) => {
      if (!cancelled) setApi(a);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!api) return null;

  return (
    <div
      data-tauri-drag-region
      className="flex h-10 shrink-0 select-none items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
        <span className="text-base">✏️</span>
        <span>Excalidraw 桌面版</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          title="最小化"
          onClick={() => api.minimize()}
          className="flex h-7 w-9 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 6h10" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
        <button
          title={maximized ? "还原" : "最大化"}
          onClick={async () => {
            await api.toggleMaximize();
            setMaximized((m) => !m);
          }}
          className="flex h-7 w-9 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
        <button
          title="关闭"
          onClick={() => api.close()}
          className="flex h-7 w-9 items-center justify-center rounded text-zinc-500 hover:bg-red-500 hover:text-white dark:text-zinc-300"
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
      </div>
    </div>
  );
}

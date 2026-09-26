import { useEffect, useState } from "react";
import { PenIcon } from "./icons";

type WinApi = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
};

async function getWindowApi(): Promise<WinApi | null> {
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

const ctrl =
  "flex h-8 w-11 items-center justify-center rounded-lg text-zinc-500 transition-colors duration-150 hover:bg-zinc-200/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100";

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

  return (
    <div
      data-tauri-drag-region
      className="flex h-10 shrink-0 select-none items-center justify-between border-b border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50 px-3 dark:border-zinc-700/80 dark:from-zinc-800 dark:to-zinc-800"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-600/30">
          <PenIcon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[13px] font-semibold tracking-wide text-zinc-800 dark:text-zinc-100">
          Excalidraw 桌面版
        </span>
        <span className="rounded-md bg-zinc-200/60 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-700/70 dark:text-zinc-400">
          v0.1
        </span>
      </div>

      {api && (
        <div className="flex items-center gap-0.5">
          <button title="最小化" onClick={() => api.minimize()} className={ctrl}>
            <svg width="11" height="11" viewBox="0 0 12 12">
              <path d="M1 6.2h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
          <button
            title={maximized ? "还原" : "最大化"}
            onClick={async () => {
              await api.toggleMaximize();
              setMaximized((m) => !m);
            }}
            className={ctrl}
          >
            {maximized ? (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M4 4V2.5h5.5V8H8" stroke="currentColor" strokeWidth="1.3" />
                <rect x="2.5" y="4" width="5.5" height="5.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" fill="none" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <rect x="2" y="2.5" width="8" height="7.2" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            )}
          </button>
          <button
            title="关闭"
            onClick={() => api.close()}
            className="flex h-8 w-11 items-center justify-center rounded-lg text-zinc-500 transition-colors duration-150 hover:bg-red-500 hover:text-white dark:text-zinc-400"
          >
            <svg width="11" height="11" viewBox="0 0 12 12">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

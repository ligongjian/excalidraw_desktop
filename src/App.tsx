import { useCallback, useEffect, useRef, useState } from "react";
import {
  Excalidraw,
  exportToBlob,
  serializeAsJSON,
  restore,
  MIME_TYPES,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, AppState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import TitleBar from "./components/TitleBar";
import Toolbar from "./components/Toolbar";
import StatusBar from "./components/StatusBar";
import DialogProvider, { useDialogs } from "./components/ui/DialogProvider";
import { openScene, saveScene, exportImage } from "./lib/file";

// 模块级常量，避免每次渲染生成新对象导致 Excalidraw 重复渲染
const UI_OPTIONS = {
  canvasActions: {
    export: false,
    saveToActiveFile: false,
    loadScene: false,
    toggleTheme: false,
  },
};

// 元素内容签名：仅用内容唯一标识（id/版本号）。
// 选中、缩放、视口变化等"视图变化"不会改动它，从而不会被误判为内容被修改
function elementsKey(elements: readonly ExcalidrawElement[]): string {
  return elements.map((e) => `${e.id}:${e.version}:${e.versionNonce}`).join("|");
}

export default function App() {
  return (
    <DialogProvider>
      <Shell />
    </DialogProvider>
  );
}

function Shell() {
  const dialogs = useDialogs();
  const excRef = useRef<ExcalidrawImperativeAPI | null>(null);
  // 打开/新建后抑制一次脏标记，避免把"未变化"当作未保存
  const suppressDirty = useRef(false);

  const [filename, setFilename] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  // 防止保存/打开期间快捷键连发触发重复操作
  const saving = useRef(false);
  // 最近一次已保存/已打开/已新建的内容签名，用于区分"内容被修改"与"视图变化"
  const baseline = useRef<string>("");

  // 同步 Tailwind 的 class 暗色策略与系统 color-scheme
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  const sceneString = useCallback((): string | null => {
    const api = excRef.current;
    if (!api) return null;
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles();
    return serializeAsJSON(elements, appState, files, "local");
  }, []);

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      setCount(elements.filter((e) => !e.isDeleted).length);
      setZoom(appState.zoom.value);
      if (suppressDirty.current) {
        suppressDirty.current = false;
        return;
      }
      // 仅在内容签名偏离"已保存基线"时才标脏；
      // 选中/缩放/视口/保存对话框关闭等视图变化不会改动签名，不再误判
      if (baseline.current !== elementsKey(elements)) {
        setDirty(true);
      }
    },
    [],
  );

  const handleNew = useCallback(async () => {
    const ok = await dialogs.confirm({
      title: "新建画布",
      message: "新建画布将清空当前内容，且无法撤销。是否继续？",
      okText: "新建",
      danger: true,
    });
    if (!ok) return;
    excRef.current?.resetScene();
    suppressDirty.current = true;
    baseline.current = ""; // 空场景作为新基线
    setFilename(null);
    setDirty(false);
    setCount(0);
  }, [dialogs]);

  const handleOpen = useCallback(async () => {
    const res = await openScene();
    if (!res) return;
    try {
      const data = restore(JSON.parse(res.data), null, null);
      excRef.current?.updateScene({
        elements: data.elements,
        appState: { ...data.appState, theme },
      });
      suppressDirty.current = true;
      baseline.current = elementsKey(data.elements);
      setFilename(res.path);
      setDirty(false);
      setCount(data.elements.filter((e) => !e.isDeleted).length);
      dialogs.toast({ message: "画布已打开", kind: "success" });
    } catch (e) {
      dialogs.alert({
        title: "打开失败",
        message: `无法读取该画布文件：\n${String(e)}`,
        kind: "error",
      });
    }
  }, [theme, dialogs]);

  const handleSave = useCallback(
    async (as?: boolean) => {
      if (saving.current) return;
      const str = sceneString();
      if (!str) return;
      saving.current = true;
      setBusy(true);
      try {
        const p = await saveScene(str, as ? undefined : filename ?? undefined);
        setFilename(p);
        // 保存成功后，把当前内容记为新的"已保存基线"
        baseline.current = elementsKey(excRef.current?.getSceneElements() ?? []);
        setDirty(false);
        dialogs.toast({ message: "已保存", kind: "success" });
      } catch (e) {
        dialogs.alert({
          title: "保存失败",
          message: String(e),
          kind: "error",
        });
      } finally {
        saving.current = false;
        setBusy(false);
      }
    },
    [filename, sceneString, dialogs],
  );

  const handleExport = useCallback(
    async (mime: "image/png" | "image/webp") => {
      const api = excRef.current;
      if (!api) return;
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();
      setBusy(true);
      try {
        const blob = await exportToBlob({
          elements,
          appState: { ...appState, theme },
          files,
          mimeType: mime,
          exportBackground: true,
        });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const ext = mime === "image/png" ? "png" : "webp";
        const base = filename
          ? filename.split(/[\\/]/).pop()!.replace(/\.[^.]+$/, "")
          : "画布";
        await exportImage(bytes, `${base}.${ext}`, ext);
        dialogs.toast({ message: `已导出 ${ext.toUpperCase()}` });
      } catch (e) {
        dialogs.alert({
          title: "导出失败",
          message: String(e),
          kind: "error",
        });
      } finally {
        setBusy(false);
      }
    },
    [filename, theme, dialogs],
  );

  const handleToggleTheme = useCallback(() => {
    const api = excRef.current;
    if (!api) return;
    const next = theme === "light" ? "dark" : "light";
    const appState = api.getAppState();
    api.updateScene({ appState: { ...appState, theme: next } });
    setTheme(next);
  }, [theme]);

  const handleAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    excRef.current = api;
  }, []);

  // 全局文件快捷键：Ctrl+S 保存 / Ctrl+Shift+S 另存为 / Ctrl+O 打开 / Ctrl+N 新建
  // 用 capture 阶段，抢在 Excalidraw 内部处理之前接管；输入框内不触发
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        e.stopPropagation();
        handleSave(e.shiftKey);
      } else if (key === "o") {
        e.preventDefault();
        e.stopPropagation();
        handleOpen();
      } else if (key === "n") {
        e.preventDefault();
        e.stopPropagation();
        handleNew();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [handleSave, handleOpen, handleNew]);

  return (
    <div className="flex h-screen flex-col bg-zinc-100 dark:bg-zinc-950">
      <TitleBar />
      <Toolbar
        filename={filename}
        dirty={dirty}
        theme={theme}
        disabled={busy}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={() => handleSave(false)}
        onSaveAs={() => handleSave(true)}
        onExportPng={() => handleExport(MIME_TYPES.png)}
        onExportWebp={() => handleExport(MIME_TYPES.webp)}
        onToggleTheme={handleToggleTheme}
      />
      <div className="relative min-h-0 flex-1">
        <Excalidraw
          excalidrawAPI={handleAPI}
          langCode="zh-CN"
          onChange={handleChange}
          UIOptions={UI_OPTIONS}
        />
      </div>
      <StatusBar count={count} zoom={zoom} />
    </div>
  );
}

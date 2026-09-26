import { useCallback, useEffect, useRef, useState } from "react";
import {
  Excalidraw,
  exportToBlob,
  serializeAsJSON,
  restore,
  MIME_TYPES,
} from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  AppState,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import TitleBar from "./components/TitleBar";
import Toolbar from "./components/Toolbar";
import StatusBar from "./components/StatusBar";
import TabBar, { type TabData } from "./components/TabBar";
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

function genId(): string {
  return `tab-${crypto.randomUUID()}`;
}

export default function App() {
  return (
    <DialogProvider>
      <Shell />
    </DialogProvider>
  );
}

// 每个画布标签对应一个常驻的 Excalidraw 实例，切换只改显示/隐藏，
// 场景、缩放、选中状态都保存在实例内部，零数据丢失。
// 打开文件时通过 initialData 在挂载时直接初始化画布，
// 避免"先空实例、再 updateScene 注入"带来的时序问题（内容闪烁、误标未保存）。
function CanvasPane(props: {
  tabId: string;
  active: boolean;
  initialData?: ExcalidrawInitialDataState;
  onAPI: (id: string, api: ExcalidrawImperativeAPI) => void;
  onChange: (
    id: string,
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ) => void;
}) {
  const handleAPI = useCallback(
    (api: ExcalidrawImperativeAPI) => props.onAPI(props.tabId, api),
    [props.tabId, props.onAPI],
  );
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) =>
      props.onChange(props.tabId, elements, appState),
    [props.tabId, props.onChange],
  );
  return (
    <div className={props.active ? "absolute inset-0" : "hidden"}>
      <Excalidraw
        initialData={props.initialData}
        excalidrawAPI={handleAPI}
        langCode="zh-CN"
        onChange={handleChange}
        UIOptions={UI_OPTIONS}
      />
    </div>
  );
}

function Shell() {
  const dialogs = useDialogs();
  const apisRef = useRef<Record<string, ExcalidrawImperativeAPI | null>>({});

  const seq = useRef(2); // 初始标签"画布 1"占用了 1
  const initialTab = useRef<TabData>({
    id: genId(),
    name: "画布 1",
    filePath: null,
    dirty: false,
    count: 0,
    zoom: null,
    baseline: "",
    baselineReady: false,
  });

  const [tabs, setTabs] = useState<TabData[]>([initialTab.current]);
  const [activeId, setActiveId] = useState<string>(initialTab.current.id);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  // 同步 Tailwind 的 class 暗色策略与系统 color-scheme
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  const handleAPI = useCallback(
    (id: string, api: ExcalidrawImperativeAPI) => {
      apisRef.current[id] = api;
    },
    [],
  );

  const handleChange = useCallback(
    (
      id: string,
      elements: readonly ExcalidrawElement[],
      appState: AppState,
    ) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const key = elementsKey(elements);
          if (!t.baselineReady) {
            // 首次渲染的内容即"初始已保存基线"（打开=文件内容，新建=空场景），避免被误标脏
            return {
              ...t,
              baseline: key,
              baselineReady: true,
              dirty: false,
              count: elements.filter((e) => !e.isDeleted).length,
              zoom: appState.zoom.value,
            };
          }
          return {
            ...t,
            dirty: t.baseline !== key,
            count: elements.filter((e) => !e.isDeleted).length,
            zoom: appState.zoom.value,
          };
        }),
      );
    },
    [],
  );

  const handleNew = useCallback(() => {
    const id = genId();
    setTabs((prev) => [
      ...prev,
      {
        id,
        name: `画布 ${seq.current++}`,
        filePath: null,
        dirty: false,
        count: 0,
        zoom: null,
        baseline: "",
        baselineReady: false,
      },
    ]);
    setActiveId(id);
  }, []);

  const handleOpen = useCallback(async () => {
    const res = await openScene();
    if (!res) return;
    try {
      const data = restore(JSON.parse(res.data), null, null);
      const id = genId();
      const name = res.path.split(/[\\/]/).pop() ?? res.path;
      setTabs((prev) => [
        ...prev,
        {
          id,
          name,
          filePath: res.path,
          dirty: false,
          count: 0,
          zoom: null,
          baseline: "",
          baselineReady: false,
          // 通过 initialData 在挂载时直接初始化画布；
          // 只带 elements 与视觉性 appState，不注入视图坐标，内容落在默认视图
          initialData: {
            elements: data.elements,
            appState: {
              theme,
              viewBackgroundColor: data.appState.viewBackgroundColor,
              gridSize: data.appState.gridSize,
            },
            files: data.files,
          },
        },
      ]);
      setActiveId(id);
      dialogs.toast({ message: "画布已打开", kind: "success" });
    } catch (e) {
      dialogs.alert({
        title: "打开失败",
        message: `无法读取该画布文件：\n${String(e)}`,
        kind: "error",
      });
    }
  }, [theme, dialogs]);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleClose = useCallback(
    async (id: string) => {
      const target = tabs.find((t) => t.id === id);
      if (!target) return;

      // 关闭最后一个标签：重置为空画布
      if (tabs.length === 1) {
        if (target.dirty) {
          const ok = await dialogs.confirm({
            title: "关闭画布",
            message: "当前画布有未保存的更改，关闭将丢弃这些更改。是否继续？",
            okText: "丢弃并清空",
            danger: true,
          });
          if (!ok) return;
        }
        apisRef.current[id]?.resetScene();
        setTabs((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  name: "画布 1",
                  filePath: null,
                  dirty: false,
                  count: 0,
                  zoom: null,
                  baseline: "",
                  baselineReady: false,
                  initialData: undefined,
                }
              : t,
          ),
        );
        return;
      }

      if (target.dirty) {
        const ok = await dialogs.confirm({
          title: "关闭画布",
          message: `“${target.name}”有未保存的更改，关闭将丢弃这些更改。是否继续？`,
          okText: "关闭并丢弃",
          danger: true,
        });
        if (!ok) return;
      }

      const idx = tabs.findIndex((t) => t.id === id);
      delete apisRef.current[id];
      setTabs((prev) => prev.filter((t) => t.id !== id));
      if (id === activeId) {
        const next = tabs[idx + 1] ?? tabs[idx - 1];
        if (next) setActiveId(next.id);
      }
    },
    [tabs, activeId, dialogs],
  );

  const handleSave = useCallback(
    async (as?: boolean) => {
      const id = activeId;
      const api = apisRef.current[id];
      if (!api || saving.current) return;
      const tab = tabs.find((t) => t.id === id);
      saving.current = true;
      setBusy(true);
      try {
        const elements = api.getSceneElements();
        const appState = api.getAppState();
        const files = api.getFiles();
        const str = serializeAsJSON(elements, appState, files, "local");
        const p = await saveScene(str, as ? undefined : tab?.filePath ?? undefined);
        const key = elementsKey(api.getSceneElements());
        setTabs((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, filePath: p, dirty: false, baseline: key, baselineReady: true }
              : t,
          ),
        );
        dialogs.toast({ message: "已保存", kind: "success" });
      } catch (e) {
        dialogs.alert({ title: "保存失败", message: String(e), kind: "error" });
      } finally {
        saving.current = false;
        setBusy(false);
      }
    },
    [activeId, tabs, dialogs],
  );

  const handleExport = useCallback(
    async (mime: "image/png" | "image/webp") => {
      const id = activeId;
      const api = apisRef.current[id];
      if (!api) return;
      const tab = tabs.find((t) => t.id === id);
      setBusy(true);
      try {
        const elements = api.getSceneElements();
        const appState = api.getAppState();
        const files = api.getFiles();
        const blob = await exportToBlob({
          elements,
          appState: { ...appState, theme },
          files,
          mimeType: mime,
          exportBackground: true,
        });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const ext = mime === "image/png" ? "png" : "webp";
        const base = (tab?.name ?? "画布").replace(/\.[^.]+$/, "");
        await exportImage(bytes, `${base}.${ext}`, ext);
        dialogs.toast({ message: `已导出 ${ext.toUpperCase()}` });
      } catch (e) {
        dialogs.alert({ title: "导出失败", message: String(e), kind: "error" });
      } finally {
        setBusy(false);
      }
    },
    [activeId, tabs, theme, dialogs],
  );

  const handleToggleTheme = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    Object.values(apisRef.current).forEach((api) => {
      if (api) {
        api.updateScene({ appState: { ...api.getAppState(), theme: next } });
      }
    });
    setTheme(next);
  }, [theme]);

  // 全局文件快捷键：Ctrl+S 保存 / Ctrl+Shift+S 另存为 / Ctrl+O 打开 / Ctrl+N 新建 / Ctrl+W 关闭
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
      } else if (key === "w") {
        e.preventDefault();
        e.stopPropagation();
        void handleClose(activeId);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [handleSave, handleOpen, handleNew, handleClose, activeId]);

  return (
    <div className="flex h-screen flex-col bg-zinc-100 dark:bg-zinc-950">
      <TitleBar />
      <Toolbar
        dirty={activeTab?.dirty ?? false}
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
      <TabBar
        tabs={tabs}
        activeId={activeId}
        onSelect={handleSelect}
        onClose={handleClose}
        onNew={handleNew}
      />
      <div className="relative min-h-0 flex-1">
        {tabs.map((t) => (
          <CanvasPane
            key={t.id}
            tabId={t.id}
            active={t.id === activeId}
            initialData={t.initialData}
            onAPI={handleAPI}
            onChange={handleChange}
          />
        ))}
      </div>
      <StatusBar count={activeTab?.count ?? 0} zoom={activeTab?.zoom ?? null} />
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Excalidraw,
  exportToBlob,
  exportToSvg,
  exportToClipboard,
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
import StatusBar from "./components/StatusBar";
import TabBar, { type TabData } from "./components/TabBar";
import AboutDialog from "./components/AboutDialog";
import SplashScreen from "./components/SplashScreen";
import DialogProvider, { useDialogs } from "./components/ui/DialogProvider";
import {
  openScene,
  saveScene,
  exportImage,
  writeDraft,
  readDraft,
  clearDraft,
} from "./lib/file";

// 模块级常量，避免每次渲染生成新对象导致 Excalidraw 重复渲染。
// as const：让 export/toggleTheme 等保持字面量类型，满足 UIOptions 的窄类型约束
const UI_OPTIONS = {
  canvasActions: {
    export: false,
    saveToActiveFile: false,
    loadScene: false,
    toggleTheme: false,
  },
} as const;

// 定时自动保存到临时草稿的间隔（毫秒）：默认每 5 分钟
const AUTO_SAVE_MS = 5 * 60 * 1000;

// 草稿文件的结构约定
type DraftTab = { name: string; filePath: string | null; scene: string };
type DraftPayload = { savedAt: number; tabs: DraftTab[] };

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
  const [aboutOpen, setAboutOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const saving = useRef(false);
  // 实时 tabs 引用：供自动保存 / 关闭拦截等异步回调读取最新标签状态
  const tabsRef = useRef<TabData[]>([]);
  // 用户已确认退出后置 true，放行窗口真正关闭，避免再次被拦截
  const allowCloseRef = useRef(false);

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  // 保持 tabsRef 与 tabs 同步
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  // 启动画面：首个画布实例就绪且至少显示 700ms 后淡出，3.5s 兜底强制关闭
  useEffect(() => {
    const start = Date.now();
    const check = window.setInterval(() => {
      if (
        Object.values(apisRef.current).some(Boolean) &&
        Date.now() - start > 700
      ) {
        setSplashDone(true);
        window.clearInterval(check);
      }
    }, 100);
    const max = window.setTimeout(() => setSplashDone(true), 3500);
    return () => {
      window.clearInterval(check);
      window.clearTimeout(max);
    };
  }, []);

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
          if (t.restored) {
            // 从草稿恢复的标签：内容来自未保存快照，保持"未保存"提示，直到用户正式保存
            return {
              ...t,
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
        // 用户在保存/另存为对话框中点了取消：保持未保存状态，不报错
        if (p == null) return;
        const key = elementsKey(api.getSceneElements());
        setTabs((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  filePath: p,
                  dirty: false,
                  baseline: key,
                  baselineReady: true,
                  restored: false,
                }
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

  const handleExportSvg = useCallback(async () => {
    const id = activeId;
    const api = apisRef.current[id];
    if (!api) return;
    const tab = tabs.find((t) => t.id === id);
    setBusy(true);
    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();
      const svg = await exportToSvg({
        elements,
        appState: { ...appState, theme },
        files,
        exportPadding: 12,
      });
      const str = new XMLSerializer().serializeToString(svg);
      const bytes = new TextEncoder().encode(str);
      const base = (tab?.name ?? "画布").replace(/\.[^.]+$/, "");
      const p = await exportImage(bytes, `${base}.svg`, "svg");
      if (p) dialogs.toast({ message: "已导出 SVG" });
    } catch (e) {
      dialogs.alert({ title: "导出失败", message: String(e), kind: "error" });
    } finally {
      setBusy(false);
    }
  }, [activeId, tabs, theme, dialogs]);

  const handleExportPdf = useCallback(async () => {
    const id = activeId;
    const api = apisRef.current[id];
    if (!api) return;
    const tab = tabs.find((t) => t.id === id);
    setBusy(true);
    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();
      const svg = await exportToSvg({
        elements,
        appState: { ...appState, theme },
        files,
        exportPadding: 12,
      });
      // SVG 渲染到离屏 canvas 得到位图，再写入 PDF（2x 提升清晰度）
      const svgStr = new XMLSerializer().serializeToString(svg);
      const url = URL.createObjectURL(
        new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" }),
      );
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("SVG 渲染失败"));
        img.src = url;
      });
      const vb = svg.viewBox.baseVal;
      const w = vb.width || svg.width.baseVal.value;
      const h = vb.height || svg.height.baseVal.value;
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("无法创建画布上下文");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("位图转换失败"))), "image/png");
      });
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: w >= h ? "landscape" : "portrait",
        unit: "pt",
        format: [w, h],
      });
      pdf.addImage(
        new Uint8Array(await pngBlob.arrayBuffer()),
        "PNG",
        0,
        0,
        w,
        h,
      );
      const arr = pdf.output("arraybuffer");
      const base = (tab?.name ?? "画布").replace(/\.[^.]+$/, "");
      const p = await exportImage(new Uint8Array(arr), `${base}.pdf`, "pdf");
      if (p) dialogs.toast({ message: "已导出 PDF" });
    } catch (e) {
      dialogs.alert({ title: "导出失败", message: String(e), kind: "error" });
    } finally {
      setBusy(false);
    }
  }, [activeId, tabs, theme, dialogs]);

  const handleCopyImage = useCallback(async () => {
    const api = apisRef.current[activeId];
    if (!api) return;
    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();
      await exportToClipboard(elements, { ...appState, theme }, files);
      dialogs.toast({ message: "已复制为图片", kind: "success" });
    } catch (e) {
      dialogs.alert({ title: "复制失败", message: String(e), kind: "error" });
    }
  }, [activeId, theme, dialogs]);

  const handleCopyJson = useCallback(async () => {
    const api = apisRef.current[activeId];
    if (!api) return;
    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();
      const str = serializeAsJSON(elements, appState, files, "local");
      await navigator.clipboard.writeText(str);
      dialogs.toast({ message: "已复制 JSON", kind: "success" });
    } catch (e) {
      dialogs.alert({ title: "复制失败", message: String(e), kind: "error" });
    }
  }, [activeId, dialogs]);

  const handleToggleTheme = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    Object.values(apisRef.current).forEach((api) => {
      if (api) {
        api.updateScene({ appState: { ...api.getAppState(), theme: next } });
      }
    });
    setTheme(next);
  }, [theme]);

  // 把当前所有标签的场景序列化为草稿并落盘
  const saveDraft = useCallback(async () => {
    const drafts: DraftTab[] = [];
    for (const t of tabsRef.current) {
      const api = apisRef.current[t.id];
      if (!api) continue;
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();
      const scene = serializeAsJSON(elements, appState, files, "local");
      drafts.push({ name: t.name, filePath: t.filePath, scene });
    }
    if (drafts.length === 0) return;
    try {
      await writeDraft(JSON.stringify({ savedAt: Date.now(), tabs: drafts }));
    } catch {
      // 自动保存失败不打断用户，等下一周期重试
    }
  }, []);

  // 启动时检测上次遗留的草稿，询问是否恢复
  const restoreChecked = useRef(false);
  useEffect(() => {
    if (restoreChecked.current) return;
    restoreChecked.current = true;
    let cancelled = false;
    (async () => {
      let raw: string | null = null;
      try {
        raw = await readDraft();
      } catch {
        return;
      }
      if (!raw || cancelled) return;
      let parsed: DraftPayload;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      if (!parsed.tabs || parsed.tabs.length === 0) return;
      const ok = await dialogs.confirm({
        title: "恢复未保存的画布",
        message: `检测到上次退出时留下的草稿（${parsed.tabs.length} 个画布，保存于 ${new Date(
          parsed.savedAt,
        ).toLocaleString()}）。要恢复它们吗？`,
        okText: "恢复",
        danger: true,
      });
      if (cancelled) return;
      if (!ok) {
        void clearDraft();
        return;
      }
      const newTabs: TabData[] = [];
      let firstActive: string | null = null;
      for (const d of parsed.tabs) {
        try {
          const data = restore(JSON.parse(d.scene), null, null);
          const id = genId();
          newTabs.push({
            id,
            name: d.name || "恢复的画布",
            filePath: d.filePath ?? null,
            dirty: true,
            count: data.elements.length,
            zoom: null,
            baseline: "",
            baselineReady: true,
            restored: true,
            initialData: {
              elements: data.elements,
              appState: {
                theme,
                viewBackgroundColor: data.appState.viewBackgroundColor,
                gridSize: data.appState.gridSize,
              },
              files: data.files,
            },
          });
          if (!firstActive) firstActive = id;
        } catch {
          // 单条草稿损坏则跳过
        }
      }
      if (newTabs.length > 0) {
        setTabs(newTabs);
        if (firstActive) setActiveId(firstActive);
        void clearDraft();
        dialogs.toast({
          message: `已恢复 ${newTabs.length} 个画布`,
          kind: "success",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dialogs, theme]);

  // 定时自动保存：每 N 分钟把全部标签写入草稿
  useEffect(() => {
    const h = window.setInterval(() => {
      void saveDraft();
    }, AUTO_SAVE_MS);
    return () => window.clearInterval(h);
  }, [saveDraft]);

  // 关闭前拦截：有未保存更改时弹自绘确认框，防止误关丢数据
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      unlisten = await win.onCloseRequested(async (event) => {
        if (allowCloseRef.current) return; // 已确认退出，放行
        const hasDirty = tabsRef.current.some((t) => t.dirty);
        if (!hasDirty) return; // 无未保存更改，放行
        event.preventDefault();
        const ok = await dialogs.confirm({
          title: "关闭窗口",
          message:
            "有画布包含未保存的更改。是否先保存这些画布，再退出？未保存成功则不会退出。",
          okText: "保存并退出",
          cancelText: "暂不退出",
          danger: true,
        });
        if (!ok) return;
        // 先正式保存所有未保存的画布；任一保存失败/取消则留在应用，不退出
        for (const t of tabsRef.current) {
          if (!t.dirty) continue;
          const api = apisRef.current[t.id];
          if (!api) continue;
          const elements = api.getSceneElements();
          const appState = api.getAppState();
          const files = api.getFiles();
          const str = serializeAsJSON(elements, appState, files, "local");
          const p = await saveScene(str, t.filePath ?? undefined);
          if (p == null) {
            dialogs.toast({ message: "已取消保存，未退出", kind: "info" });
            return;
          }
          setTabs((prev) =>
            prev.map((x) =>
              x.id === t.id
                ? { ...x, filePath: p, dirty: false, baselineReady: true, restored: false }
                : x,
            ),
          );
        }
        await saveDraft();
        allowCloseRef.current = true;
        // 用 destroy 直接销毁，避免再次触发 onCloseRequested 造成循环/权限报错
        win.destroy();
      });
      if (disposed) unlisten?.();
    })();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [dialogs, saveDraft]);

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
      <TabBar
        tabs={tabs}
        activeId={activeId}
        dirty={activeTab?.dirty ?? false}
        theme={theme}
        disabled={busy}
        onSelect={handleSelect}
        onClose={handleClose}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={() => handleSave(false)}
        onSaveAs={() => handleSave(true)}
        onExportPng={() => handleExport(MIME_TYPES.png)}
        onExportWebp={() => handleExport(MIME_TYPES.webp)}
        onExportSvg={handleExportSvg}
        onExportPdf={handleExportPdf}
        onCopyImage={handleCopyImage}
        onCopyJson={handleCopyJson}
        onToggleTheme={handleToggleTheme}
        onAbout={() => setAboutOpen(true)}
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
      <AboutDialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        canvases={tabs.length}
        elements={tabs.reduce((sum, t) => sum + t.count, 0)}
      />
      <SplashScreen visible={!splashDone} />
    </div>
  );
}

import { useCallback, useRef, useState } from "react";
import {
  Excalidraw,
  exportToBlob,
  serializeAsJSON,
  restore,
  MIME_TYPES,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import TitleBar from "./components/TitleBar";
import Toolbar from "./components/Toolbar";
import { openScene, saveScene, exportImage } from "./lib/file";

export default function App() {
  const excRef = useRef<ExcalidrawImperativeAPI | null>(null);
  // 打开/新建后抑制一次脏标记，避免把"未变化"当作未保存
  const suppressDirty = useRef(false);

  const [filename, setFilename] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [busy, setBusy] = useState(false);

  const sceneString = useCallback((): string | null => {
    const api = excRef.current;
    if (!api) return null;
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles();
    return serializeAsJSON(elements, appState, files, "local");
  }, []);

  const handleChange = useCallback(() => {
    if (suppressDirty.current) {
      suppressDirty.current = false;
      return;
    }
    setDirty(true);
  }, []);

  const handleNew = useCallback(() => {
    if (window.confirm("新建画布将清空当前内容，是否继续？")) {
      excRef.current?.resetScene();
      suppressDirty.current = true;
      setFilename(null);
      setDirty(false);
    }
  }, []);

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
      setFilename(res.path);
      setDirty(false);
    } catch (e) {
      window.alert(`打开失败：${String(e)}`);
    }
  }, [theme]);

  const handleSave = useCallback(
    async (as?: boolean) => {
      const str = sceneString();
      if (!str) return;
      setBusy(true);
      try {
        const p = await saveScene(str, as ? undefined : filename ?? undefined);
        setFilename(p);
        setDirty(false);
      } catch (e) {
        window.alert(`保存失败：${String(e)}`);
      } finally {
        setBusy(false);
      }
    },
    [filename, sceneString],
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
      } catch (e) {
        window.alert(`导出失败：${String(e)}`);
      } finally {
        setBusy(false);
      }
    },
    [filename, theme],
  );

  const handleToggleTheme = useCallback(() => {
    const api = excRef.current;
    if (!api) return;
    const next = theme === "light" ? "dark" : "light";
    const appState = api.getAppState();
    api.updateScene({ appState: { ...appState, theme: next } });
    setTheme(next);
  }, [theme]);

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
          excalidrawAPI={(api) => {
            excRef.current = api;
          }}
          langCode="zh-CN"
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              export: false,
              saveToActiveFile: false,
              loadScene: false,
              toggleTheme: false,
            },
          }}
        />
      </div>
    </div>
  );
}

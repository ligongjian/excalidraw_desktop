import { useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  AppState,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

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

// 每个画布标签对应一个常驻的 Excalidraw 实例，切换只改显示/隐藏，
// 场景、缩放、选中状态都保存在实例内部，零数据丢失。
// 打开文件时通过 initialData 在挂载时直接初始化画布，
// 避免"先空实例、再 updateScene 注入"带来的时序问题（内容闪烁、误标未保存）。
export default function CanvasPane(props: {
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

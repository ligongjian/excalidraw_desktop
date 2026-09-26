import { createRoot } from "react-dom/client";
import App from "./App";
import "@excalidraw/excalidraw/index.css";
import "./index.css";

// 不启用 StrictMode：Excalidraw 这类"内部持有重型实例 + 挂载时注入场景"的组件，
// 会被 StrictMode 的 mount→unmount→remount 破坏场景注入时序（打开文件后内容为空）。
createRoot(document.getElementById("root")!).render(<App />);

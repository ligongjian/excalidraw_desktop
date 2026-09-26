import { invoke } from "@tauri-apps/api/core";

export type OpenResult = { path: string; data: string } | null;

/** 保存场景：传入已选路径则直接写盘；否则弹出另存为对话框。返回最终保存路径 */
export async function saveScene(
  data: string,
  path?: string,
): Promise<string> {
  return await invoke<string>("save_scene", { data, path: path ?? null });
}

/** 打开场景：弹出打开对话框，读取文件，返回路径与内容 */
export async function openScene(): Promise<OpenResult> {
  return await invoke<OpenResult>("open_scene");
}

/** 导出图片（PNG/WebP）到本地文件 */
export async function exportImage(
  data: Uint8Array,
  defaultName: string,
  ext: string,
): Promise<string | null> {
  const bytes = Array.from(data);
  return await invoke<string | null>("export_image", {
    bytes,
    defaultName,
    ext,
  });
}

/** 是否运行在 Tauri 环境（非纯浏览器） */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

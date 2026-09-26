import { invoke } from "@tauri-apps/api/core";

export type OpenResult = { path: string; data: string } | null;

/** 保存场景：传入已选路径则直接写盘；否则弹出另存为对话框。返回最终保存路径；取消时返回 null */
export async function saveScene(
  data: string,
  path?: string,
): Promise<string | null> {
  return await invoke<string | null>("save_scene", { data, path: path ?? null });
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

/** 把自动保存的草稿写入应用数据目录（崩溃 / 误关后的恢复兜底） */
export async function writeDraft(data: string): Promise<void> {
  await invoke("write_draft", { data });
}

/** 读取上次遗留的草稿，不存在时返回 null */
export async function readDraft(): Promise<string | null> {
  return await invoke<string | null>("read_draft");
}

/** 清除草稿 */
export async function clearDraft(): Promise<void> {
  await invoke("clear_draft");
}

/** 获取应用数据目录路径（草稿 / 数据保存位置） */
export async function getDataDir(): Promise<string> {
  return await invoke<string>("data_dir");
}

/** 是否运行在 Tauri 环境（非纯浏览器） */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

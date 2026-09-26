import { useEffect, useState } from "react";
import Modal from "./ui/Modal";
import { Button } from "./ui/Button";
import { PenIcon } from "./icons";
import { useDialogs } from "./ui/DialogProvider";
import { getDataDir } from "../lib/file";
import weixinImg from "../assets/weixin.jpg";

type AboutDialogProps = {
  open: boolean;
  onClose: () => void;
  canvases: number;
  elements: number;
};

const SHORTCUTS: [string, string][] = [
  ["保存", "Ctrl + S"],
  ["另存为", "Ctrl + Shift + S"],
  ["打开", "Ctrl + O"],
  ["新建画布", "Ctrl + N"],
  ["关闭标签", "Ctrl + W"],
];

export default function AboutDialog({
  open,
  onClose,
  canvases,
  elements,
}: AboutDialogProps) {
  const dialogs = useDialogs();
  const [dataDir, setDataDir] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getDataDir()
      .then((d) => {
        if (!cancelled) setDataDir(d);
      })
      .catch(() => {
        if (!cancelled) setDataDir(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      dialogs.toast({ message: "已复制", kind: "success" });
    } catch {
      dialogs.toast({ message: "复制失败", kind: "error" });
    }
  };

  const stats: [string, number][] = [
    ["画布", canvases],
    ["元素", elements],
  ];

  return (
    <Modal open={open} onClose={onClose} width={640} showClose>
      <div className="grid grid-cols-[auto,1fr] gap-6 p-6">
        {/* 左侧：微信二维码卡片 */}
        <div className="flex w-40 shrink-0 flex-col items-center">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-600">
            <img src={weixinImg} alt="微信二维码" className="block w-40" />
          </div>
          <p className="mt-2.5 text-[13px] font-medium text-zinc-700 dark:text-zinc-200">
            李功健 · 江苏 南京
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
            扫码加我微信
          </p>
        </div>

        {/* 右侧：软件信息 */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-600/30">
              <PenIcon className="h-4 w-4" />
            </span>
            <h2 className="text-[17px] font-semibold text-zinc-900 dark:text-zinc-50">
              Excalidraw 桌面版
            </h2>
            <span className="rounded-md bg-zinc-200/70 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
              v1.0.0
            </span>
          </div>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            手绘风格白板 · 数据全部保存在本机
          </p>

          {/* 统计 */}
          <div className="mt-4 flex gap-2.5">
            {stats.map(([label, value]) => (
              <div
                key={label}
                className="flex flex-1 flex-col items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-700/40"
              >
                <span className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
                  {value}
                </span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* 快捷键 */}
          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              快捷键
            </p>
            <div className="mt-1.5 grid grid-cols-1 gap-1.5">
              {SHORTCUTS.map(([label, key]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-2.5 py-1.5 text-[12.5px] dark:bg-zinc-700/40"
                >
                  <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
                  <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                    {key}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 数据目录 */}
          {dataDir && (
            <div className="mt-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                数据目录
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate rounded-lg bg-zinc-50 px-2.5 py-1.5 font-mono text-[11px] text-zinc-500 dark:bg-zinc-700/40 dark:text-zinc-400">
                  {dataDir}
                </span>
                <Button variant="secondary" size="sm" onClick={() => copy(dataDir)}>
                  复制
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

import { PenIcon } from "./icons";

// 启动过渡画面：品牌 Logo + 应用名 + 加载指示，
// 首个画布就绪且至少显示一小段时间后由父组件淡出
export default function SplashScreen({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-500 dark:bg-zinc-950 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="flex flex-col items-center gap-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30">
          <PenIcon className="h-8 w-8" />
        </span>
        <div className="text-center">
          <p className="text-[18px] font-semibold tracking-wide text-zinc-800 dark:text-zinc-100">
            Excalidraw 桌面版
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">v1.0.0</p>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

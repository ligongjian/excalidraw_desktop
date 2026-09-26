import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Modal from "./Modal";
import { Button } from "./Button";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  XCircleIcon,
} from "../icons";

export type ConfirmOptions = {
  title: string;
  message?: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
};

export type AlertOptions = {
  title: string;
  message?: string;
  kind?: "info" | "success" | "warning" | "error";
};

export type ToastOptions = {
  message: string;
  kind?: "info" | "success" | "error";
};

type Dialogs = {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  alert: (o: AlertOptions) => Promise<void>;
  toast: (o: ToastOptions) => void;
};

const DialogContext = createContext<Dialogs | null>(null);

export function useDialogs(): Dialogs {
  const v = useContext(DialogContext);
  if (!v) throw new Error("useDialogs 必须在 DialogProvider 内使用");
  return v;
}

type DialogItem =
  | { type: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { type: "alert"; options: AlertOptions; resolve: () => void };

type ToastItem = { id: number; options: ToastOptions };

const ALERT_META: Record<
  NonNullable<AlertOptions["kind"]>,
  { icon: ReactNode; ring: string; text: string }
> = {
  info: { icon: <InfoIcon className="h-6 w-6" />, ring: "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300", text: "text-zinc-700 dark:text-zinc-200" },
  success: { icon: <CheckCircleIcon className="h-6 w-6" />, ring: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300", text: "text-zinc-700 dark:text-zinc-200" },
  warning: { icon: <AlertTriangleIcon className="h-6 w-6" />, ring: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300", text: "text-zinc-700 dark:text-zinc-200" },
  error: { icon: <XCircleIcon className="h-6 w-6" />, ring: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300", text: "text-zinc-700 dark:text-zinc-200" },
};

const TOAST_STYLE: Record<NonNullable<ToastOptions["kind"]>, string> = {
  info: "border-brand-300 bg-white text-zinc-800 dark:border-brand-500/40 dark:bg-zinc-800 dark:text-zinc-100",
  success: "border-emerald-300 bg-white text-zinc-800 dark:border-emerald-500/40 dark:bg-zinc-800 dark:text-zinc-100",
  error: "border-red-300 bg-white text-zinc-800 dark:border-red-500/40 dark:bg-zinc-800 dark:text-zinc-100",
};

export default function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<DialogItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);

  const close = useCallback(() => {
    setQueue((q) => {
      if (q.length === 0) return q;
      const [head, ...rest] = q;
      if (head.type === "confirm") head.resolve(false);
      else head.resolve();
      return rest;
    });
  }, []);

  const closeConfirm = useCallback((value: boolean) => {
    setQueue((q) => {
      if (q.length === 0) return q;
      const [head, ...rest] = q;
      if (head.type === "confirm") head.resolve(value);
      else head.resolve();
      return rest;
    });
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setQueue((q) => [...q, { type: "confirm", options, resolve }]);
      }),
    [],
  );

  const alert = useCallback(
    (options: AlertOptions) =>
      new Promise<void>((resolve) => {
        setQueue((q) => [...q, { type: "alert", options, resolve }]);
      }),
    [],
  );

  const toast = useCallback((options: ToastOptions) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, options }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const value = useMemo<Dialogs>(
    () => ({ confirm, alert, toast }),
    [confirm, alert, toast],
  );

  const current = queue[0];

  return (
    <DialogContext.Provider value={value}>
      {children}

      {/* 确认 / 提示对话框 */}
      <Modal open={!!current} onClose={close} labelledBy="dialog-title">
        {current && (
          <div className="p-6">
            <div className="flex items-start gap-4">
              {current.type === "confirm" ? (
                <span
                  className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    current.options.danger
                      ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
                      : "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
                  }`}
                >
                  <AlertTriangleIcon className="h-5 w-5" />
                </span>
              ) : (
                <span
                  className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    ALERT_META[current.options.kind ?? "info"].ring
                  }`}
                >
                  {ALERT_META[current.options.kind ?? "info"].icon}
                </span>
              )}
              <div className="min-w-0">
                <h2
                  id="dialog-title"
                  className="text-[15px] font-semibold leading-snug text-zinc-900 dark:text-zinc-50"
                >
                  {current.options.title}
                </h2>
                {current.options.message && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {current.options.message}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              {current.type === "confirm" ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={close}
                    data-autofocus={current.options.danger ? true : undefined}
                  >
                    {current.options.cancelText ?? "取消"}
                  </Button>
                  <Button
                    variant={current.options.danger ? "danger" : "primary"}
                    onClick={() => closeConfirm(true)}
                    data-autofocus={current.options.danger ? undefined : true}
                  >
                    {current.options.okText ?? "确定"}
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={() => closeConfirm(false)} data-autofocus>
                  确定
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 轻提示 */}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg shadow-zinc-900/10 animate-toast-in ${TOAST_STYLE[t.options.kind ?? "info"]}`}
          >
            {t.options.kind === "success" && (
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
            )}
            {t.options.kind === "error" && (
              <XCircleIcon className="h-4 w-4 text-red-500" />
            )}
            {t.options.kind !== "success" && t.options.kind !== "error" && (
              <InfoIcon className="h-4 w-4 text-brand-500" />
            )}
            {t.options.message}
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
}

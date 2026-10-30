"use client";

import { useEffect } from "react";
import { LoaderCircle, TriangleAlert, X } from "lucide-react";

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

/**
 * Dialog konfirmasi dalam aplikasi, dipakai untuk menggantikan window.confirm.
 * Markah dan token desainnya mengikuti komponen Dialog di EzQuizApp agar konsisten.
 */
export function ConfirmDialog({
  title,
  subtitle,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  tone = "danger",
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  subtitle: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[80] grid items-end justify-items-center bg-[#111217]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="animate-scale-in relative max-h-[94vh] w-full max-w-[440px] overflow-y-auto rounded-t-[24px] bg-white p-6 shadow-2xl sm:rounded-[24px] sm:p-8"
      >
        <button type="button" onClick={onCancel} aria-label="Tutup dialog" className="absolute right-5 top-5 grid size-9 place-items-center rounded-xl bg-[#f3f3f4] text-[#777780] hover:bg-[#eaeaec]">
          <X size={17} />
        </button>
        <span className={cx("grid size-11 place-items-center rounded-2xl", tone === "danger" ? "bg-[#fff0ee] text-[#d94e3b]" : "bg-[#fff0eb] text-[#ff6846]")}>
          <TriangleAlert size={20} />
        </span>
        <h2 id="confirm-dialog-title" className="mt-4 pr-10 text-[20px] font-black tracking-[-0.6px] text-[#1e1f24]">
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="mt-1 text-[12px] leading-5 text-[#888991]">
          {subtitle}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#e7e7ea] bg-white px-4 text-[13px] font-bold text-[#383945] transition-all hover:bg-[#f7f7f8]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cx(
              "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-bold text-white transition-all disabled:opacity-55",
              tone === "danger" ? "bg-[#d94e3b] shadow-[0_7px_16px_rgba(217,78,59,0.22)] hover:bg-[#c53f2d]" : "bg-[#ff6846] shadow-[0_7px_16px_rgba(255,104,70,0.2)] hover:bg-[#f25332]",
            )}
          >
            {busy ? <LoaderCircle size={15} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

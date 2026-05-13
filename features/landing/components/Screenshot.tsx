import { ImageIcon } from "lucide-react";

interface ScreenshotProps {
  slot: string;
  aspect?: string;
  label?: string;
  variant?: "desktop" | "phone";
}

export function Screenshot({ slot, aspect = "16 / 9", label, variant = "desktop" }: ScreenshotProps) {
  const isPhone = variant === "phone";
  return (
    <div
      data-screenshot-slot={slot}
      className={
        isPhone
          ? "relative w-full max-w-[260px] mx-auto rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-1)] shadow-[var(--shadow-glow-brand)] overflow-hidden"
          : "relative w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-1)] shadow-[var(--shadow-glow-brand)] overflow-hidden"
      }
      style={{ aspectRatio: aspect }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-text-tertiary">
        <ImageIcon className="h-8 w-8" strokeWidth={1.5} />
        <div className="text-xs uppercase tracking-wider">Screenshot slot</div>
        {label ? <div className="text-sm text-text-secondary px-6 text-center max-w-md">{label}</div> : null}
        <div className="text-[10px] text-text-tertiary/70 font-mono">slot=&quot;{slot}&quot;</div>
      </div>
    </div>
  );
}

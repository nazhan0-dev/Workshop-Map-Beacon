// ชิ้นส่วน UI ที่ใช้ซ้ำทั้งแอป
import { useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import useToast from "../store/useToast";
import { initials, STATUS } from "../lib/shifts";

const BTN = {
  base: "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed",
  light: "bg-white border border-line text-ink hover:bg-paper",
  dark: "bg-ink border border-ink text-white hover:bg-black",
  green: "bg-brand border border-brand text-white hover:brightness-95",
  danger: "bg-danger border border-danger text-white hover:brightness-95",
  ghost: "text-mute hover:text-ink hover:bg-paper",
};

export function Button({ variant = "light", className = "", loading, children, ...props }) {
  return (
    <button className={`${BTN.base} ${BTN[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({ label, className = "", children, ...props }) {
  return (
    <button aria-label={label} title={label}
      className={`w-10 h-10 rounded-xl border border-line bg-white flex items-center justify-center text-ink hover:bg-paper ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Avatar({ name, size = 32, dark = false }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 ${dark ? "bg-ink text-white" : "bg-track text-ink"}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function StatusDot({ status, size = 8 }) {
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: STATUS[status].color }} />;
}

// แถบเลือก เช่น เช้า / บ่าย / ดึก
export function Segmented({ options, value, onChange, className = "" }) {
  return (
    <div className={`flex bg-track rounded-xl p-1 ${className}`} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`flex-1 rounded-[9px] px-2.5 py-1.5 text-sm font-semibold transition ${value === o.value ? "bg-white text-ink shadow-sm" : "text-mute hover:text-ink"}`}>
          {o.label}
          {o.sub && <small className={`block text-[11px] font-medium ${value === o.value ? "text-mute" : "text-faint"}`}>{o.sub}</small>}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, width = "max-w-md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] bg-ink/40 flex items-end sm:items-center justify-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`bg-white w-full ${width} rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col`}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center px-6 pt-5 pb-3">
          <h2 className="text-lg font-semibold flex-1">{title}</h2>
          <button onClick={onClose} aria-label="ปิด" className="text-faint hover:text-ink p-1"><X size={20} /></button>
        </div>
        <div className="px-6 pb-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 pb-6 pt-2 flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-mute mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full h-11 rounded-xl bg-paper px-3.5 text-[15px] outline-none border border-transparent focus:border-ink focus:bg-white placeholder:text-faint";

export function Spinner({ className = "" }) {
  return <Loader2 className={`animate-spin text-faint ${className}`} />;
}

export function Empty({ title, text, action }) {
  return (
    <div className="text-center py-10 px-6">
      <p className="font-semibold">{title}</p>
      {text && <p className="text-sm text-mute mt-1">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toaster() {
  const items = useToast((s) => s.items);
  return (
    <div className="fixed z-[3000] bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center pointer-events-none" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg ${t.type === "error" ? "bg-danger text-white" : "bg-ink text-white"}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

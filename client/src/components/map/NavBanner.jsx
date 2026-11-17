import {
  ArrowUp, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight,
  RotateCcw, RefreshCw, Flag, Navigation, Loader2, CheckCircle2,
} from "lucide-react";
import { instruction, fmtKm } from "../../lib/maps";

const ICONS = {
  straight: ArrowUp, left: CornerUpLeft, right: CornerUpRight, "slight left": ArrowUpLeft, "slight right": ArrowUpRight,
  "sharp left": ArrowLeft, "sharp right": ArrowRight, uturn: RotateCcw, roundabout: RefreshCw, arrive: Flag, depart: Navigation,
};

const fmtDist = (m) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} ม.` : fmtKm(m / 1000));

// แถบคำสั่งเลี้ยวด้านบนระหว่างนำทาง
export default function NavBanner({ step, toNext, arrived, rerouting, error, name }) {
  if (arrived) {
    return (
      <div className="pop-in flex items-center gap-3 bg-brand text-white rounded-2xl p-4 shadow-lg">
        <CheckCircle2 size={34} className="shrink-0" />
        <div className="min-w-0">
          <div className="text-lg font-bold leading-tight">ถึงจุดเวรแล้ว</div>
          <div className="text-sm text-white/85 truncate">{name}</div>
        </div>
      </div>
    );
  }
  if (!step) {
    return (
      <div className="flex items-center gap-3 bg-ink text-white rounded-2xl p-4 shadow-lg">
        {error ? <span className="text-sm">{error}</span> : <><Loader2 size={22} className="animate-spin shrink-0" /><span className="text-sm font-semibold">กำลังหาเส้นทาง…</span></>}
      </div>
    );
  }
  const ins = instruction(step);
  const Icon = ICONS[ins.icon] || ArrowUp;
  return (
    <div key={`${step.loc}`} className="nav-step flex items-center gap-3.5 bg-ink text-white rounded-2xl p-4 shadow-lg">
      <span className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><Icon size={32} strokeWidth={2.4} /></span>
      <div className="min-w-0 flex-1">
        {toNext != null && <div className="text-[26px] font-bold leading-none tabular-nums">{fmtDist(toNext)}</div>}
        <div className="text-[15px] font-semibold mt-1 leading-snug line-clamp-2">{ins.text}</div>
      </div>
      {rerouting && <Loader2 size={18} className="animate-spin text-white/60 shrink-0" aria-label="กำลังหาเส้นทางใหม่" />}
    </div>
  );
}

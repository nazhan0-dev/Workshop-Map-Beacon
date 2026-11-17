import { Camera, ChevronRight } from "lucide-react";
import { LEVELS, INC_STATUS, timeAgo } from "../../lib/incidents";
import { SHIFT_INFO } from "../../lib/shifts";

// ป้ายระดับความเร่งด่วน
export function LevelChip({ level, className = "" }) {
  const L = LEVELS[level] || LEVELS.NORMAL;
  const Icon = L.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-md px-1.5 py-0.5 shrink-0 ${L.chip} ${className}`}>
      <Icon size={11} strokeWidth={2.5} aria-hidden />{L.label}
    </span>
  );
}

export function StatusChip({ status }) {
  const S = INC_STATUS[status] || INC_STATUS.OPEN;
  return <span className={`text-[11px] font-semibold rounded-md px-1.5 py-0.5 shrink-0 ${S.chip}`}>{S.label}</span>;
}

// แถวรายงาน 1 เรื่อง (กดเพื่อเปิดรายละเอียด)
// showReporter=false ใช้ในหน้าของคนรายงานเอง
export default function IncidentRow({ inc, onOpen, showReporter = true, style }) {
  const urgentOpen = inc.level === "URGENT" && inc.status === "OPEN";
  return (
    <li style={style} className="row-in">
      <button onClick={() => onOpen(inc)}
        className={`w-full text-left flex gap-3 px-3 py-3 rounded-xl transition-colors hover:bg-paper ${urgentOpen ? "bg-danger-soft/60" : ""}`}>
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${urgentOpen ? "inc-pulse" : ""}`} style={{ background: LEVELS[inc.level]?.dot }} aria-hidden />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 flex-wrap">
            <LevelChip level={inc.level} />
            <span className="font-semibold text-sm truncate">{inc.location_name}</span>
            <span className="text-xs text-mute">กะ{SHIFT_INFO[inc.shift]?.label}</span>
          </span>
          <span className="block text-sm mt-1 line-clamp-2 text-ink/85">{inc.detail}</span>
          <span className="flex items-center gap-2 mt-1.5 text-xs text-mute">
            {showReporter && <span className="truncate">{inc.reporter_name}</span>}
            <span>{timeAgo(inc.created_at)}</span>
            {inc.has_photo && <Camera size={12} aria-label="มีรูปแนบ" />}
            <span className="ml-auto"><StatusChip status={inc.status} /></span>
          </span>
        </span>
        <ChevronRight size={16} className="text-faint self-center shrink-0" />
      </button>
    </li>
  );
}

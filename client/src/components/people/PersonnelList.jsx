import { useState } from "react";
import { Users, Check } from "lucide-react";
import { Avatar } from "../ui";
import { drag } from "../../lib/drag";
import { initials } from "../../lib/shifts";
import RankBadge from "../RankBadge";
import { OnLeaveTag } from "../leaves/LeaveChips";

/**
 * รายชื่อพนักงานในกะที่เลือก ลากไปวางที่จุดได้
 * byUser: { [userId]: assignment }  คนที่มีเวรกะนี้แล้ว
 * leaveOf: { [userId]: leave }  คนที่ลา/ขอลากะนี้
 */
export default function PersonnelList({ staff, byUser, onPick, leaveOf = {} }) {
  if (!staff.length) return <p className="text-sm text-mute py-6 text-center">ยังไม่มีพนักงาน เพิ่มได้ที่เมนูพนักงาน</p>;
  return (
    <ul>
      {staff.map((u, i) => {
        const a = byUser[u.id];
        return (
          <li key={u.id} draggable style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}
            onDragStart={(e) => drag.start(e, a ? { kind: "asg", id: a.id, name: u.name, locationId: a.location_id } : { kind: "user", userId: u.id, name: u.name })}
            onDragEnd={drag.end}
            onClick={() => onPick?.(u)}
            className="row-in flex items-center gap-3 px-3 py-3 border-b border-line cursor-grab active:cursor-grabbing hover:bg-paper rounded-xl transition-colors">
            <Avatar name={u.name} size={36} />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1.5 font-semibold min-w-0"><span className="truncate">{u.name}</span><OnLeaveTag leave={leaveOf[u.id]} /></span>
              <span className="flex items-center gap-1.5 text-xs text-mute min-w-0"><RankBadge rank={u.rank} quiet /><span className="truncate">{u.position || (u.rank === "STAFF" || !u.rank ? "เจ้าหน้าที่" : "")}</span></span>
            </span>
            {a
              ? <span className="text-xs text-mute truncate max-w-[110px]">{a.location_name}</span>
              : leaveOf[u.id]?.status === "APPROVED" ? null
              : <span className="text-xs font-semibold text-brand bg-brand-soft px-2 py-1 rounded-md">ว่าง</span>}
          </li>
        );
      })}
    </ul>
  );
}

// แถบพนักงานว่างที่ลอยอยู่บนแผนที่
const TRAY_LIMIT = 3; // แสดงกี่คนก่อนต้องกด "+N"

export function FreeTray({ free }) {
  const [open, setOpen] = useState(false);
  const done = free.length === 0;
  const shown = open ? free : free.slice(0, TRAY_LIMIT);
  const extra = free.length - TRAY_LIMIT;

  return (
    <div className="tray-in flex items-center gap-3 bg-white/95 backdrop-blur rounded-2xl p-2 pr-2.5 ring-1 ring-black/5 shadow-[0_14px_34px_-14px_rgb(23_25_28/0.4)]">
      <div className="flex items-center gap-2.5 shrink-0 self-start">
        <span className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${done ? "bg-brand-soft text-brand" : "bg-ink text-white"}`}>
          {done ? <Check size={18} /> : <Users size={18} />}
          {!done && (
            <span key={free.length} className="pop-in absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-danger text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white">
              {free.length}
            </span>
          )}
        </span>
        <div className="leading-tight pr-1">
          <div className="text-[13px] font-semibold">{done ? "จัดครบทุกคนแล้ว" : "พนักงานว่าง"}</div>
          <div className="text-[11px] text-mute mt-0.5">{done ? "ไม่มีพนักงานว่างในกะนี้" : "ลากไปวางที่จุดเวร"}</div>
        </div>
      </div>

      {!done && (
        <>
          <span className="w-px self-stretch bg-line shrink-0" />
          <div className={`flex gap-1.5 ${open ? "flex-wrap w-[360px]" : ""}`}>
            {shown.map((u, i) => (
              <span key={u.id} draggable title={`${u.name} · ลากไปวางที่จุด`}
                style={{ animationDelay: `${Math.min(i, 10) * 0.04}s` }}
                onDragStart={(e) => drag.start(e, { kind: "user", userId: u.id, name: u.name })}
                onDragEnd={drag.end}
                className="chip-in inline-flex items-center gap-1.5 h-9 pl-1 pr-3 rounded-full bg-paper text-[13px] font-semibold whitespace-nowrap
                  cursor-grab active:cursor-grabbing transition-all duration-200
                  hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-6px_rgb(23_25_28/0.35)] hover:ring-1 hover:ring-line">
                <span className="w-7 h-7 rounded-full bg-white text-ink text-[10px] font-bold flex items-center justify-center shadow-[0_1px_2px_rgb(23_25_28/0.08)]">
                  {initials(u.name)}
                </span>
                {u.name.split(" ")[0]}
              </span>
            ))}
            {extra > 0 && (
              <button type="button" onClick={() => setOpen((v) => !v)}
                className="chip-in h-9 px-3 rounded-full border border-dashed border-line text-[13px] font-semibold text-mute hover:text-ink hover:border-ink/40 transition-colors"
                style={{ animationDelay: `${shown.length * 0.04}s` }}>
                {open ? "ย่อ" : `+${extra}`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

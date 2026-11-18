import { useCallback, useState } from "react";
import { UsersRound, Phone } from "lucide-react";
import { Avatar } from "../ui";
import { api } from "../../lib/api";
import usePolling from "../../lib/usePolling";
import { SHIFT_INFO } from "../../lib/shifts";
import { checkedIn, hhmm } from "../../lib/attendance";
import AttendanceChip from "./AttendanceChip";
import RankBadge from "../RankBadge";

// หัวหน้า/รองหัวหน้า: ใครในกะของคุณเข้ากะแล้วบ้าง (อัปเดตทุก 1 นาที)
export default function LeaderTeamCard({ delay = 0.1 }) {
  const [data, setData] = useState(null);
  const load = useCallback(() => api.get("/me/team").then(setData).catch(() => {}), []);
  usePolling(load, 60000);
  if (!data?.isLeader || !data.slots.length) return null;

  return data.slots.map((slot) => {
    const inCount = slot.people.filter(checkedIn).length;
    const missing = slot.people.filter((p) => p.attendance === "MISSING").length;
    const order = { MISSING: 0, LATE: 1, WAITING: 2, UPCOMING: 3, ON_TIME: 4, ABSENT: 5 };
    const people = [...slot.people].sort((a, b) => order[a.attendance] - order[b.attendance]);
    return (
      <section key={`${slot.date}-${slot.shift}`} className="dash-rise bg-white rounded-[22px] p-4 md:p-5" style={{ animationDelay: `${delay}s` }}>
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-8 h-8 rounded-lg bg-paper flex items-center justify-center"><UsersRound size={16} /></span>
          <h2 className="font-semibold flex-1">ทีมกะ{SHIFT_INFO[slot.shift].label}ของคุณ</h2>
          <span className={`text-xs font-semibold ${missing ? "text-danger" : "text-mute"}`}>เข้าแล้ว {inCount}/{slot.people.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-track overflow-hidden mb-2">
          <div className="h-full bg-brand rounded-full transition-[width] duration-700" style={{ width: `${(inCount / slot.people.length) * 100}%` }} />
        </div>
        {people.map((p, i) => (
          <div key={p.id} style={{ animationDelay: `${delay + 0.05 + i * 0.04}s` }} className="row-in flex items-center gap-3 py-2 border-t border-line first:border-t-0">
            <Avatar name={p.name} size={36} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5"><span className="font-semibold text-sm truncate">{p.name}</span><RankBadge rank={p.rank} quiet /></div>
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                <AttendanceChip a={p} />
                <span className="text-xs text-mute truncate">{p.location_name}{p.check_in_at ? ` · ${hhmm(p.check_in_at)} น.` : ""}</span>
              </div>
            </div>
            {p.phone && !checkedIn(p) && (
              <a href={`tel:${p.phone}`} aria-label={`โทรหา ${p.name}`}
                className="w-9 h-9 rounded-xl bg-paper flex items-center justify-center text-brand hover:bg-brand-soft"><Phone size={15} /></a>
            )}
          </div>
        ))}
      </section>
    );
  });
}

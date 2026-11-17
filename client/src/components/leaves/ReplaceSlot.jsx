import { useState } from "react";
import { UserPlus, Check, ChevronDown, AlertTriangle } from "lucide-react";
import { Avatar, Spinner } from "../ui";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import { SHIFT_INFO, fmtShort } from "../../lib/shifts";
import RankBadge from "../RankBadge";

/**
 * เวร 1 ช่องที่คนลาถูกถอนออก: แสดงว่าตอนนี้มีกี่คน แล้วกดดูคนแนะนำมาแทนได้
 * slot: { date, shift, location_id, location_name, count, need, replaced_by[] }
 */
export default function ReplaceSlot({ slot, onFilled }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null); // คนที่ติดเวรต่อกัน ต้องกดยืนยันอีกครั้ง
  const full = slot.count >= slot.need;

  const toggle = async () => {
    setOpen((v) => !v);
    if (list) return;
    try { setList(await api.get("/leaves/suggest", { date: slot.date, shift: slot.shift })); }
    catch (e) { toast(errMsg(e), "error"); }
  };

  const pick = async (u) => {
    if (u.back_to_back && confirm !== u.id) { setConfirm(u.id); return; }
    setBusy(u.id);
    try {
      await api.post("/assignments", { userId: u.id, locationId: slot.location_id, date: slot.date, shift: slot.shift, force: true });
      toast(`จัด ${u.name} แทนแล้ว`);
      setOpen(false); setList(null); setConfirm(null);
      onFilled?.();
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setBusy(null); }
  };

  return (
    <li className="rounded-xl border border-line overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate">{slot.location_name}</span>
          <span className="block text-xs text-mute">{fmtShort(slot.date)} · กะ{SHIFT_INFO[slot.shift].label} · มี {slot.count}/{slot.need} คน</span>
          {slot.replaced_by?.length > 0 && <span className="block text-xs text-brand font-semibold mt-0.5">แทนโดย {slot.replaced_by.join(", ")}</span>}
        </span>
        {full ? (
          <span className="text-xs font-semibold text-brand bg-brand-soft rounded-md px-2 py-1 flex items-center gap-1"><Check size={12} />ครบแล้ว</span>
        ) : (
          <button onClick={toggle} aria-expanded={open}
            className="h-8 pl-2.5 pr-2 rounded-lg bg-ink text-white text-[13px] font-semibold flex items-center gap-1 hover:bg-black">
            <UserPlus size={14} />หาคนแทน<ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {open && !full && (
        <div className="expand-in border-t border-line bg-paper/60 px-2 py-2">
          {!list ? <div className="py-4 flex justify-center"><Spinner /></div>
            : list.length === 0 ? <p className="text-sm text-mute px-2 py-2">ไม่มีใครว่างกะนี้</p>
            : (
              <ul className="flex flex-col gap-1">
                {list.map((u, i) => (
                  <li key={u.id}>
                    <button onClick={() => pick(u)} disabled={busy != null}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white text-left disabled:opacity-60">
                      <Avatar name={u.name} size={32} />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">{u.name}<RankBadge rank={u.rank} quiet />
                          {i === 0 && !u.back_to_back && <span className="text-[10px] font-bold text-brand bg-brand-soft rounded px-1.5 py-0.5">แนะนำ</span>}
                        </span>
                        <span className="block text-xs text-mute">
                          เวร 7 วันนี้ {u.week_count} กะ
                          {u.back_to_back && <span className="text-warn font-semibold"> · ติดเวรต่อกัน</span>}
                          {u.pending_leave && <span className="text-warn font-semibold"> · มีคำขอลารออยู่</span>}
                        </span>
                      </span>
                      {busy === u.id ? <Spinner className="w-4 h-4" />
                        : confirm === u.id ? <span className="text-xs font-semibold text-warn flex items-center gap-1"><AlertTriangle size={12} />กดอีกครั้งเพื่อยืนยัน</span>
                        : <span className="text-xs font-semibold text-ink">เลือก</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
    </li>
  );
}

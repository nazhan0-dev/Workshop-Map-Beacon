import { useCallback, useState } from "react";
import { CalendarCheck2, ChevronRight, Zap } from "lucide-react";
import Header from "../../components/layout/Header";
import { Segmented, Spinner, Avatar } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import usePolling from "../../lib/usePolling";
import useLeaveSummary from "../../store/useLeaveSummary";
import { fmtRange, dayCount, shiftsText } from "../../lib/leaves";
import { timeAgo } from "../../lib/incidents";
import { LeaveTypeChip, LeaveStatusChip } from "../../components/leaves/LeaveChips";
import LeaveDetailModal from "../../components/leaves/LeaveDetailModal";
import RankBadge from "../../components/RankBadge";

const OPTS = [{ value: "pending", label: "รออนุมัติ" }, { value: "all", label: "ทั้งหมด" }];

// การลา (admin): อนุมัติคำขอ + หาคนแทนเวรที่ว่างลง
export default function LeavesPage() {
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState(null);
  const [openId, setOpenId] = useState(null);
  const pending = useLeaveSummary((s) => s.pending);

  const load = useCallback(async () => {
    try { setRows(await api.get("/leaves", { status })); useLeaveSummary.getState().refresh(); }
    catch (e) { toast(errMsg(e), "error"); }
  }, [status]);
  usePolling(load, 30000);

  return (
    <div className="h-full overflow-y-auto px-0 md:px-2 pb-6">
      <Header title="การลา" subtitle={pending ? `รออนุมัติ ${pending} คำขอ` : "ไม่มีคำขอค้าง"} />
      <div className="dash-rise surface mx-3 md:mx-0 p-3 md:p-4">
        <Segmented options={OPTS} value={status} onChange={(v) => { setRows(null); setStatus(v); }} className="sm:w-[260px] mb-2" />
        {!rows ? <div className="py-14 flex justify-center"><Spinner /></div>
          : rows.length === 0 ? (
            <div className="py-14 flex flex-col items-center text-center">
              <span className="w-14 h-14 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-3"><CalendarCheck2 size={24} /></span>
              <p className="font-semibold">{status === "pending" ? "ไม่มีคำขอลารออนุมัติ" : "ยังไม่มีใครลา"}</p>
              <p className="text-sm text-mute mt-1">ลาป่วยวันนี้ ระบบถอนเวรให้อัตโนมัติ ดูได้ในแท็บ "ทั้งหมด"</p>
            </div>
          ) : (
            <ul key={status} className="divide-y divide-line">
              {rows.map((lv, i) => (
                <li key={lv.id} className="row-in" style={{ animationDelay: `${Math.min(i, 10) * 0.03}s` }}>
                  <button onClick={() => setOpenId(lv.id)} className="w-full text-left flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-paper">
                    <Avatar name={lv.user_name} size={40} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm">{lv.user_name}</span><RankBadge rank={lv.user_rank} quiet />
                        <LeaveTypeChip type={lv.type} />
                        {lv.auto && <Zap size={12} className="text-mute" aria-label="ถอนเวรอัตโนมัติ" />}
                      </span>
                      <span className="block text-xs text-mute mt-0.5">
                        {fmtRange(lv.start_date, lv.end_date)} · {dayCount(lv.start_date, lv.end_date)} วัน · {shiftsText(lv.shifts)} · {timeAgo(lv.created_at)}
                      </span>
                      {lv.reason && <span className="block text-sm mt-1 truncate">{lv.reason}</span>}
                    </span>
                    <span className="flex flex-col items-end gap-1 shrink-0">
                      <LeaveStatusChip status={lv.status} />
                      {lv.status === "APPROVED" && lv.removed.length > 0 && <span className="text-[11px] text-mute">ถอน {lv.removed.length} กะ</span>}
                    </span>
                    <ChevronRight size={16} className="text-faint shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>
      {openId && <LeaveDetailModal key={openId} id={openId} onClose={() => { setOpenId(null); load(); }} onChanged={() => load()} />}
    </div>
  );
}

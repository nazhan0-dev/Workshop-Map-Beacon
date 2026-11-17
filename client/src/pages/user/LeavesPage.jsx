import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarOff, ChevronLeft, Plus } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import { Spinner, Button } from "../../components/ui";
import usePolling from "../../lib/usePolling";
import useMyShifts from "../../store/useMyShifts";
import { SHIFT_INFO, fmtShort } from "../../lib/shifts";
import { fmtRange, dayCount, shiftsText } from "../../lib/leaves";
import { LeaveTypeChip, LeaveStatusChip } from "../../components/leaves/LeaveChips";
import LeaveFormModal from "../../components/leaves/LeaveFormModal";

// การลาของฉัน: แจ้งลา + ดูสถานะ + ยกเลิกคำขอที่ยังรออนุมัติ
export default function LeavesPage() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const formOpen = params.has("new");

  const load = useCallback(() => api.get("/me/leaves").then(setRows).catch((e) => toast(errMsg(e), "error")), []);
  usePolling(load, 60000);

  const cancel = async (lv) => {
    setBusyId(lv.id);
    try { await api.del(`/me/leaves/${lv.id}`); toast("ยกเลิกคำขอลาแล้ว"); load(); }
    catch (e) { toast(errMsg(e), "error"); }
    finally { setBusyId(null); }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-6 pb-6 md:pt-2 flex flex-col gap-3">
      <header className="flex items-center gap-2 px-1">
        <Link to="/me" aria-label="กลับ" className="w-9 h-9 -ml-2 rounded-xl hover:bg-white flex items-center justify-center"><ChevronLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">การลา</h1>
          <p className="text-sm text-mute">ลาป่วยวันนี้ระบบถอนเวรให้ทันที แบบอื่นรอผู้ดูแลอนุมัติ</p>
        </div>
      </header>

      <button onClick={() => setParams({ new: "" })}
        className="dash-rise group bg-ink text-white rounded-[22px] p-4 flex items-center gap-4 text-left hover:bg-black transition-colors">
        <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0"><CalendarOff size={22} /></span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[17px]">แจ้งลา</span>
          <span className="block text-sm text-white/60">ลาป่วย ลากิจ หรือลาพักร้อน</span>
        </span>
        <Plus size={22} className="shrink-0 transition-transform group-hover:rotate-90" />
      </button>

      <section className="dash-rise bg-white rounded-[22px] p-3 md:p-4">
        <h2 className="font-semibold px-1 pb-2">ประวัติการลา</h2>
        {!rows ? <div className="py-8 flex justify-center"><Spinner /></div>
          : rows.length === 0 ? <p className="text-sm text-mute px-1 py-3">ยังไม่เคยลา</p>
          : (
            <ul className="divide-y divide-line">
              {rows.map((lv, i) => (
                <li key={lv.id} className="row-in px-1 py-3" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <LeaveTypeChip type={lv.type} />
                    <span className="font-semibold text-sm">{fmtRange(lv.start_date, lv.end_date)}</span>
                    <span className="text-xs text-mute">{dayCount(lv.start_date, lv.end_date)} วัน · {shiftsText(lv.shifts)}</span>
                    <span className="ml-auto"><LeaveStatusChip status={lv.status} /></span>
                  </div>
                  {lv.reason && <p className="text-sm text-mute mt-1">{lv.reason}</p>}
                  {lv.status === "APPROVED" && lv.removed.length > 0 && (
                    <p className="text-xs text-mute mt-1">ถอนออกจากเวร: {lv.removed.map((r) => `${fmtShort(r.date)} กะ${SHIFT_INFO[r.shift].label}`).join(", ")}</p>
                  )}
                  {lv.decide_note && lv.status !== "PENDING" && <p className="text-xs mt-1">“{lv.decide_note}”{lv.decided_by_name ? ` — ${lv.decided_by_name}` : ""}</p>}
                  {lv.status === "PENDING" && (
                    <Button variant="ghost" className="h-8 px-2 mt-1 -ml-2 text-danger" loading={busyId === lv.id} onClick={() => cancel(lv)}>ยกเลิกคำขอ</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
      </section>

      {formOpen && (
        <LeaveFormModal onClose={() => setParams({})}
          onSent={(r) => { setRows((l) => [r, ...(l || [])]); if (r.auto) useMyShifts.getState().load(); }} />
      )}
    </div>
  );
}

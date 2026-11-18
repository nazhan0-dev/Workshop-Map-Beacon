import { useState } from "react";
import { createPortal } from "react-dom";
import { LogIn, LogOut, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "../ui";
import { errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import useMyShifts from "../../store/useMyShifts";
import { hhmm, fmtMins, fmtDist } from "../../lib/attendance";
import CheckInModal from "./CheckInModal";

/**
 * แถบเข้ากะ/ออกกะในการ์ดเวรวันนี้ (พื้นเข้ม)
 * timing: { start, end, live, ended } จากหน้าเวรของฉัน
 */
export default function CheckInBar({ asg, timing, now }) {
  const checkOut = useMyShifts((s) => s.checkOut);
  const [open, setOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const opensAt = new Date(timing.start.getTime() - 30 * 60000);
  const canCheckIn = now >= opensAt && !timing.ended;

  const doCheckOut = async () => {
    if (!timing.ended && !confirmOut) { setConfirmOut(true); return; }
    setBusy(true);
    try { await checkOut(asg.id); toast("ออกกะแล้ว ขอบคุณที่ดูแลจุดนี้"); }
    catch (e) { toast(errMsg(e), "error"); }
    finally { setBusy(false); setConfirmOut(false); }
  };

  // ออกกะแล้ว
  if (asg.check_out_at) {
    return (
      <p className="mt-2.5 text-xs text-white/60 flex items-center gap-1.5">
        <CheckCircle2 size={13} className="text-[#7ddcac]" />เข้ากะ {hhmm(asg.check_in_at)} · ออกกะ {hhmm(asg.check_out_at)} น.
      </p>
    );
  }

  // เข้ากะแล้ว
  if (asg.check_in_at) {
    const late = asg.attendance === "LATE";
    return (
      <div className="mt-2.5">
        <div className="flex items-center gap-2.5">
          <span className="pop-in flex-1 min-w-0 h-11 rounded-[12px] bg-[#3ec482]/15 text-[#7ddcac] px-3 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 size={16} className="shrink-0" /><span className="truncate">เข้ากะแล้ว {hhmm(asg.check_in_at)} น.</span>
          </span>
          <button onClick={doCheckOut} disabled={busy} onBlur={() => setConfirmOut(false)}
            className={`h-11 px-3.5 rounded-[12px] text-sm font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${confirmOut ? "bg-white text-ink" : "border border-white/15 text-white/85 hover:bg-white/10"}`}>
            <LogOut size={15} />{confirmOut ? "ยังไม่จบกะ ออกเลย?" : "ออกกะ"}
          </button>
        </div>
        <p className="text-xs text-white/50 mt-1.5">
          {late && <span className="text-[#ffc46b]">สาย {fmtMins(asg.late_minutes)}</span>}
          {late && asg.check_in_distance != null && " · "}
          {asg.check_in_distance != null && `ห่างจุดเวร ${fmtDist(asg.check_in_distance)} ตอนเข้ากะ`}
        </p>
      </div>
    );
  }

  if (timing.ended) {
    return <p className="mt-2.5 text-xs text-[#ff9c94] flex items-center gap-1.5"><XCircle size={13} />ไม่ได้กดเข้ากะ</p>;
  }

  if (!canCheckIn) {
    return (
      <p className="mt-2.5 text-xs text-white/50 flex items-center gap-1.5">
        <Clock size={13} />กดเข้ากะได้ตั้งแต่ {opensAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น. ที่จุดเวร
      </p>
    );
  }

  const missing = asg.attendance === "MISSING";
  return (
    <>
      <Button variant="green" onClick={() => setOpen(true)}
        className={`mt-2.5 w-full h-12 rounded-[14px] text-[15px] ${missing ? "checkin-nudge" : ""}`}>
        <LogIn size={18} />เข้ากะ{missing ? ` (เลยเวลามา ${fmtMins(asg.late_minutes)})` : ""}
      </Button>
      {/* portal: การ์ดเวรเป็นพื้นเข้มตัวหนังสือขาว ไม่ให้สีหลุดเข้าไปในหน้าต่าง */}
      {open && createPortal(<CheckInModal asg={asg} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Phone, Check, X as XIcon, CalendarDays, Zap } from "lucide-react";
import { Modal, Button, Spinner, inputCls } from "../ui";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import { SHIFT_INFO, fmtShort } from "../../lib/shifts";
import { fmtRange, dayCount, shiftsText } from "../../lib/leaves";
import { timeAgo } from "../../lib/incidents";
import { LeaveTypeChip, LeaveStatusChip } from "./LeaveChips";
import ReplaceSlot from "./ReplaceSlot";
import RankBadge from "../RankBadge";

/** รายละเอียดคำขอลา + อนุมัติ/ไม่อนุมัติ + หาคนแทนเวรที่ถูกถอนออก (ใส่ key={id} ตอนใช้) */
export default function LeaveDetailModal({ id, onClose, onChanged }) {
  const [lv, setLv] = useState(null);
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get(`/leaves/${id}`).then(setLv).catch((e) => toast(errMsg(e), "error")), [id]);
  useEffect(() => { load(); }, [load]);

  const decide = async (status) => {
    setBusy(true);
    try {
      const r = await api.patch(`/leaves/${id}`, { status, note });
      setLv((p) => ({ ...p, ...r, affected: undefined }));
      setRejecting(false);
      toast(status === "APPROVED" ? `อนุมัติแล้ว ถอนออกจากเวร ${r.removed.length} กะ` : "ไม่อนุมัติคำขอนี้");
      onChanged?.(r);
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setBusy(false); }
  };

  let footer = null;
  if (lv?.status === "PENDING") {
    footer = rejecting
      ? <><Button onClick={() => setRejecting(false)}>ย้อนกลับ</Button><Button variant="danger" loading={busy} onClick={() => decide("REJECTED")}>ไม่อนุมัติ</Button></>
      : <><Button onClick={() => setRejecting(true)}><XIcon size={15} />ไม่อนุมัติ</Button><Button variant="green" loading={busy} onClick={() => decide("APPROVED")}><Check size={16} />อนุมัติ</Button></>;
  }

  const open = lv?.removed?.filter((s) => s.exists && s.count < s.need).length || 0;

  return (
    <Modal open onClose={onClose} title="คำขอลา" width="max-w-lg" footer={footer}>
      {!lv ? <div className="py-10 flex justify-center"><Spinner /></div> : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1.5 font-semibold">{lv.user_name}<RankBadge rank={lv.user_rank} quiet /></span>
              <span className="block text-xs text-mute">ส่งคำขอ {timeAgo(lv.created_at)}</span>
            </span>
            {lv.user_phone && (
              <a href={`tel:${lv.user_phone}`} className="h-9 px-3 rounded-lg bg-paper hover:bg-brand-soft text-brand text-sm font-semibold flex items-center gap-1.5"><Phone size={14} />โทร</a>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <LeaveTypeChip type={lv.type} className="text-xs px-2 py-1" />
            <LeaveStatusChip status={lv.status} />
            {lv.auto && <span className="text-[11px] font-semibold rounded-md px-1.5 py-0.5 bg-paper text-mute flex items-center gap-1"><Zap size={11} />ถอนเวรอัตโนมัติ</span>}
          </div>

          <p className="flex items-center gap-2 text-sm"><CalendarDays size={15} className="text-mute" />
            <b>{fmtRange(lv.start_date, lv.end_date)}</b><span className="text-mute">· {dayCount(lv.start_date, lv.end_date)} วัน · {shiftsText(lv.shifts)}</span></p>

          {lv.reason && <p className="text-[15px] leading-relaxed whitespace-pre-wrap bg-paper rounded-xl px-4 py-3">{lv.reason}</p>}
          {lv.photo && <img src={lv.photo} alt="เอกสารแนบ" className="rounded-xl border border-line max-h-64 w-full object-contain bg-paper" />}

          {/* ก่อนอนุมัติ: เวรที่จะถูกถอน */}
          {lv.status === "PENDING" && lv.affected && (
            <div className={`rounded-xl px-4 py-3 text-sm ${lv.affected.length ? "bg-warn-soft" : "bg-paper"}`}>
              {lv.affected.length === 0 ? <p className="text-mute">ช่วงนี้ไม่มีเวร อนุมัติได้เลยไม่กระทบการจัดเวร</p> : (
                <>
                  <p className="font-semibold text-warn mb-1">ถ้าอนุมัติ จะถอนออกจากเวร {lv.affected.length} กะ</p>
                  <ul>{lv.affected.map((a) => <li key={a.id}>• {fmtShort(a.date)} กะ{SHIFT_INFO[a.shift].label} ที่ {a.location_name}</li>)}</ul>
                </>
              )}
            </div>
          )}

          {rejecting && (
            <label className="block">
              <span className="block text-sm font-semibold mb-1.5">เหตุผลที่ไม่อนุมัติ (ไม่บังคับ)</span>
              <textarea className={`${inputCls} h-auto py-2.5 min-h-[72px]`} value={note} maxLength={500} autoFocus onChange={(e) => setNote(e.target.value)} />
            </label>
          )}

          {/* หลังอนุมัติ: หาคนแทน */}
          {lv.status === "APPROVED" && lv.removed.length > 0 && (
            <div>
              <div className="flex items-center mb-2">
                <h3 className="font-semibold text-sm flex-1">เวรที่ต้องหาคนแทน</h3>
                <span className={`text-xs font-semibold ${open ? "text-danger" : "text-brand"}`}>{open ? `ยังขาด ${open} กะ` : "จัดครบแล้ว"}</span>
              </div>
              <ul className="flex flex-col gap-2">
                {lv.removed.filter((s) => s.exists).map((s, i) => <ReplaceSlot key={`${s.date}-${s.shift}-${i}`} slot={s} onFilled={load} />)}
              </ul>
            </div>
          )}

          {lv.decided_at && lv.status !== "PENDING" && (
            <p className="text-xs text-mute">
              {lv.status === "APPROVED" ? (lv.auto ? "อนุมัติอัตโนมัติ" : "อนุมัติโดย") : "ไม่อนุมัติโดย"} {!lv.auto && <b className="text-ink">{lv.decided_by_name}</b>} · {timeAgo(lv.decided_at)}
              {lv.decide_note && !lv.auto && <span className="block mt-1 text-ink">“{lv.decide_note}”</span>}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

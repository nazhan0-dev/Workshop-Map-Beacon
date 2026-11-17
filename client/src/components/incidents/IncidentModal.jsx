import { useEffect, useRef, useState } from "react";
import { Phone, Check, CheckCheck, RotateCcw, MapPin, Clock } from "lucide-react";
import { Modal, Button, Spinner, inputCls } from "../ui";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import { SHIFT_INFO, fmtShort } from "../../lib/shifts";
import { timeAgo } from "../../lib/incidents";
import { LevelChip, StatusChip } from "./IncidentRow";
import RankBadge from "../RankBadge";

/**
 * รายละเอียดรายงาน 1 เรื่อง + ปุ่มรับเรื่อง/ปิดเรื่อง
 * base: "/incidents" (admin) หรือ "/me/incidents" (รปภ.)
 * canHandle: แสดงปุ่มจัดการไหม
 * ใส่ key={id} ตอนใช้ เพื่อให้เปิดเรื่องใหม่แล้วเริ่มจากค่าว่างเสมอ
 */
export default function IncidentModal({ id, base, canHandle, onClose, onChanged }) {
  const [inc, setInc] = useState(null);
  const [note, setNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!id) return;
    let alive = true;
    api.get(`${base}/${id}`).then((r) => alive && setInc(r)).catch((e) => { toast(errMsg(e), "error"); closeRef.current(); });
    return () => { alive = false; };
  }, [id, base]);

  const update = async (status) => {
    setBusy(true);
    try {
      const r = await api.patch(`${base}/${id}`, { status, note });
      setInc((p) => ({ ...p, ...r }));
      setClosing(false);
      toast(status === "ACK" ? "รับเรื่องแล้ว" : status === "CLOSED" ? "ปิดเรื่องแล้ว" : "เปิดเรื่องอีกครั้งแล้ว");
      onChanged?.(r);
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setBusy(false); }
  };

  let footer = null;
  if (inc && canHandle) {
    if (closing) footer = <><Button onClick={() => setClosing(false)}>ยกเลิก</Button><Button variant="green" loading={busy} onClick={() => update("CLOSED")}><CheckCheck size={16} />ปิดเรื่อง</Button></>;
    else if (inc.status === "OPEN") footer = <><Button onClick={() => setClosing(true)}>ปิดเรื่องเลย</Button><Button variant="dark" loading={busy} onClick={() => update("ACK")}><Check size={16} />รับเรื่อง</Button></>;
    else if (inc.status === "ACK") footer = <Button variant="green" onClick={() => setClosing(true)}><CheckCheck size={16} />ปิดเรื่อง</Button>;
    else footer = <Button loading={busy} onClick={() => update("OPEN")}><RotateCcw size={15} />เปิดเรื่องอีกครั้ง</Button>;
  }

  return (
    <Modal open={!!id} onClose={onClose} title="รายงานเหตุการณ์" width="max-w-lg" footer={footer}>
      {!inc ? <div className="py-10 flex justify-center"><Spinner /></div> : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <LevelChip level={inc.level} className="text-xs px-2 py-1" />
            <StatusChip status={inc.status} />
            <span className="text-xs text-mute ml-auto">{timeAgo(inc.created_at)}</span>
          </div>

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="flex items-center gap-2"><MapPin size={14} className="text-mute" /><b>{inc.location_name}</b></span>
            <span className="flex items-center gap-2 text-mute"><Clock size={14} />{fmtShort(inc.date)} · กะ{SHIFT_INFO[inc.shift]?.label} {SHIFT_INFO[inc.shift]?.time}</span>
          </div>

          <p className="text-[15px] leading-relaxed whitespace-pre-wrap bg-paper rounded-xl px-4 py-3">{inc.detail}</p>

          {inc.photo && (
            <button onClick={() => setZoom((z) => !z)} className="rounded-xl overflow-hidden border border-line bg-paper" aria-label={zoom ? "ย่อรูป" : "ขยายรูป"}>
              <img src={inc.photo} alt="รูปที่แนบมากับรายงาน" className={`w-full ${zoom ? "" : "max-h-64"} object-contain`} />
            </button>
          )}

          <div className="flex items-center gap-3 border-t border-line pt-3">
            <span className="flex-1 min-w-0">
              <span className="block text-xs text-mute">ผู้รายงาน</span>
              <span className="flex items-center gap-1.5 font-semibold text-sm">{inc.reporter_name}<RankBadge rank={inc.reporter_rank} quiet /></span>
            </span>
            {inc.reporter_phone && (
              <a href={`tel:${inc.reporter_phone}`} className="h-9 px-3 rounded-lg bg-paper hover:bg-brand-soft text-brand text-sm font-semibold flex items-center gap-1.5">
                <Phone size={14} />โทร
              </a>
            )}
          </div>

          {inc.handled_by_name && (
            <p className="text-xs text-mute">
              {inc.status === "CLOSED" ? "ปิดเรื่องโดย" : inc.status === "ACK" ? "รับเรื่องโดย" : "เปิดเรื่องอีกครั้งโดย"} <b className="text-ink">{inc.handled_by_name}</b> · {timeAgo(inc.handled_at)}
              {inc.status === "CLOSED" && inc.close_note && <span className="block mt-1 text-ink">“{inc.close_note}”</span>}
            </p>
          )}

          {closing && (
            <label className="block">
              <span className="block text-sm font-semibold mb-1.5">สรุปผล (ไม่บังคับ)</span>
              <textarea className={`${inputCls} h-auto py-2.5 min-h-[80px]`} value={note} maxLength={500} autoFocus
                onChange={(e) => setNote(e.target.value)} placeholder="เช่น ตรวจสอบแล้ว เป็นพนักงานส่งของ" />
            </label>
          )}
        </div>
      )}
    </Modal>
  );
}

import { useEffect, useRef, useState } from "react";
import { Camera, X, CheckCircle2, CalendarX2 } from "lucide-react";
import { Modal, Button, inputCls } from "../ui";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import { SHIFTS, SHIFT_INFO, fmtShort, today } from "../../lib/shifts";
import { LEAVE_TYPES, LEAVE_TYPE_KEYS } from "../../lib/leaves";
import { compressImage } from "../../lib/incidents";

/**
 * ฟอร์มแจ้งลาของ รปภ. (mount ใหม่ทุกครั้งที่เปิด ฟอร์มจึงเริ่มว่างเสมอ)
 * ลาป่วยที่เริ่มวันนี้ ระบบอนุมัติและถอนออกจากเวรทันที
 */
export default function LeaveFormModal({ onClose, onSent, initialDate }) {
  const [type, setType] = useState("SICK");
  const [start, setStart] = useState(initialDate || today());
  const [end, setEnd] = useState(initialDate || today());
  const [whole, setWhole] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [reason, setReason] = useState("");
  const [photo, setPhoto] = useState(null);
  const [affected, setAffected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const fileRef = useRef(null);

  const sel = whole ? [] : shifts;
  const valid = start && end && end >= start && (whole || shifts.length > 0);

  // เวรที่จะกระทบ: โหลดใหม่เมื่อช่วงวัน/กะเปลี่ยน
  useEffect(() => {
    if (!valid) return;
    let alive = true;
    const t = setTimeout(() => {
      api.get("/me/leaves/affected", { start, end, shifts: sel.join(",") })
        .then((r) => alive && setAffected(r))
        .catch(() => alive && setAffected(null));
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, whole, shifts.join(","), valid]);

  const toggle = (s) => setShifts((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]));
  const pickPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { setPhoto(await compressImage(f)); } catch (err) { toast(err.message, "error"); }
  };

  const instant = type === "SICK" && start === today();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post("/me/leaves", { type, start, end, shifts: sel, reason, photo });
      onSent?.(r);
      if (r.auto) setDone(r);
      else { toast(r.message); onClose(); }
    } catch (err) { toast(errMsg(err), "error"); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <Modal open onClose={onClose} title="แจ้งลาป่วยแล้ว" footer={<Button variant="dark" onClick={onClose}>เสร็จ</Button>}>
        <div className="flex flex-col gap-3 text-sm">
          <p className="flex items-start gap-2"><CheckCircle2 size={18} className="text-brand shrink-0 mt-0.5" />
            ระบบถอนคุณออกจากเวรแล้ว ผู้ดูแลเห็นแล้วและจะหาคนแทน พักผ่อนให้หายไว ๆ</p>
          {done.removed.length > 0 && (
            <ul className="bg-paper rounded-xl px-4 py-3 flex flex-col gap-1">
              {done.removed.map((r, i) => <li key={i}>• {fmtShort(r.date)} กะ{SHIFT_INFO[r.shift].label} ที่ {r.location_name}</li>)}
            </ul>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="แจ้งลา" width="max-w-lg"
      footer={<><Button onClick={onClose}>ยกเลิก</Button>
        <Button type="submit" form="leave-form" variant="dark" loading={busy} disabled={!valid}>{instant ? "แจ้งลาป่วย" : "ส่งคำขอลา"}</Button></>}>
      <form id="leave-form" onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <span id="lv-type" className="block text-sm font-semibold mb-1.5">ประเภท</span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="lv-type">
            {LEAVE_TYPE_KEYS.map((k) => {
              const T = LEAVE_TYPES[k], Icon = T.icon, on = type === k;
              return (
                <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setType(k)}
                  className={`rounded-xl border-2 px-2 py-2.5 flex flex-col items-center gap-1 transition-colors ${on ? "border-ink bg-paper" : "border-line hover:bg-paper"}`}>
                  <Icon size={18} /><span className="text-sm font-semibold">{T.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm font-semibold mb-1.5">ตั้งแต่</span>
            <input type="date" className={inputCls} value={start} min={today()} required
              onChange={(e) => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }} />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold mb-1.5">ถึง</span>
            <input type="date" className={inputCls} value={end} min={start} required onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>

        <div>
          <span id="lv-shift" className="block text-sm font-semibold mb-1.5">ช่วงเวลา</span>
          <div className="flex gap-1.5 flex-wrap" role="group" aria-labelledby="lv-shift">
            <button type="button" aria-pressed={whole} onClick={() => setWhole(true)}
              className={`h-9 px-3 rounded-lg text-sm font-semibold border ${whole ? "bg-ink text-white border-ink" : "border-line hover:bg-paper"}`}>ทั้งวัน</button>
            {SHIFTS.map((s) => {
              const on = !whole && shifts.includes(s);
              return (
                <button key={s} type="button" aria-pressed={on} onClick={() => { setWhole(false); toggle(s); }}
                  className={`h-9 px-3 rounded-lg text-sm font-semibold border ${on ? "bg-ink text-white border-ink" : "border-line hover:bg-paper"}`}>
                  กะ{SHIFT_INFO[s].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* เวรที่จะกระทบ */}
        {valid && affected && (
          <div className={`rounded-xl px-4 py-3 text-sm ${affected.length ? "bg-warn-soft" : "bg-paper"}`}>
            {affected.length === 0 ? (
              <p className="flex items-center gap-2 text-mute"><CalendarX2 size={15} />ช่วงนี้คุณไม่มีเวร</p>
            ) : (
              <>
                <p className="font-semibold text-warn mb-1">{instant ? "จะถอนออกจากเวรเหล่านี้ทันที" : `กระทบเวร ${affected.length} กะ (ถอนออกเมื่ออนุมัติ)`}</p>
                <ul className="flex flex-col gap-0.5">
                  {affected.slice(0, 6).map((a) => <li key={a.id}>• {fmtShort(a.date)} กะ{SHIFT_INFO[a.shift].label} ที่ {a.location_name}</li>)}
                  {affected.length > 6 && <li className="text-mute">และอีก {affected.length - 6} กะ</li>}
                </ul>
              </>
            )}
          </div>
        )}
        {instant && <p className="text-xs text-mute -mt-2">ลาป่วยวันนี้ไม่ต้องรออนุมัติ ระบบแจ้งผู้ดูแลให้หาคนแทนทันที</p>}

        <label className="block">
          <span className="block text-sm font-semibold mb-1.5">เหตุผล (ไม่บังคับ)</span>
          <textarea className={`${inputCls} h-auto py-2.5 min-h-[72px] leading-relaxed`} value={reason} maxLength={1000}
            onChange={(e) => setReason(e.target.value)} placeholder={type === "SICK" ? "เช่น มีไข้ ไปหาหมอ" : "เช่น ธุระที่บ้าน"} />
        </label>

        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          {photo ? (
            <div className="relative rounded-xl overflow-hidden border border-line">
              <img src={photo} alt="เอกสารแนบ" className="w-full max-h-48 object-cover" />
              <button type="button" onClick={() => setPhoto(null)} aria-label="เอารูปออก"
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-ink/70 text-white flex items-center justify-center hover:bg-ink"><X size={16} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full h-11 rounded-xl border border-dashed border-line text-sm font-semibold text-mute flex items-center justify-center gap-2 hover:bg-paper hover:text-ink">
              <Camera size={16} />{type === "SICK" ? "แนบใบรับรองแพทย์ (ไม่บังคับ)" : "แนบเอกสาร (ไม่บังคับ)"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

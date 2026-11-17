import { useRef, useState } from "react";
import { Camera, X, Phone, CheckCircle2 } from "lucide-react";
import { Modal, Button, inputCls } from "../ui";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import { SHIFT_INFO, fmtShort } from "../../lib/shifts";
import { LEVELS, LEVEL_KEYS, compressImage } from "../../lib/incidents";
import { rankLabel } from "../../lib/rank";

/**
 * ฟอร์มรายงานเหตุการณ์ของ รปภ.
 * shifts: เวรที่รายงานได้ (วันนี้ + กะดึกเมื่อคืน) พร้อม teammates
 * defaultId: เวรที่เลือกไว้ก่อน
 * แสดงเฉพาะตอนเปิด (mount ใหม่ทุกครั้ง) ฟอร์มจึงว่างเสมอ และไม่ถูกล้างตอนหน้าโหลดข้อมูลใหม่
 */
export default function ReportModal({ open, shifts, defaultId, onClose, onSent }) {
  const [asgId, setAsgId] = useState(() => (shifts.some((x) => x.id === defaultId) ? defaultId : shifts[0]?.id ?? null));
  const [level, setLevel] = useState("NORMAL");
  const [detail, setDetail] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null); // รายงานด่วนที่เพิ่งส่ง -> แสดงปุ่มโทร
  const fileRef = useRef(null);

  const asg = shifts.find((s) => s.id === asgId);
  const leaders = (asg?.teammates || []).filter((t) => t.phone && (t.rank === "HEAD" || t.rank === "DEPUTY"));

  const pickPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { setPhoto(await compressImage(f)); }
    catch (err) { toast(err.message, "error"); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post("/me/incidents", { assignmentId: asgId, level, detail, photo });
      onSent?.(r);
      if (level === "URGENT") setSent(r);
      else { toast("ส่งรายงานแล้ว"); onClose(); }
    } catch (err) { toast(errMsg(err), "error"); }
    finally { setBusy(false); }
  };

  // ส่งรายงานด่วนแล้ว: ให้โทรหาหัวหน้าต่อทันที
  if (sent) {
    return (
      <Modal open={open} onClose={onClose} title="ส่งรายงานด่วนแล้ว"
        footer={<Button variant="dark" onClick={onClose}>เสร็จ</Button>}>
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-2 text-sm"><CheckCircle2 size={18} className="text-brand shrink-0 mt-0.5" />
            หัวหน้าเวรและผู้ดูแลเห็นรายงานแล้ว แต่ถ้าเร่งด่วน โทรแจ้งด้วยจะเร็วที่สุด</p>
          {leaders.map((t) => (
            <a key={t.id} href={`tel:${t.phone}`} className="flex items-center gap-3 rounded-xl bg-danger text-white px-4 py-3.5 hover:brightness-95">
              <Phone size={18} />
              <span className="flex-1"><span className="block font-semibold">{t.name}</span><span className="block text-xs text-white/80">{rankLabel(t.rank)} · {t.phone}</span></span>
              <span className="text-sm font-semibold">โทร</span>
            </a>
          ))}
          {asg?.contact_phone && (
            <a href={`tel:${asg.contact_phone}`} className={`flex items-center gap-3 rounded-xl px-4 py-3.5 ${leaders.length ? "bg-paper hover:bg-track" : "bg-danger text-white hover:brightness-95"}`}>
              <Phone size={18} />
              <span className="flex-1"><span className="block font-semibold">หัวหน้าจุด {asg.location_name}</span><span className={`block text-xs ${leaders.length ? "text-mute" : "text-white/80"}`}>{asg.contact_phone}</span></span>
              <span className="text-sm font-semibold">โทร</span>
            </a>
          )}
          {!leaders.length && !asg?.contact_phone && <p className="text-sm text-mute">ไม่มีเบอร์หัวหน้าในกะนี้ ติดต่อผู้ดูแลระบบโดยตรง</p>}
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="รายงานเหตุการณ์" width="max-w-lg"
      footer={<><Button onClick={onClose}>ยกเลิก</Button>
        <Button type="submit" form="report-form" variant={level === "URGENT" ? "danger" : "dark"} loading={busy} disabled={!asgId || !detail.trim()}>
          {level === "URGENT" ? "ส่งรายงานด่วน" : "ส่งรายงาน"}
        </Button></>}>
      <form id="report-form" onSubmit={submit} className="flex flex-col gap-4">
        {shifts.length > 1 && (
          <div>
            <span id="rep-shift" className="block text-sm font-semibold mb-1.5">เวรที่รายงาน</span>
            <div className="flex flex-col gap-1.5" role="radiogroup" aria-labelledby="rep-shift">
              {shifts.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={asgId === s.id} onClick={() => setAsgId(s.id)}
                  className={`text-left rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${asgId === s.id ? "border-ink bg-paper" : "border-line hover:bg-paper"}`}>
                  <b>{s.location_name}</b> <span className="text-mute">· {fmtShort(s.date)} กะ{SHIFT_INFO[s.shift].label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {shifts.length === 1 && asg && (
          <p className="text-sm text-mute">{asg.location_name} · {fmtShort(asg.date)} กะ{SHIFT_INFO[asg.shift].label}</p>
        )}

        <div>
          <span id="rep-level" className="block text-sm font-semibold mb-1.5">ระดับ</span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="rep-level">
            {LEVEL_KEYS.map((k) => {
              const L = LEVELS[k], Icon = L.icon, on = level === k;
              return (
                <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setLevel(k)}
                  className={`rounded-xl border-2 px-2 py-2.5 flex flex-col items-center gap-1 transition-colors ${on ? `${L.ring} ${L.chip}` : "border-line hover:bg-paper"}`}>
                  <Icon size={18} />
                  <span className="text-sm font-semibold">{L.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-mute mt-1.5">{LEVELS[level].hint}</p>
        </div>

        <label className="block">
          <span className="block text-sm font-semibold mb-1.5">เกิดอะไรขึ้น</span>
          <textarea className={`${inputCls} h-auto py-2.5 min-h-[110px] leading-relaxed`} value={detail} maxLength={2000} required
            onChange={(e) => setDetail(e.target.value)} placeholder="เช่น พบรถไม่มีบัตรจอดในลาน B ทะเบียน กข 1234" />
        </label>

        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickPhoto} />
          {photo ? (
            <div className="relative rounded-xl overflow-hidden border border-line">
              <img src={photo} alt="รูปที่จะแนบ" className="w-full max-h-56 object-cover" />
              <button type="button" onClick={() => setPhoto(null)} aria-label="เอารูปออก"
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-ink/70 text-white flex items-center justify-center hover:bg-ink"><X size={16} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full h-12 rounded-xl border border-dashed border-line text-sm font-semibold text-mute flex items-center justify-center gap-2 hover:bg-paper hover:text-ink">
              <Camera size={17} />ถ่ายรูปหรือแนบรูป (ไม่บังคับ)
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

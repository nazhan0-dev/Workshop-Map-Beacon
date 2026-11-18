import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, LocateFixed, Camera, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal, Button, Spinner } from "../ui";
import { errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import useMyShifts from "../../store/useMyShifts";
import { compressImage } from "../../lib/incidents";
import { getPosition, distanceM, fmtDist, fmtMins } from "../../lib/attendance";

/**
 * เข้ากะ: หาตำแหน่ง -> บอกระยะจากจุดเวร -> (แนบรูปได้) -> ยืนยัน
 * ถ้าหาตำแหน่งไม่ได้ ยังลองส่งได้ ให้ server ตัดสินตามการตั้งค่า CHECKIN_GPS
 */
export default function CheckInModal({ asg, onClose }) {
  const checkIn = useMyShifts((s) => s.checkIn);
  const [pos, setPos] = useState(null);
  const [posErr, setPosErr] = useState("");
  const [locating, setLocating] = useState(true);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const locate = useCallback(async () => {
    setLocating(true); setPosErr("");
    try { setPos(await getPosition()); }
    catch (e) { setPos(null); setPosErr(e.message); }
    finally { setLocating(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { locate(); }, [locate]);

  const dist = pos ? distanceM(pos.lat, pos.lng, Number(asg.lat), Number(asg.lng)) : null;
  const slack = pos ? Math.min(pos.accuracy || 0, 100) : 0;
  const inRange = dist != null && dist - slack <= asg.checkin_radius;

  const pickPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { setPhoto(await compressImage(f, 960, 0.7)); } catch (err) { toast(err.message, "error"); }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const r = await checkIn(asg.id, { ...(pos || {}), photo });
      toast(r.attendance === "LATE" ? `เข้ากะแล้ว (สาย ${fmtMins(r.late_minutes)})` : "เข้ากะแล้ว");
      onClose();
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="เข้ากะ"
      footer={<><Button onClick={onClose}>ยกเลิก</Button>
        <Button variant="green" loading={busy} disabled={locating || (pos && !inRange)} onClick={submit}>
          <CheckCircle2 size={16} />ยืนยันเข้ากะ
        </Button></>}>
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm"><MapPin size={16} className="text-mute" /><b>{asg.location_name}</b>
          <span className="text-mute">· ต้องอยู่ในระยะ {fmtDist(asg.checkin_radius)}</span></p>

        {/* ผลการหาตำแหน่ง */}
        {locating ? (
          <div className="rounded-xl bg-paper px-4 py-5 flex items-center gap-3 text-sm"><Spinner />กำลังหาตำแหน่งของคุณ…</div>
        ) : pos ? (
          <div className={`rounded-xl px-4 py-3.5 flex items-start gap-3 ${inRange ? "bg-brand-soft" : "bg-danger-soft"}`}>
            {inRange ? <CheckCircle2 size={20} className="text-brand shrink-0 mt-0.5" /> : <AlertTriangle size={20} className="text-danger shrink-0 mt-0.5" />}
            <div className="flex-1 text-sm">
              <p className={`font-semibold ${inRange ? "text-brand" : "text-danger"}`}>
                {inRange ? `อยู่ในระยะ ห่างจุดเวร ${fmtDist(dist)}` : `อยู่ห่างจุดเวร ${fmtDist(dist)}`}
              </p>
              <p className="text-mute text-xs mt-0.5">
                {inRange ? `ความแม่นยำ GPS ±${pos.accuracy} ม.` : `ไปให้ถึงจุดเวรก่อน แล้วกดหาตำแหน่งใหม่ (ความแม่นยำ ±${pos.accuracy} ม.)`}
              </p>
            </div>
            <button onClick={locate} aria-label="หาตำแหน่งใหม่" className="w-9 h-9 rounded-lg bg-white/70 hover:bg-white flex items-center justify-center shrink-0"><LocateFixed size={16} /></button>
          </div>
        ) : (
          <div className="rounded-xl bg-warn-soft px-4 py-3.5 flex items-start gap-3 text-sm">
            <AlertTriangle size={20} className="text-warn shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-warn">หาตำแหน่งไม่ได้</p>
              <p className="text-mute text-xs mt-0.5">{posErr}</p>
            </div>
            <button onClick={locate} className="h-9 px-3 rounded-lg bg-white/70 hover:bg-white text-sm font-semibold shrink-0">ลองใหม่</button>
          </div>
        )}

        {/* รูปหน้างาน (ไม่บังคับ) */}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickPhoto} />
        {photo ? (
          <div className="relative rounded-xl overflow-hidden border border-line">
            <img src={photo} alt="รูปหน้างาน" className="w-full max-h-48 object-cover" />
            <button onClick={() => setPhoto(null)} aria-label="เอารูปออก"
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-ink/70 text-white flex items-center justify-center hover:bg-ink"><X size={16} /></button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full h-11 rounded-xl border border-dashed border-line text-sm font-semibold text-mute flex items-center justify-center gap-2 hover:bg-paper hover:text-ink">
            <Camera size={16} />ถ่ายรูปหน้างาน (ไม่บังคับ)
          </button>
        )}
      </div>
    </Modal>
  );
}

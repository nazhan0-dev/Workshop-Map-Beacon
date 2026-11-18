import { useState } from "react";
import { Sun, Sunset, Moon, Minus, Plus, LocateFixed, MousePointerClick, ChevronDown, Loader2 } from "lucide-react";
import { Modal, Button, Field, inputCls } from "../ui";
import MapView from "../map/MapView";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";

const EMPTY = { name: "", lat: "", lng: "", need_morning: 1, need_afternoon: 1, need_night: 1, checkin_radius: 200, duties: "", cautions: "", contact_phone: "" };
const SHIFTS = [
  { key: "need_morning", label: "เช้า", time: "06–14", icon: Sun },
  { key: "need_afternoon", label: "บ่าย", time: "14–22", icon: Sunset },
  { key: "need_night", label: "ดึก", time: "22–06", icon: Moon },
];
const MAX_NEED = 50;

// ปุ่ม − จำนวน + สำหรับคนต่อกะ
function Stepper({ icon, label, time, value, onChange }) {
  const Icon = icon;
  const n = Number(value) || 0;
  const btn = "w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
  return (
    <div className={`rounded-xl border p-2.5 transition-colors ${n ? "border-line bg-white" : "border-dashed border-line bg-paper/60"}`}>
      <div className="flex items-center gap-1.5 text-xs text-mute mb-2">
        <Icon size={13} className="text-ink" /><span className="font-semibold text-ink">กะ{label}</span><span className="ml-auto">{time}</span>
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onChange(Math.max(0, n - 1))} disabled={n <= 0} className={`${btn} bg-paper hover:bg-track`} aria-label={`ลดกะ${label}`}><Minus size={14} /></button>
        <span key={n} className="pop-in text-lg font-bold tabular-nums" aria-live="polite">{n}<span className="text-xs font-medium text-mute ml-1">คน</span></span>
        <button type="button" onClick={() => onChange(Math.min(MAX_NEED, n + 1))} disabled={n >= MAX_NEED} className={`${btn} bg-ink text-white hover:bg-black`} aria-label={`เพิ่มกะ${label}`}><Plus size={14} /></button>
      </div>
    </div>
  );
}

/**
 * ฟอร์มเพิ่ม/แก้ไขจุดเวร
 * initial: จุดเดิม (แก้ไข) หรือ { lat, lng } (เพิ่มจากการคลิกแผนที่) หรือ null
 * near: [lat, lng] ให้แผนที่เปิดมาที่บริเวณนี้เมื่อยังไม่มีหมุด (เช่น กลางจุดเวรที่มีอยู่)
 */
export default function AddLocationModal({ initial, near, onClose, onSaved }) {
  const editing = Boolean(initial?.id);
  const [f, setF] = useState(() => ({ ...EMPTY, ...Object.fromEntries(Object.entries(initial || {}).map(([k, v]) => [k, v ?? ""])) }));
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const [flyKey, setFlyKey] = useState(0); // เพิ่มทุกครั้งที่ต้องให้แผนที่เลื่อนไปที่หมุด (พิมพ์พิกัด/ใช้ตำแหน่งปัจจุบัน)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  // เปิดมาพร้อมหมุดแล้ว (แก้ไข / คลิกจากหน้าจัดเวร) -> จัดมุมมองไปที่หมุดครั้งแรก
  const [startedWithPoint] = useState(() => initial?.lat != null && initial?.lat !== "");

  const hasPoint = f.lat !== "" && f.lng !== "" && Number.isFinite(Number(f.lat)) && Number.isFinite(Number(f.lng))
    && Math.abs(Number(f.lat)) <= 90 && Math.abs(Number(f.lng)) <= 180;
  const setPoint = (lat, lng, fly = false) => {
    setF((s) => ({ ...s, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
    if (fly) setFlyKey((k) => k + 1);
  };

  const locate = () => {
    if (!navigator.geolocation) return toast("เบราว์เซอร์นี้หาตำแหน่งไม่ได้", "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); setPoint(p.coords.latitude, p.coords.longitude, true); },
      () => { setLocating(false); toast("หาตำแหน่งไม่ได้ ตรวจสอบว่าอนุญาตให้เข้าถึงตำแหน่งแล้ว", "error"); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...f, lat: Number(f.lat), lng: Number(f.lng),
        need_morning: Number(f.need_morning), need_afternoon: Number(f.need_afternoon), need_night: Number(f.need_night),
        checkin_radius: Number(f.checkin_radius) || 200 };
      const loc = editing ? await api.put(`/locations/${initial.id}`, body) : await api.post("/locations", body);
      toast(editing ? "บันทึกจุดเวรแล้ว" : `เพิ่ม ${loc.name} แล้ว`);
      onSaved?.(loc);
    } catch (err) {
      toast(errMsg(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const total = SHIFTS.reduce((s, x) => s + (Number(f[x.key]) || 0), 0);
  const missing = !f.name.trim() ? "ใส่ชื่อจุด" : !hasPoint ? "ปักหมุดบนแผนที่" : "";

  return (
    <Modal open onClose={onClose} title={editing ? "แก้ไขจุดเวร" : "เพิ่มจุดเวร"} width="max-w-xl"
      footer={<>
        {missing && <span key={missing} className="pop-in mr-auto self-center text-xs text-mute">ยังต้อง{missing}</span>}
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button variant="dark" type="submit" form="loc-form" loading={saving} disabled={!!missing}>
          {editing ? "บันทึก" : "เพิ่มจุด"}
        </Button>
      </>}>
      <form id="loc-form" onSubmit={save} className="flex flex-col gap-5">
        <Field label="ชื่อจุด">
          <input className={inputCls} value={f.name} onChange={set("name")} placeholder="เช่น ประตูทางเข้าหลัก" autoFocus required />
        </Field>

        {/* ตำแหน่ง */}
        <div>
          <div className="flex items-center mb-1.5">
            <span className="text-sm font-semibold flex-1">ตำแหน่งบนแผนที่</span>
            <button type="button" onClick={locate} disabled={locating}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:bg-brand-soft rounded-lg px-2 py-1 transition-colors disabled:opacity-60">
              {locating ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}ใช้ตำแหน่งปัจจุบัน
            </button>
          </div>
          <div className="relative h-56 rounded-2xl overflow-hidden border border-line">
            <MapView picking fitKey={flyKey ? `fly-${flyKey}` : startedWithPoint ? "init" : "manual"}
              center={near || undefined} zoom={near ? 16 : 13}
              markers={hasPoint ? [{ id: `p-${f.lat},${f.lng}`, lat: Number(f.lat), lng: Number(f.lng), name: f.name || "จุดใหม่", status: "none" }] : []}
              onPick={(lat, lng) => setPoint(lat, lng)} />
            {!hasPoint && (
              <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center z-[500]">
                <span className="cal-pop flex items-center gap-2 bg-ink text-white text-xs font-semibold rounded-full pl-2.5 pr-3.5 py-1.5 shadow-lg">
                  <MousePointerClick size={14} />คลิกบนแผนที่เพื่อปักหมุด
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            {hasPoint
              ? <span className="pop-in text-mute">หมุดอยู่ที่ <span className="font-mono text-ink">{Number(f.lat).toFixed(5)}, {Number(f.lng).toFixed(5)}</span> · คลิกที่อื่นเพื่อย้าย</span>
              : <span className="text-mute">ยังไม่ได้ปักหมุด</span>}
            <button type="button" onClick={() => setShowCoords((v) => !v)} className="ml-auto flex items-center gap-1 font-semibold text-mute hover:text-ink">
              กรอกพิกัดเอง<ChevronDown size={13} className={`transition-transform ${showCoords ? "rotate-180" : ""}`} />
            </button>
          </div>
          {showCoords && (
            <div className="expand-in grid grid-cols-2 gap-3 mt-2">
              <input className={inputCls} value={f.lat} onChange={set("lat")} onBlur={() => hasPoint && setFlyKey((k) => k + 1)}
                placeholder="ละติจูด เช่น 13.7563" inputMode="decimal" aria-label="ละติจูด" />
              <input className={inputCls} value={f.lng} onChange={set("lng")} onBlur={() => hasPoint && setFlyKey((k) => k + 1)}
                placeholder="ลองจิจูด เช่น 100.5018" inputMode="decimal" aria-label="ลองจิจูด" />
            </div>
          )}
        </div>

        {/* คนต่อกะ */}
        <div>
          <div className="flex items-center mb-1.5">
            <span className="text-sm font-semibold flex-1">จำนวนคนที่ต้องการต่อกะ</span>
            <span key={total} className="pop-in text-xs text-mute">รวม <b className="text-ink">{total}</b> คนต่อวัน</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SHIFTS.map((s) => (
              <Stepper key={s.key} icon={s.icon} label={s.label} time={s.time} value={f[s.key]}
                onChange={(v) => setF((x) => ({ ...x, [s.key]: v }))} />
            ))}
          </div>
          <span className="block text-xs text-mute mt-1.5">ตั้งเป็น 0 ถ้ากะนั้นไม่ต้องมีคนประจำจุดนี้</span>
        </div>

        {/* ระยะที่กดเข้ากะได้ */}
        <div>
          <label htmlFor="loc-radius" className="block text-sm font-semibold mb-1.5">ระยะที่กดเข้ากะได้</label>
          <div className="flex items-center gap-2">
            <div className="w-24 shrink-0">
              <input id="loc-radius" type="number" min={30} max={5000} step={10} className={inputCls}
                value={f.checkin_radius} onChange={set("checkin_radius")} />
            </div>
            <span className="text-sm text-mute whitespace-nowrap">เมตร</span>
            <div className="flex gap-1 ml-auto" role="group" aria-label="ระยะที่ใช้บ่อย">
              {[100, 200, 500].map((r) => (
                <button key={r} type="button" onClick={() => setF((x) => ({ ...x, checkin_radius: r }))}
                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold border ${Number(f.checkin_radius) === r ? "bg-ink text-white border-ink" : "border-line hover:bg-paper"}`}>{r}</button>
              ))}
            </div>
          </div>
          <span className="block text-xs text-mute mt-1.5">รปภ. ต้องอยู่ในระยะนี้ถึงจะกดเข้ากะได้ ในอาคาร GPS คลาดเคลื่อนง่าย แนะนำ 200 ม. ขึ้นไป</span>
        </div>

        <Field label="หน้าที่ที่จุดนี้">
          <textarea className={`${inputCls} h-20 py-2.5`} value={f.duties} onChange={set("duties")} placeholder="เช่น ตรวจบัตรผู้มาติดต่อ" />
        </Field>
        <Field label="ข้อควรระวัง">
          <textarea className={`${inputCls} h-20 py-2.5`} value={f.cautions} onChange={set("cautions")} placeholder="เช่น ห้ามจอดรถขวางทางเข้า" />
        </Field>
        <Field label="เบอร์หัวหน้าจุด">
          <input className={inputCls} value={f.contact_phone} onChange={set("contact_phone")} placeholder="02-xxx-xxxx" inputMode="tel" />
        </Field>
      </form>
    </Modal>
  );
}

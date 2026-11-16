import { useState } from "react";
import { Modal, Button, Field, inputCls } from "../ui";
import MapView from "../map/MapView";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";

const EMPTY = { name: "", lat: "", lng: "", need_morning: 1, need_afternoon: 1, need_night: 1, duties: "", cautions: "", contact_phone: "" };

/**
 * ฟอร์มเพิ่ม/แก้ไขจุดเวร
 * initial: จุดเดิม (แก้ไข) หรือ { lat, lng } (เพิ่มจากการคลิกแผนที่)
 */
export default function AddLocationModal({ initial, onClose, onSaved }) {
  const editing = Boolean(initial?.id);
  const [f, setF] = useState(() => ({ ...EMPTY, ...Object.fromEntries(Object.entries(initial || {}).map(([k, v]) => [k, v ?? ""])) }));
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const hasPoint = f.lat !== "" && f.lng !== "" && Number.isFinite(Number(f.lat)) && Number.isFinite(Number(f.lng));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...f, lat: Number(f.lat), lng: Number(f.lng),
        need_morning: Number(f.need_morning), need_afternoon: Number(f.need_afternoon), need_night: Number(f.need_night) };
      const loc = editing ? await api.put(`/locations/${initial.id}`, body) : await api.post("/locations", body);
      toast(editing ? "บันทึกจุดเวรแล้ว" : `เพิ่ม ${loc.name} แล้ว`);
      onSaved?.(loc);
    } catch (err) {
      toast(errMsg(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={editing ? "แก้ไขจุดเวร" : "เพิ่มจุดเวร"} width="max-w-xl"
      footer={<>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button variant="dark" type="submit" form="loc-form" loading={saving} disabled={!f.name.trim() || !hasPoint}>
          {editing ? "บันทึก" : "เพิ่มจุด"}
        </Button>
      </>}>
      <form id="loc-form" onSubmit={save} className="flex flex-col gap-4">
        <Field label="ชื่อจุด">
          <input className={inputCls} value={f.name} onChange={set("name")} placeholder="เช่น ประตูทางเข้าหลัก" autoFocus required />
        </Field>

        <div>
          <span className="block text-sm font-semibold mb-1.5">ตำแหน่งบนแผนที่</span>
          <div className="h-48 rounded-2xl overflow-hidden border border-line">
            <MapView picking fitKey={editing ? `e${initial.id}` : "new"}
              markers={hasPoint ? [{ id: "p", lat: Number(f.lat), lng: Number(f.lng), name: f.name || "จุดใหม่", status: "none" }] : []}
              onPick={(lat, lng) => setF((s) => ({ ...s, lat: lat.toFixed(6), lng: lng.toFixed(6) }))} />
          </div>
          <p className="text-xs text-mute mt-1">คลิกบนแผนที่เพื่อเลือกตำแหน่ง หรือพิมพ์พิกัดเอง</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <input className={inputCls} value={f.lat} onChange={set("lat")} placeholder="ละติจูด" inputMode="decimal" aria-label="ละติจูด" />
            <input className={inputCls} value={f.lng} onChange={set("lng")} placeholder="ลองจิจูด" inputMode="decimal" aria-label="ลองจิจูด" />
          </div>
        </div>

        <div>
          <span className="block text-sm font-semibold mb-1.5">จำนวนคนที่ต้องการต่อกะ</span>
          <div className="grid grid-cols-3 gap-3">
            {[["need_morning", "เช้า"], ["need_afternoon", "บ่าย"], ["need_night", "ดึก"]].map(([k, l]) => (
              <label key={k} className="block">
                <span className="block text-xs text-mute mb-1">กะ{l}</span>
                <input type="number" min={0} max={50} className={inputCls} value={f[k]} onChange={set(k)} />
              </label>
            ))}
          </div>
        </div>

        <Field label="หน้าที่ที่จุดนี้">
          <textarea className={`${inputCls} h-20 py-2.5`} value={f.duties} onChange={set("duties")} placeholder="เช่น ตรวจบัตรผู้มาติดต่อ" />
        </Field>
        <Field label="ข้อควรระวัง">
          <textarea className={`${inputCls} h-20 py-2.5`} value={f.cautions} onChange={set("cautions")} />
        </Field>
        <Field label="เบอร์หัวหน้าจุด">
          <input className={inputCls} value={f.contact_phone} onChange={set("contact_phone")} placeholder="02-xxx-xxxx" inputMode="tel" />
        </Field>
      </form>
    </Modal>
  );
}

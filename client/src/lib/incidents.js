// รายงานเหตุการณ์: ป้ายระดับ/สถานะ และตัวช่วยย่อรูปก่อนส่ง
import { CheckCircle2, AlertTriangle, Siren } from "lucide-react";

export const LEVELS = {
  NORMAL: { label: "ปกติ", hint: "แจ้งให้ทราบ ไม่มีอะไรผิดปกติ", icon: CheckCircle2, chip: "bg-brand-soft text-brand", ring: "border-brand", dot: "var(--color-brand)" },
  WARN: { label: "ผิดปกติ", hint: "มีสิ่งที่ต้องตามดู", icon: AlertTriangle, chip: "bg-warn-soft text-warn", ring: "border-warn", dot: "var(--color-warn)" },
  URGENT: { label: "ด่วน", hint: "ต้องการความช่วยเหลือทันที", icon: Siren, chip: "bg-danger-soft text-danger", ring: "border-danger", dot: "var(--color-danger)" },
};
export const LEVEL_KEYS = ["NORMAL", "WARN", "URGENT"];

export const INC_STATUS = {
  OPEN: { label: "รอรับเรื่อง", chip: "bg-danger-soft text-danger" },
  ACK: { label: "รับเรื่องแล้ว", chip: "bg-warn-soft text-warn" },
  CLOSED: { label: "ปิดแล้ว", chip: "bg-brand-soft text-brand" },
};

// "2026-11-17 14:05:00" -> Date (เวลาเครื่อง)
const toDate = (s) => new Date(String(s).replace(" ", "T"));

// "5 นาทีที่แล้ว" / "เมื่อวาน 22:10"
export function timeAgo(s, now = new Date()) {
  const d = toDate(s);
  const mins = Math.round((now - d) / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  if (mins < 6 * 60) return `${Math.floor(mins / 60)} ชม. ที่แล้ว`;
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  if (days === 0) return `วันนี้ ${time}`;
  if (days === 1) return `เมื่อวาน ${time}`;
  return `${d.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} ${time}`;
}

// ย่อรูปจากกล้อง/คลังภาพ ให้ด้านยาวไม่เกิน 1280px แล้วแปลงเป็น JPEG (ส่วนใหญ่เหลือ 100–300KB)
export function compressImage(file, max = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("เลือกได้เฉพาะไฟล์รูป"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("เปิดไฟล์รูปนี้ไม่ได้")); };
    img.src = url;
  });
}

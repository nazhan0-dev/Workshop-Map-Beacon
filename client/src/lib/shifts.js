// กะงาน 3 กะ และตัวช่วยเรื่องวันที่ (ใช้รูปแบบ "YYYY-MM-DD")
export const SHIFTS = ["MORNING", "AFTERNOON", "NIGHT"];

export const SHIFT_INFO = {
  MORNING: { label: "เช้า", time: "06:00–14:00", needKey: "need_morning" },
  AFTERNOON: { label: "บ่าย", time: "14:00–22:00", needKey: "need_afternoon" },
  NIGHT: { label: "ดึก", time: "22:00–06:00", needKey: "need_night" },
};

export const needOf = (loc, shift) => loc?.[SHIFT_INFO[shift].needKey] ?? 0;

export function toDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// วันจันทร์ของสัปดาห์นั้น
export function weekStart(s) {
  const d = parseDate(s);
  const diff = (d.getDay() + 6) % 7;
  return addDays(s, -diff);
}

export const today = () => toDateStr();

// "จ. 16 พ.ย."
export const fmtShort = (s) =>
  parseDate(s).toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });

// "จันทร์ 16 พ.ย. 2569"
export const fmtLong = (s) =>
  parseDate(s).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "short", year: "numeric" });

// สถานะของจุด: ครบ / ขาด / ว่าง
export function statusOf(count, need) {
  if (need === 0) return "none";
  if (count >= need) return "ok";
  if (count > 0) return "low";
  return "empty";
}

export const STATUS = {
  ok: { label: "ครบ", color: "var(--color-brand)" },
  low: { label: "ขาด", color: "var(--color-warn)" },
  empty: { label: "ว่าง", color: "var(--color-danger)" },
  none: { label: "ไม่ต้องมีคน", color: "var(--color-faint)" },
};

// ชื่อย่อ 2 ตัวสำหรับวงกลมโปรไฟล์ เช่น "สมชาย ใจดี" -> "สจ"
export function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  const first = (s) => [...(s || "")].find((c) => /[ก-ฮA-Za-z]/.test(c)) || "";
  return (first(parts[0]) + first(parts[1])).toUpperCase() || "?";
}

// สถานะเวลาของเวร: "เริ่มในอีก 45 นาที" / "กำลังเข้าเวร" / "จบกะแล้ว"
export function shiftTiming(a, now = new Date()) {
  const h = Number(SHIFT_INFO[a.shift].time.slice(0, 2));
  const start = parseDate(a.date);
  start.setHours(h, 0, 0, 0);
  const end = new Date(start.getTime() + 8 * 3600e3);
  if (now >= end) return { ended: true, text: "จบกะแล้ว" };
  if (now >= start) return { ended: false, text: "กำลังเข้าเวร" };
  const mins = Math.round((start - now) / 60000);
  return { ended: false, text: mins < 60 ? `เริ่มในอีก ${mins} นาที` : `เริ่มในอีก ${Math.floor(mins / 60)} ชม. ${mins % 60} นาที` };
}

// เวรที่ควรแสดงเด่น: เวรที่ยังไม่จบ เรียงตามเวลา (รวมกะดึกเมื่อคืนที่ยังไม่ถึง 06:00)
// ถ้าเวรวันนี้จบหมดแล้ว ใช้เวรแรกของวันนี้
const ORDER = { MORNING: 0, AFTERNOON: 1, NIGHT: 2 };
export function currentShift(items, day = today()) {
  const y = addDays(day, -1);
  const list = (items || [])
    .filter((i) => i.date === day || (i.date === y && i.shift === "NIGHT"))
    .sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.shift] - ORDER[b.shift]);
  return list.find((a) => !shiftTiming(a).ended) || list.find((a) => a.date === day);
}

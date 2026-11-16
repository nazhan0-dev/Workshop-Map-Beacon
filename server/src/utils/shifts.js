// ข้อมูลกะงาน และฟังก์ชันจัดการวันที่ (ใช้รูปแบบ "YYYY-MM-DD" ตลอด)
export const SHIFTS = ["MORNING", "AFTERNOON", "NIGHT"];

export const SHIFT_INFO = {
  MORNING: { label: "เช้า", start: "06:00", end: "14:00", needCol: "need_morning" },
  AFTERNOON: { label: "บ่าย", start: "14:00", end: "22:00", needCol: "need_afternoon" },
  NIGHT: { label: "ดึก", start: "22:00", end: "06:00", needCol: "need_night" },
};

export const isShift = (s) => SHIFTS.includes(s);
export const isDateStr = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return toDateStr(dt);
}

// กะที่อยู่ติดกัน (ต่อกันพอดี) ทั้งก่อนและหลังกะนี้
// เช้า(วันนี้) ← ดึก(เมื่อวาน), บ่าย ← เช้า, ดึก ← บ่าย
export function adjacentShifts(date, shift) {
  const i = SHIFTS.indexOf(shift);
  const prev = i === 0 ? { date: addDays(date, -1), shift: "NIGHT" } : { date, shift: SHIFTS[i - 1] };
  const next = i === 2 ? { date: addDays(date, 1), shift: "MORNING" } : { date, shift: SHIFTS[i + 1] };
  return [prev, next];
}

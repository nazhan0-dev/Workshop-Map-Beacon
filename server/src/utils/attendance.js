// การเข้ากะ: คำนวณช่วงเวลากะ สถานะ (ตรงเวลา/สาย/ยังไม่เข้า/ขาด) และระยะห่างจากจุดเวร
// ใช้เวลาของเครื่องที่รัน server (ไม่พึ่งเวลาของ MySQL จะได้ไม่เพี้ยนถ้าตั้ง timezone ไม่ตรงกัน)
import { SHIFT_INFO } from "./shifts.js";

export const EARLY_MIN = 30;    // กดเข้ากะได้ก่อนเริ่มกะกี่นาที
export const LATE_MIN = 10;     // เข้าหลังเริ่มกะเกินกี่นาทีถึงนับว่าสาย
export const MISSING_MIN = 15;  // เลยเวลาเริ่มกะกี่นาทีแล้วยังไม่เข้า = เตือนว่ายังไม่มา
export const SHIFT_HOURS = 8;
export const GPS_REQUIRED = (process.env.CHECKIN_GPS || "on").toLowerCase() !== "off";

const pad = (n) => String(n).padStart(2, "0");

// Date -> "YYYY-MM-DD HH:MM:SS" (เวลาเครื่อง) สำหรับเก็บลง DATETIME
export function toDateTimeStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
// "YYYY-MM-DD HH:MM:SS" -> Date (เวลาเครื่อง)
export function parseDateTime(s) {
  const [d, t = "00:00:00"] = String(s).split(" ");
  const [y, m, dd] = d.split("-").map(Number);
  const [h, mi, se] = t.split(":").map(Number);
  return new Date(y, m - 1, dd, h, mi, se || 0);
}

// เวลาเริ่ม/จบของกะ (กะดึกจบเช้าวันถัดไป)
export function shiftWindow(date, shift) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = SHIFT_INFO[shift].start.split(":").map(Number);
  const start = new Date(y, m - 1, d, h, mi);
  return { start, end: new Date(start.getTime() + SHIFT_HOURS * 3600e3) };
}

/**
 * สถานะการเข้ากะของเวร 1 รายการ
 *  UPCOMING  ยังไม่ถึงเวลา (ก่อนเปิดให้กดเข้ากะ)
 *  WAITING   เปิดให้กดแล้ว ยังไม่เข้า แต่ยังไม่เลยเวลาเตือน
 *  ON_TIME / LATE  เข้ากะแล้ว
 *  MISSING   เลยเวลาเริ่มกะเกิน MISSING_MIN แล้วยังไม่เข้า (กะยังไม่จบ)
 *  ABSENT    จบกะแล้วไม่ได้เข้า
 */
export function attendanceOf(a, now = new Date()) {
  const { start, end } = shiftWindow(a.date, a.shift);
  if (a.check_in_at) {
    const lateBy = Math.round((parseDateTime(a.check_in_at) - start) / 60000);
    return { attendance: lateBy > LATE_MIN ? "LATE" : "ON_TIME", late_minutes: Math.max(0, lateBy) };
  }
  const t = now.getTime();
  if (t < start.getTime() - EARLY_MIN * 60000) return { attendance: "UPCOMING", late_minutes: 0 };
  if (t < start.getTime() + MISSING_MIN * 60000) return { attendance: "WAITING", late_minutes: 0 };
  const late = Math.round((t - start.getTime()) / 60000);
  return { attendance: t < end.getTime() ? "MISSING" : "ABSENT", late_minutes: late };
}

export const withAttendance = (rows, now = new Date()) => rows.map((r) => ({ ...r, ...attendanceOf(r, now) }));

// ระยะทางบนผิวโลก (เมตร)
export function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

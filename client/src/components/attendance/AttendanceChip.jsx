import { ATT, attText } from "../../lib/attendance";

// ป้ายสถานะการเข้ากะ (quiet = ไม่แสดงตอนยังไม่ถึงกะ/ยังไม่ถึงเวลาเตือน)
export default function AttendanceChip({ a, quiet = false, className = "" }) {
  if (!a?.attendance) return null;
  if (quiet && (a.attendance === "UPCOMING" || a.attendance === "WAITING")) return null;
  const A = ATT[a.attendance];
  return <span className={`text-[11px] font-semibold rounded-md px-1.5 py-0.5 shrink-0 whitespace-nowrap ${A.chip} ${className}`}>{attText(a)}</span>;
}

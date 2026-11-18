// การเข้ากะ: ป้ายสถานะ + ตัวช่วยหาตำแหน่ง/วัดระยะ
export const ATT = {
  UPCOMING: { label: "ยังไม่ถึงกะ", chip: "bg-paper text-mute", dot: "var(--color-faint)" },
  WAITING: { label: "ยังไม่เข้า", chip: "bg-paper text-mute", dot: "var(--color-faint)" },
  ON_TIME: { label: "เข้ากะแล้ว", chip: "bg-brand-soft text-brand", dot: "var(--color-brand)" },
  LATE: { label: "สาย", chip: "bg-warn-soft text-warn", dot: "var(--color-warn)" },
  MISSING: { label: "ยังไม่มา", chip: "bg-danger-soft text-danger", dot: "var(--color-danger)" },
  ABSENT: { label: "ขาด", chip: "bg-danger-soft text-danger", dot: "var(--color-danger)" },
};

export const checkedIn = (a) => a.attendance === "ON_TIME" || a.attendance === "LATE";

// "สาย 12 นาที" / "ยังไม่มา 20 นาที"
export function attText(a) {
  const A = ATT[a.attendance] || ATT.WAITING;
  if ((a.attendance === "LATE" || a.attendance === "MISSING") && a.late_minutes) return `${A.label} ${fmtMins(a.late_minutes)}`;
  return A.label;
}
export const fmtMins = (m) => (m >= 60 ? `${Math.floor(m / 60)} ชม.${m % 60 ? ` ${m % 60} นาที` : ""}` : `${m} นาที`);

// "2026-11-18 05:58:00" -> "05:58"
export const hhmm = (s) => (s ? String(s).slice(11, 16) : "");

// ระยะทางบนผิวโลก (เมตร)
export function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}
export const fmtDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} กม.` : `${m} ม.`);

// ขอตำแหน่งปัจจุบัน (ใช้ได้เฉพาะเว็บ https หรือ localhost)
export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) return reject(new Error("เปิดตำแหน่งได้เฉพาะเว็บที่เป็น https"));
    if (!navigator.geolocation) return reject(new Error("เบราว์เซอร์นี้หาตำแหน่งไม่ได้"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      (e) => reject(new Error(e.code === 1 ? "ไม่ได้อนุญาตให้เข้าถึงตำแหน่ง เปิดสิทธิ์ตำแหน่งในเบราว์เซอร์แล้วลองใหม่" : "หาตำแหน่งไม่สำเร็จ ลองออกไปที่โล่งแล้วลองใหม่")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
}

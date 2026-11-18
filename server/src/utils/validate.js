// ตรวจข้อความจากฟอร์ม: ตัดช่องว่าง จำกัดความยาว
import { HttpError } from "../middlewares/error.js";

export function text(value, { label, max, required = false }) {
  const s = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (required && !s) throw new HttpError(400, `กรอก${label}`);
  if (s.length > max) throw new HttpError(400, `${label}ยาวได้ไม่เกิน ${max} ตัวอักษร`);
  return s || null;
}

// เบอร์โทร: ตัวเลข ช่องว่าง + - ( ) และ # เท่านั้น
export function phone(value, label = "เบอร์โทร") {
  const s = text(value, { label, max: 20 });
  if (s && !/^[0-9+\-() #]{3,20}$/.test(s)) throw new HttpError(400, `${label}ใช้ได้เฉพาะตัวเลขและ + - ( )`);
  return s;
}

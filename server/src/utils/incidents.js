// รายงานเหตุการณ์: ค่าคงที่และ SQL ที่ใช้ร่วมกันระหว่างฝั่ง admin และ รปภ.
import { query } from "../config/db.js";
import { HttpError } from "../middlewares/error.js";

export const LEVELS = ["NORMAL", "WARN", "URGENT"];
export const STATUSES = ["OPEN", "ACK", "CLOSED"];
export const LEADER_RANKS = ["HEAD", "DEPUTY"];

// ไม่ดึงรูปมาในรายการ (ข้อมูลใหญ่) ส่งแค่ has_photo แล้วค่อยดึงรูปตอนเปิดดูทีละเรื่อง
export const INCIDENT_SQL = `
  SELECT i.id, i.user_id, i.location_id, i.date, i.shift, i.level, i.detail, i.status,
         i.handled_at, i.close_note, i.created_at, (i.photo IS NOT NULL) AS has_photo,
         u.name AS reporter_name, u.phone AS reporter_phone, u.\`rank\` AS reporter_rank,
         l.name AS location_name, l.contact_phone,
         h.name AS handled_by_name
  FROM incidents i
  JOIN users u ON u.id = i.user_id
  JOIN locations l ON l.id = i.location_id
  LEFT JOIN users h ON h.id = i.handled_by`;

const fix = (r) => ({ ...r, has_photo: !!r.has_photo });
export const fixRows = (rows) => rows.map(fix);

export async function getIncident(id, withPhoto = false) {
  const [row] = await query(
    `${INCIDENT_SQL.replace("(i.photo IS NOT NULL) AS has_photo", withPhoto ? "(i.photo IS NOT NULL) AS has_photo, i.photo" : "(i.photo IS NOT NULL) AS has_photo")} WHERE i.id = ?`,
    [id]
  );
  if (!row) throw new HttpError(404, "ไม่พบรายงานนี้");
  return fix(row);
}

// รูปต้องเป็น data URL ของ jpeg/png/webp ขนาดไม่เกิน ~1.5MB
export function checkPhoto(photo) {
  if (photo == null || photo === "") return null;
  if (typeof photo !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)) {
    throw new HttpError(400, "ไฟล์รูปไม่ถูกต้อง");
  }
  if (photo.length > 2_000_000) throw new HttpError(413, "รูปใหญ่เกินไป");
  return photo;
}

// เปลี่ยนสถานะ: OPEN → ACK → CLOSED (ปิดแล้วเปิดใหม่ได้ ถ้าต้องตามต่อ)
export async function setStatus(id, status, note, byUserId) {
  if (!STATUSES.includes(status)) throw new HttpError(400, "สถานะไม่ถูกต้อง");
  await query(
    `UPDATE incidents SET status = ?, handled_by = ?, handled_at = NOW(),
       close_note = CASE WHEN ? = 'CLOSED' THEN ? ELSE close_note END
     WHERE id = ?`,
    [status, byUserId, status, note?.trim()?.slice(0, 500) || null, id]
  );
  return getIncident(id);
}

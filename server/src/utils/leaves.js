// การลา: ตัวช่วยที่ใช้ร่วมกันระหว่างฝั่ง รปภ. กับ admin
import { query, transaction } from "../config/db.js";
import { HttpError } from "../middlewares/error.js";
import { SHIFTS, SHIFT_INFO, isDateStr, toDateStr, addDays, adjacentShifts } from "./shifts.js";

export const LEAVE_TYPES = ["SICK", "PERSONAL", "VACATION"];
export const LEAVE_LABEL = { SICK: "ลาป่วย", PERSONAL: "ลากิจ", VACATION: "ลาพักร้อน" };
const MAX_DAYS = 31;

export const LEAVE_SQL = `
  SELECT lv.id, lv.user_id, lv.type, lv.start_date, lv.end_date, lv.shifts, lv.reason, lv.status, lv.auto,
         lv.removed, lv.decided_at, lv.decide_note, lv.created_at, (lv.photo IS NOT NULL) AS has_photo,
         u.name AS user_name, u.phone AS user_phone, u.\`rank\` AS user_rank,
         d.name AS decided_by_name
  FROM leaves lv
  JOIN users u ON u.id = lv.user_id
  LEFT JOIN users d ON d.id = lv.decided_by`;

// แปลงแถวจาก DB ให้ใช้ง่ายฝั่งเว็บ: shifts เป็น array (null = ทั้งวัน), removed เป็น array
export function fixLeave(r) {
  if (!r) return r;
  return {
    ...r,
    auto: !!r.auto,
    has_photo: !!r.has_photo,
    shifts: r.shifts ? r.shifts.split(",") : null,
    removed: r.removed ? JSON.parse(r.removed) : [],
  };
}

export async function getLeave(id, withPhoto = false) {
  const [row] = await query(
    `${withPhoto ? LEAVE_SQL.replace("(lv.photo IS NOT NULL) AS has_photo", "(lv.photo IS NOT NULL) AS has_photo, lv.photo") : LEAVE_SQL} WHERE lv.id = ?`,
    [id]
  );
  if (!row) throw new HttpError(404, "ไม่พบคำขอลานี้");
  return fixLeave(row);
}

// ตรวจและจัดรูปข้อมูลช่วงวันที่/กะ จากฟอร์ม
export function parseRange({ start, end, shifts }) {
  if (!isDateStr(start) || !isDateStr(end)) throw new HttpError(400, "เลือกวันที่ลา");
  if (end < start) throw new HttpError(400, "วันสุดท้ายต้องไม่ก่อนวันแรก");
  if (addDays(start, MAX_DAYS - 1) < end) throw new HttpError(400, `ลาได้ครั้งละไม่เกิน ${MAX_DAYS} วัน`);
  const list = Array.isArray(shifts) ? shifts.filter((s) => SHIFTS.includes(s)) : [];
  // เลือกครบ 3 กะ = ทั้งวัน
  return { start, end, shifts: list.length && list.length < 3 ? [...new Set(list)] : null };
}

// เวรของคนนี้ที่อยู่ในช่วงลา
export function affectedAssignments(userId, { start, end, shifts }, q = query) {
  return q(
    `SELECT a.id, a.date, a.shift, a.location_id, l.name AS location_name
     FROM assignments a JOIN locations l ON l.id = a.location_id
     WHERE a.user_id = ? AND a.date BETWEEN ? AND ? ${shifts ? "AND a.shift IN (?)" : ""}
     ORDER BY a.date, FIELD(a.shift,'MORNING','AFTERNOON','NIGHT')`,
    shifts ? [userId, start, end, shifts] : [userId, start, end]
  );
}

// อนุมัติ: ถอนคนออกจากเวรในช่วงลา แล้วเก็บรายการไว้หาคนแทน
export async function approveLeave(leave, byUserId, note = null, auto = false) {
  const range = { start: leave.start_date, end: leave.end_date, shifts: leave.shifts };
  // ถอนเวร + อัปเดตคำขอ ต้องสำเร็จพร้อมกัน (ล็อกคำขอไว้ กันกดอนุมัติซ้อนกัน)
  await transaction(async (q) => {
    const [cur] = await q("SELECT status FROM leaves WHERE id = ? FOR UPDATE", [leave.id]);
    if (cur.status !== "PENDING") throw new HttpError(409, "คำขอนี้ตัดสินไปแล้ว");
    const rows = await affectedAssignments(leave.user_id, range, q);
    if (rows.length) await q("DELETE FROM assignments WHERE id IN (?)", [rows.map((r) => r.id)]);
    const removed = rows.map(({ date, shift, location_id, location_name }) => ({ date, shift, location_id, location_name }));
    await q(
      `UPDATE leaves SET status = 'APPROVED', auto = ?, removed = ?, decided_by = ?, decided_at = NOW(), decide_note = ? WHERE id = ?`,
      [auto ? 1 : 0, JSON.stringify(removed), byUserId, note, leave.id]
    );
  });
  return getLeave(leave.id);
}

// ลาที่อนุมัติแล้วและครอบคลุมวัน/กะนี้
export async function approvedLeaveOn(userId, date, shift) {
  const [row] = await query(
    `SELECT id, type FROM leaves WHERE user_id = ? AND status = 'APPROVED'
       AND ? BETWEEN start_date AND end_date AND (shifts IS NULL OR FIND_IN_SET(?, shifts))`,
    [userId, date, shift]
  );
  return row || null;
}

// เวรที่ถูกถอนออก + มีใครมาแทนแล้วบ้าง (คนที่ถูกจัดเข้าจุดเดียวกันหลังวันอนุมัติ)
export async function withReplacements(leave) {
  if (!leave.removed.length || !leave.decided_at) return leave;
  const removed = await Promise.all(leave.removed.map(async (slot) => {
    const [loc] = await query("SELECT * FROM locations WHERE id = ?", [slot.location_id]);
    const people = await query(
      `SELECT u.name, a.created_at FROM assignments a JOIN users u ON u.id = a.user_id
       WHERE a.location_id = ? AND a.date = ? AND a.shift = ?`,
      [slot.location_id, slot.date, slot.shift]
    );
    return {
      ...slot,
      exists: !!loc,
      count: people.length,
      need: loc ? loc[SHIFT_INFO[slot.shift].needCol] : 0,
      replaced_by: people.filter((p) => p.created_at >= leave.decided_at).map((p) => p.name),
    };
  }));
  return { ...leave, removed };
}

// แนะนำคนแทน: ว่างกะนั้น ไม่ได้ลา ไม่ติดเวรต่อกัน และมีเวรสัปดาห์นี้น้อยที่สุด
export async function suggestReplacements(date, shift) {
  const [prev, next] = adjacentShifts(date, shift);
  const weekFrom = addDays(date, -3), weekTo = addDays(date, 3);
  const rows = await query(
    `SELECT u.id, u.name, u.phone, u.\`rank\`, u.position,
       (SELECT COUNT(*) FROM assignments a WHERE a.user_id = u.id AND a.date BETWEEN ? AND ?) AS week_count,
       EXISTS (SELECT 1 FROM assignments a WHERE a.user_id = u.id AND ((a.date = ? AND a.shift = ?) OR (a.date = ? AND a.shift = ?))) AS back_to_back,
       EXISTS (SELECT 1 FROM leaves lv WHERE lv.user_id = u.id AND lv.status = 'PENDING'
               AND ? BETWEEN lv.start_date AND lv.end_date AND (lv.shifts IS NULL OR FIND_IN_SET(?, lv.shifts))) AS pending_leave
     FROM users u
     WHERE u.role = 'USER'
       AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.user_id = u.id AND a.date = ? AND a.shift = ?)
       AND NOT EXISTS (SELECT 1 FROM leaves lv WHERE lv.user_id = u.id AND lv.status = 'APPROVED'
               AND ? BETWEEN lv.start_date AND lv.end_date AND (lv.shifts IS NULL OR FIND_IN_SET(?, lv.shifts)))
     ORDER BY back_to_back, pending_leave, week_count, u.name
     LIMIT 8`,
    [weekFrom, weekTo, prev.date, prev.shift, next.date, next.shift, date, shift, date, shift, date, shift]
  );
  return rows.map((r) => ({ ...r, week_count: Number(r.week_count), back_to_back: !!r.back_to_back, pending_leave: !!r.pending_leave }));
}

export const todayStr = () => toDateStr(new Date());

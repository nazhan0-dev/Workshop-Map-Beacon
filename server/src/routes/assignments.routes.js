// จัดเวร (เฉพาะ ADMIN)
import { Router } from "express";
import { query, transaction } from "../config/db.js";
import { HttpError } from "../middlewares/error.js";
import { SHIFT_INFO, isShift, isDateStr, adjacentShifts, addDays } from "../utils/shifts.js";
import { approvedLeaveOn, LEAVE_LABEL } from "../utils/leaves.js";
import { withAttendance } from "../utils/attendance.js";

const router = Router();

const LIST_SQL = `
  SELECT a.id, a.user_id, a.location_id, a.date, a.shift, a.acknowledged_at,
         a.check_in_at, a.check_out_at, a.check_in_distance, (a.check_in_photo IS NOT NULL) AS has_check_in_photo,
         u.name AS user_name, u.position AS user_position, u.\`rank\` AS user_rank, l.name AS location_name
  FROM assignments a
  JOIN users u ON u.id = a.user_id
  JOIN locations l ON l.id = a.location_id`;

async function getLocation(id, q = query, lock = false) {
  const [loc] = await q(`SELECT * FROM locations WHERE id = ?${lock ? " FOR UPDATE" : ""}`, [id]);
  if (!loc) throw new HttpError(404, "ไม่พบจุดเวร");
  return loc;
}

// เช็กว่าจุดนี้ในกะนี้ยังรับคนได้ไหม (เรียกในทรานแซกชันหลังล็อกแถวของจุดแล้ว กันจัดพร้อมกันจนเกินจำนวน)
async function assertCapacity(q, loc, date, shift) {
  const need = loc[SHIFT_INFO[shift].needCol];
  const [{ n }] = await q(
    "SELECT COUNT(*) AS n FROM assignments WHERE location_id = ? AND date = ? AND shift = ?",
    [loc.id, date, shift]
  );
  if (n >= need) {
    throw new HttpError(409, `${loc.name} กะ${SHIFT_INFO[shift].label} ครบ ${need} คนแล้ว`, { code: "FULL" });
  }
}

// GET /api/assignments?date=YYYY-MM-DD&shift=MORNING
router.get("/", async (req, res) => {
  const { date, shift } = req.query;
  if (!isDateStr(date)) throw new HttpError(400, "ระบุวันที่ (YYYY-MM-DD)");
  if (shift && !isShift(shift)) throw new HttpError(400, "กะไม่ถูกต้อง");
  const rows = shift
    ? await query(`${LIST_SQL} WHERE a.date = ? AND a.shift = ? ORDER BY FIELD(u.\`rank\`,'HEAD','DEPUTY','STAFF'), a.id`, [date, shift])
    : await query(`${LIST_SQL} WHERE a.date = ? ORDER BY a.shift, a.id`, [date]);
  res.json(withAttendance(rows.map((r) => ({ ...r, has_check_in_photo: !!r.has_check_in_photo }))));
});

// GET /api/assignments/:id/check-in-photo  รูปที่ถ่ายตอนเข้ากะ
router.get("/:id/check-in-photo", async (req, res) => {
  const [r] = await query("SELECT check_in_photo FROM assignments WHERE id = ?", [req.params.id]);
  if (!r?.check_in_photo) throw new HttpError(404, "ไม่มีรูปเข้ากะ");
  res.json({ photo: r.check_in_photo });
});

// POST /api/assignments  { userId, locationId, date, shift, force }
// force=true คือยืนยันแล้วแม้จะเป็นเวรต่อกัน
router.post("/", async (req, res) => {
  const { userId, locationId, date, shift, force } = req.body || {};
  if (!isDateStr(date) || !isShift(shift)) throw new HttpError(400, "วันที่หรือกะไม่ถูกต้อง");

  const [user] = await query("SELECT id, name, role FROM users WHERE id = ?", [userId]);
  if (!user) throw new HttpError(404, "ไม่พบพนักงาน");
  if (user.role !== "USER") throw new HttpError(400, "จัดเวรให้ผู้ดูแลระบบไม่ได้");
  // เช็กจุดเต็มก่อนรอบหนึ่งเพื่อตอบเร็ว (เช็กจริงอีกครั้งในทรานแซกชันตอนบันทึก)
  await assertCapacity(query, await getLocation(locationId), date, shift);

  const [existing] = await query(
    `${LIST_SQL} WHERE a.user_id = ? AND a.date = ? AND a.shift = ?`, [userId, date, shift]
  );
  if (existing) {
    throw new HttpError(409, `${user.name} มีเวรกะนี้ที่ ${existing.location_name} แล้ว`, {
      code: "ALREADY_ASSIGNED", assignmentId: existing.id,
    });
  }

  const leave = await approvedLeaveOn(user.id, date, shift);
  if (leave) throw new HttpError(409, `${user.name} ${LEAVE_LABEL[leave.type]}กะนี้ (อนุมัติแล้ว)`, { code: "ON_LEAVE" });

  if (!force) {
    const adj = adjacentShifts(date, shift);
    const conflicts = await query(
      `${LIST_SQL} WHERE a.user_id = ? AND ((a.date = ? AND a.shift = ?) OR (a.date = ? AND a.shift = ?))`,
      [userId, adj[0].date, adj[0].shift, adj[1].date, adj[1].shift]
    );
    if (conflicts.length) {
      throw new HttpError(409, `${user.name} จะต้องทำงานต่อกันหลายกะ`, {
        code: "BACK_TO_BACK",
        conflicts: conflicts.map((c) => ({ date: c.date, shift: c.shift, location_name: c.location_name })),
      });
    }
  }

  const id = await transaction(async (q) => {
    const loc = await getLocation(locationId, q, true);
    await assertCapacity(q, loc, date, shift);
    const r = await q("INSERT INTO assignments (user_id, location_id, date, shift) VALUES (?, ?, ?, ?)", [user.id, loc.id, date, shift]);
    return r.insertId;
  });
  const [row] = await query(`${LIST_SQL} WHERE a.id = ?`, [id]);
  res.status(201).json(row);
});

// PATCH /api/assignments/:id  { locationId }  ย้ายไปจุดอื่นในกะเดียวกัน
router.patch("/:id", async (req, res) => {
  const [a] = await query("SELECT * FROM assignments WHERE id = ?", [req.params.id]);
  if (!a) throw new HttpError(404, "ไม่พบเวรนี้");
  if (Number(req.body?.locationId) === a.location_id) return res.json(a);
  await transaction(async (q) => {
    const loc = await getLocation(req.body?.locationId, q, true);
    await assertCapacity(q, loc, a.date, a.shift);
    // ย้ายจุดถือว่าเป็นเวรใหม่ ต้องรับทราบและเข้ากะใหม่ที่จุดใหม่
    await q(
      `UPDATE assignments SET location_id = ?, acknowledged_at = NULL,
         check_in_at = NULL, check_in_lat = NULL, check_in_lng = NULL, check_in_distance = NULL, check_in_photo = NULL, check_out_at = NULL
       WHERE id = ?`,
      [loc.id, a.id]
    );
  });
  const [row] = await query(`${LIST_SQL} WHERE a.id = ?`, [a.id]);
  res.json(row);
});

// DELETE /api/assignments/:id  ถอนออกจากเวร
router.delete("/:id", async (req, res) => {
  const r = await query("DELETE FROM assignments WHERE id = ?", [req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, "ไม่พบเวรนี้");
  res.json({ message: "ถอนออกจากเวรแล้ว" });
});

// POST /api/assignments/copy
//   { mode: "day",  from: "2026-11-15", to: "2026-11-16" }   คัดลอกทั้งวัน (ทุกกะ)
//   { mode: "week", from: "2026-11-09", to: "2026-11-16" }   คัดลอก 7 วัน เริ่มจากวันที่ระบุ
// ข้ามคนที่มีเวรกะนั้นอยู่แล้ว และจุดที่คนเต็มแล้ว
router.post("/copy", async (req, res) => {
  const { mode, from, to } = req.body || {};
  if (!isDateStr(from) || !isDateStr(to)) throw new HttpError(400, "วันที่ไม่ถูกต้อง");
  if (from === to) throw new HttpError(400, "วันต้นทางกับปลายทางต้องไม่ใช่วันเดียวกัน");
  const days = mode === "week" ? 7 : 1;

  const locs = await query("SELECT * FROM locations");
  const locById = Object.fromEntries(locs.map((l) => [l.id, l]));
  let copied = 0, skipped = 0;

  for (let i = 0; i < days; i++) {
    const src = addDays(from, i);
    const dst = addDays(to, i);
    const rows = await query("SELECT * FROM assignments WHERE date = ?", [src]);
    const existing = await query("SELECT user_id, location_id, shift FROM assignments WHERE date = ?", [dst]);
    const taken = new Set(existing.map((e) => `${e.user_id}|${e.shift}`));
    const count = {};
    existing.forEach((e) => { const k = `${e.location_id}|${e.shift}`; count[k] = (count[k] || 0) + 1; });

    for (const r of rows) {
      const loc = locById[r.location_id];
      const k = `${r.location_id}|${r.shift}`;
      const need = loc ? loc[SHIFT_INFO[r.shift].needCol] : 0;
      if (taken.has(`${r.user_id}|${r.shift}`) || (count[k] || 0) >= need || (await approvedLeaveOn(r.user_id, dst, r.shift))) { skipped++; continue; }
      await query("INSERT INTO assignments (user_id, location_id, date, shift) VALUES (?, ?, ?, ?)",
        [r.user_id, r.location_id, dst, r.shift]);
      taken.add(`${r.user_id}|${r.shift}`);
      count[k] = (count[k] || 0) + 1;
      copied++;
    }
  }
  const message = copied + skipped === 0
    ? (mode === "week" ? "สัปดาห์ต้นทางไม่มีเวรให้คัดลอก" : "วันต้นทางไม่มีเวรให้คัดลอก")
    : `คัดลอก ${copied} เวร` + (skipped ? ` (ข้าม ${skipped} ที่ซ้ำ จุดเต็ม หรือคนลา)` : "");
  res.json({ copied, skipped, message });
});

export default router;

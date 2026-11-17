// สรุปภาพรวมประจำวัน (เฉพาะ ADMIN)
import { Router } from "express";
import { query } from "../config/db.js";
import { HttpError } from "../middlewares/error.js";
import { SHIFTS, SHIFT_INFO, isDateStr } from "../utils/shifts.js";

const router = Router();

// GET /api/dashboard?date=YYYY-MM-DD
router.get("/", async (req, res) => {
  const { date } = req.query;
  if (!isDateStr(date)) throw new HttpError(400, "ระบุวันที่ (YYYY-MM-DD)");

  const [[{ staff }], locations, assignments, freeStaff] = await Promise.all([
    query("SELECT COUNT(*) AS staff FROM users WHERE role = 'USER'"),
    query("SELECT * FROM locations ORDER BY id"),
    query(
      `SELECT a.id, a.user_id, a.location_id, a.shift, a.acknowledged_at, u.name AS user_name, l.name AS location_name
       FROM assignments a JOIN users u ON u.id = a.user_id JOIN locations l ON l.id = a.location_id
       WHERE a.date = ? ORDER BY FIELD(a.shift,'MORNING','AFTERNOON','NIGHT'), u.name`,
      [date]
    ),
    query(
      `SELECT id, name, position, \`rank\` FROM users
       WHERE role = 'USER' AND id NOT IN (SELECT user_id FROM assignments WHERE date = ?) ORDER BY name`,
      [date]
    ),
  ]);

  const count = {};
  assignments.forEach((a) => { const k = `${a.location_id}|${a.shift}`; count[k] = (count[k] || 0) + 1; });

  const perShift = SHIFTS.map((shift) => ({
    shift,
    assigned: assignments.filter((a) => a.shift === shift).length,
    need: locations.reduce((s, l) => s + l[SHIFT_INFO[shift].needCol], 0),
  }));

  const understaffed = [];
  for (const shift of SHIFTS) {
    for (const l of locations) {
      const need = l[SHIFT_INFO[shift].needCol];
      const assigned = count[`${l.id}|${shift}`] || 0;
      if (assigned < need) understaffed.push({ location_id: l.id, location_name: l.name, shift, assigned, need });
    }
  }

  res.json({
    date,
    totals: {
      staff,
      locations: locations.length,
      need: perShift.reduce((s, p) => s + p.need, 0),
      assigned: assignments.length,
      acknowledged: assignments.filter((a) => a.acknowledged_at).length,
    },
    perShift,
    understaffed,
    freeStaff,
    acknowledgements: assignments,
  });
});

export default router;

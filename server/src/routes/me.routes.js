// ข้อมูลของ รปภ. ที่ล็อกอินอยู่
import { Router } from "express";
import { query } from "../config/db.js";
import { HttpError } from "../middlewares/error.js";
import { isDateStr, toDateStr, addDays } from "../utils/shifts.js";

const router = Router();
const RANK_ORDER = { HEAD: 0, DEPUTY: 1, STAFF: 2 };

// GET /api/me/assignments?from=YYYY-MM-DD&days=14
// เวรของฉันตั้งแต่วันที่ from พร้อมรายละเอียดจุดและเพื่อนร่วมกะ
router.get("/assignments", async (req, res) => {
  const from = isDateStr(req.query.from) ? req.query.from : toDateStr(new Date());
  const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 60);
  const to = addDays(from, days - 1);

  const rows = await query(
    `SELECT a.id, a.date, a.shift, a.acknowledged_at, a.location_id,
            l.name AS location_name, l.lat, l.lng, l.duties, l.cautions, l.contact_phone
     FROM assignments a JOIN locations l ON l.id = a.location_id
     WHERE a.user_id = ? AND a.date BETWEEN ? AND ?
     ORDER BY a.date, FIELD(a.shift,'MORNING','AFTERNOON','NIGHT')`,
    [req.user.id, from, to]
  );

  if (rows.length) {
    const mates = await query(
      `SELECT a.location_id, a.date, a.shift, u.id, u.name, u.phone, u.position, u.\`rank\`
       FROM assignments a JOIN users u ON u.id = a.user_id
       WHERE a.user_id <> ? AND (a.location_id, a.date, a.shift) IN (${rows.map(() => "(?, ?, ?)").join(",")})`,
      [req.user.id, ...rows.flatMap((r) => [r.location_id, r.date, r.shift])]
    );
    rows.forEach((r) => {
      r.teammates = mates
        .filter((m) => m.location_id === r.location_id && m.date === r.date && m.shift === r.shift)
        .sort((x, y) => RANK_ORDER[x.rank] - RANK_ORDER[y.rank])
        .map(({ id, name, phone, position, rank }) => ({ id, name, phone, position, rank }));
    });
  }
  res.json(rows);
});

// POST /api/me/assignments/:id/ack  กดรับทราบเวร
router.post("/assignments/:id/ack", async (req, res) => {
  const r = await query(
    "UPDATE assignments SET acknowledged_at = COALESCE(acknowledged_at, NOW()) WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id]
  );
  if (!r.affectedRows) throw new HttpError(404, "ไม่พบเวรนี้");
  const [row] = await query("SELECT id, acknowledged_at FROM assignments WHERE id = ?", [req.params.id]);
  res.json(row);
});

export default router;

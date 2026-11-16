// จัดการจุดเวร
import { Router } from "express";
import { query } from "../config/db.js";
import { adminOnly } from "../middlewares/auth.js";
import { HttpError } from "../middlewares/error.js";

const router = Router();

function pickBody(b = {}) {
  const name = (b.name || "").trim();
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!name) throw new HttpError(400, "กรอกชื่อจุด");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new HttpError(400, "พิกัดไม่ถูกต้อง");
  }
  const need = (v) => {
    const n = Number(v ?? 1);
    if (!Number.isInteger(n) || n < 0 || n > 50) throw new HttpError(400, "จำนวนคนต่อกะต้องเป็น 0–50");
    return n;
  };
  return [
    name, lat, lng,
    b.duties?.trim() || null, b.cautions?.trim() || null, b.contact_phone?.trim() || null,
    need(b.need_morning), need(b.need_afternoon), need(b.need_night),
  ];
}

// GET /api/locations  (ทุกคนที่ล็อกอินดูได้)
router.get("/", async (req, res) => {
  res.json(await query("SELECT * FROM locations ORDER BY id"));
});

router.post("/", adminOnly, async (req, res) => {
  const r = await query(
    `INSERT INTO locations (name, lat, lng, duties, cautions, contact_phone, need_morning, need_afternoon, need_night)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    pickBody(req.body)
  );
  const [loc] = await query("SELECT * FROM locations WHERE id = ?", [r.insertId]);
  res.status(201).json(loc);
});

router.put("/:id", adminOnly, async (req, res) => {
  const r = await query(
    `UPDATE locations SET name=?, lat=?, lng=?, duties=?, cautions=?, contact_phone=?,
     need_morning=?, need_afternoon=?, need_night=? WHERE id=?`,
    [...pickBody(req.body), req.params.id]
  );
  if (!r.affectedRows) throw new HttpError(404, "ไม่พบจุดเวร");
  const [loc] = await query("SELECT * FROM locations WHERE id = ?", [req.params.id]);
  res.json(loc);
});

router.delete("/:id", adminOnly, async (req, res) => {
  const r = await query("DELETE FROM locations WHERE id = ?", [req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, "ไม่พบจุดเวร");
  res.json({ message: "ลบจุดเวรแล้ว" });
});

export default router;

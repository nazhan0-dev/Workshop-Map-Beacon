// รายงานเหตุการณ์ (เฉพาะ ADMIN)
import { Router } from "express";
import { query } from "../config/db.js";
import { HttpError } from "../middlewares/error.js";
import { isDateStr } from "../utils/shifts.js";
import { INCIDENT_SQL, LEVELS, fixRows, getIncident, setStatus } from "../utils/incidents.js";

const router = Router();

// GET /api/incidents?status=open|closed|all&date=YYYY-MM-DD&level=URGENT&location=3
// status=open คือเรื่องที่ยังไม่ปิด (OPEN + ACK)
router.get("/", async (req, res) => {
  const { status = "open", date, level, location } = req.query;
  const where = [], params = [];
  if (status === "open") where.push("i.status IN ('OPEN','ACK')");
  else if (status === "closed") where.push("i.status = 'CLOSED'");
  if (isDateStr(date)) { where.push("i.date = ?"); params.push(date); }
  if (LEVELS.includes(level)) { where.push("i.level = ?"); params.push(level); }
  if (Number(location)) { where.push("i.location_id = ?"); params.push(Number(location)); }
  const rows = await query(
    `${INCIDENT_SQL} ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY i.status = 'CLOSED', FIELD(i.level,'URGENT','WARN','NORMAL'), i.created_at DESC
     LIMIT 200`,
    params
  );
  res.json(fixRows(rows));
});

// GET /api/incidents/summary  จำนวนเรื่องค้างต่อจุด (ใช้ขึ้นเครื่องหมายบนแผนที่และตัวเลขที่เมนู)
router.get("/summary", async (req, res) => {
  const rows = await query(
    `SELECT location_id, COUNT(*) AS open, SUM(level = 'URGENT') AS urgent
     FROM incidents WHERE status IN ('OPEN','ACK') GROUP BY location_id`
  );
  const byLocation = Object.fromEntries(rows.map((r) => [r.location_id, { open: Number(r.open), urgent: Number(r.urgent) }]));
  res.json({
    open: rows.reduce((s, r) => s + Number(r.open), 0),
    urgent: rows.reduce((s, r) => s + Number(r.urgent), 0),
    byLocation,
  });
});

// GET /api/incidents/:id  (มีรูปด้วย)
router.get("/:id", async (req, res) => {
  res.json(await getIncident(req.params.id, true));
});

// PATCH /api/incidents/:id  { status: "ACK" | "CLOSED" | "OPEN", note }
router.patch("/:id", async (req, res) => {
  await getIncident(req.params.id);
  const { status, note } = req.body || {};
  if (!status) throw new HttpError(400, "ระบุสถานะ");
  res.json(await setStatus(req.params.id, status, note, req.user.id));
});

export default router;

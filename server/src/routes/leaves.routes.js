// การลา (เฉพาะ ADMIN)
import { Router } from "express";
import { query } from "../config/db.js";
import { HttpError } from "../middlewares/error.js";
import { isDateStr, isShift } from "../utils/shifts.js";
import { LEAVE_SQL, fixLeave, getLeave, approveLeave, withReplacements, suggestReplacements, affectedAssignments } from "../utils/leaves.js";

const router = Router();

// GET /api/leaves?status=pending|all
router.get("/", async (req, res) => {
  const pending = (req.query.status || "pending") === "pending";
  const rows = await query(
    `${LEAVE_SQL} ${pending ? "WHERE lv.status = 'PENDING'" : ""}
     ORDER BY lv.status = 'PENDING' DESC, lv.start_date DESC, lv.created_at DESC LIMIT 200`
  );
  res.json(rows.map(fixLeave));
});

// GET /api/leaves/summary  จำนวนคำขอที่รออนุมัติ (ตัวเลขบนเมนู)
router.get("/summary", async (req, res) => {
  const [{ pending }] = await query("SELECT COUNT(*) AS pending FROM leaves WHERE status = 'PENDING'");
  res.json({ pending: Number(pending) });
});

// GET /api/leaves/on?date=YYYY-MM-DD  ใครลา/ขอลาวันนี้ (ใช้ขึ้นป้ายในหน้าจัดเวร)
router.get("/on", async (req, res) => {
  if (!isDateStr(req.query.date)) throw new HttpError(400, "ระบุวันที่");
  const rows = await query(
    `SELECT user_id, type, status, shifts FROM leaves
     WHERE status IN ('PENDING','APPROVED') AND ? BETWEEN start_date AND end_date`,
    [req.query.date]
  );
  res.json(rows.map((r) => ({ ...r, shifts: r.shifts ? r.shifts.split(",") : null })));
});

// GET /api/leaves/suggest?date=&shift=  คนที่เหมาะจะมาแทน
router.get("/suggest", async (req, res) => {
  const { date, shift } = req.query;
  if (!isDateStr(date) || !isShift(shift)) throw new HttpError(400, "ระบุวันที่และกะ");
  res.json(await suggestReplacements(date, shift));
});

// GET /api/leaves/:id  (มีรูปแนบ + เวรที่ต้องหาคนแทน)
router.get("/:id", async (req, res) => {
  const leave = await getLeave(req.params.id, true);
  if (leave.status === "PENDING") {
    leave.affected = await affectedAssignments(leave.user_id, { start: leave.start_date, end: leave.end_date, shifts: leave.shifts });
  }
  res.json(await withReplacements(leave));
});

// PATCH /api/leaves/:id  { status: "APPROVED" | "REJECTED", note }
router.patch("/:id", async (req, res) => {
  const leave = await getLeave(req.params.id);
  const { status, note } = req.body || {};
  if (leave.status !== "PENDING") throw new HttpError(409, "คำขอนี้ตัดสินไปแล้ว");
  const n = note?.trim()?.slice(0, 500) || null;
  if (status === "APPROVED") {
    return res.json(await withReplacements(await approveLeave(leave, req.user.id, n)));
  }
  if (status === "REJECTED") {
    await query("UPDATE leaves SET status = 'REJECTED', decided_by = ?, decided_at = NOW(), decide_note = ? WHERE id = ?", [req.user.id, n, leave.id]);
    return res.json(await getLeave(leave.id));
  }
  throw new HttpError(400, "สถานะไม่ถูกต้อง");
});

export default router;

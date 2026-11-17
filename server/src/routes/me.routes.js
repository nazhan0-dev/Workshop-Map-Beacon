// ข้อมูลของ รปภ. ที่ล็อกอินอยู่
import { Router } from "express";
import { query } from "../config/db.js";
import { HttpError } from "../middlewares/error.js";
import { isDateStr, toDateStr, addDays } from "../utils/shifts.js";
import { LEAVE_SQL, LEAVE_TYPES, LEAVE_LABEL, fixLeave, getLeave, parseRange, affectedAssignments, approveLeave, todayStr } from "../utils/leaves.js";
import { INCIDENT_SQL, LEVELS, LEADER_RANKS, fixRows, getIncident, checkPhoto, setStatus } from "../utils/incidents.js";

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

// ---------- รายงานเหตุการณ์ ----------

async function myRank(userId) {
  const [u] = await query("SELECT `rank` FROM users WHERE id = ?", [userId]);
  return u?.rank || "STAFF";
}

// หัวหน้า/รองหัวหน้า ดูแลเรื่องที่เกิดในกะที่ตัวเองเข้าเวร (ทุกจุดในกะนั้น)
async function canLead(userId, inc) {
  if (!LEADER_RANKS.includes(await myRank(userId))) return false;
  const [a] = await query(
    "SELECT id FROM assignments WHERE user_id = ? AND date = ? AND shift = ?",
    [userId, inc.date, inc.shift]
  );
  return !!a;
}

// GET /api/me/incidents  -> { isLeader, mine: [...], team: [...] }
router.get("/incidents", async (req, res) => {
  const isLeader = LEADER_RANKS.includes(await myRank(req.user.id));
  const mine = await query(
    `${INCIDENT_SQL} WHERE i.user_id = ? ORDER BY i.created_at DESC LIMIT 30`,
    [req.user.id]
  );
  const team = isLeader
    ? await query(
        `${INCIDENT_SQL}
         JOIN assignments a ON a.user_id = ? AND a.date = i.date AND a.shift = i.shift
         WHERE i.user_id <> ? AND i.date >= ?
         ORDER BY i.status = 'CLOSED', FIELD(i.level,'URGENT','WARN','NORMAL'), i.created_at DESC
         LIMIT 50`,
        [req.user.id, req.user.id, addDays(toDateStr(new Date()), -7)]
      )
    : [];
  res.json({ isLeader, mine: fixRows(mine), team: fixRows(team) });
});

// POST /api/me/incidents  { assignmentId, level, detail, photo }
// รายงานได้เฉพาะเวรของตัวเองที่เป็นของเมื่อวาน (กะดึก) หรือวันนี้
router.post("/incidents", async (req, res) => {
  const { assignmentId, level, detail, photo } = req.body || {};
  const text = (detail || "").trim();
  if (!text) throw new HttpError(400, "เขียนรายละเอียดเหตุการณ์");
  if (text.length > 2000) throw new HttpError(400, "รายละเอียดยาวเกิน 2000 ตัวอักษร");
  const [a] = await query("SELECT * FROM assignments WHERE id = ? AND user_id = ?", [assignmentId, req.user.id]);
  if (!a) throw new HttpError(400, "เลือกเวรที่จะรายงาน");
  const today = toDateStr(new Date());
  if (a.date > today || a.date < addDays(today, -1)) throw new HttpError(400, "รายงานได้เฉพาะเวรวันนี้หรือกะดึกเมื่อคืน");

  const r = await query(
    "INSERT INTO incidents (user_id, location_id, date, shift, level, detail, photo) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [req.user.id, a.location_id, a.date, a.shift, LEVELS.includes(level) ? level : "NORMAL", text, checkPhoto(photo)]
  );
  res.status(201).json(await getIncident(r.insertId));
});

// GET /api/me/incidents/:id  (มีรูป) คนรายงานเอง หรือหัวหน้าในกะนั้น
router.get("/incidents/:id", async (req, res) => {
  const inc = await getIncident(req.params.id, true);
  if (inc.user_id !== req.user.id && !(await canLead(req.user.id, inc))) throw new HttpError(403, "ไม่มีสิทธิ์ดูรายงานนี้");
  res.json(inc);
});

// PATCH /api/me/incidents/:id  { status, note }  เฉพาะหัวหน้า/รองในกะนั้น
router.patch("/incidents/:id", async (req, res) => {
  const inc = await getIncident(req.params.id);
  if (!(await canLead(req.user.id, inc))) throw new HttpError(403, "เฉพาะหัวหน้าหรือรองหัวหน้าในกะนี้");
  const { status, note } = req.body || {};
  res.json(await setStatus(inc.id, status, note, req.user.id));
});

// ---------- การลา ----------

// GET /api/me/leaves
router.get("/leaves", async (req, res) => {
  const rows = await query(`${LEAVE_SQL} WHERE lv.user_id = ? ORDER BY lv.start_date DESC, lv.id DESC LIMIT 50`, [req.user.id]);
  res.json(rows.map(fixLeave));
});

// GET /api/me/leaves/affected?start=&end=&shifts=MORNING,NIGHT  เวรที่จะกระทบถ้าลาช่วงนี้
router.get("/leaves/affected", async (req, res) => {
  const range = parseRange({ ...req.query, shifts: req.query.shifts ? String(req.query.shifts).split(",") : [] });
  res.json(await affectedAssignments(req.user.id, range));
});

// POST /api/me/leaves  { type, start, end, shifts: [], reason, photo }
// ลาป่วยที่เริ่มวันนี้ = ป่วยมาทำงานไม่ได้แล้ว ระบบอนุมัติและถอนออกจากเวรทันที แล้วขึ้นให้ admin เห็น
router.post("/leaves", async (req, res) => {
  const b = req.body || {};
  if (!LEAVE_TYPES.includes(b.type)) throw new HttpError(400, "เลือกประเภทการลา");
  const range = parseRange(b);
  const today = todayStr();
  if (range.start < today) throw new HttpError(400, "ลาย้อนหลังไม่ได้ ติดต่อผู้ดูแลระบบ");

  // กันลาซ้อน: ช่วงวันทับกัน และกะทับกัน (ทั้งวันถือว่าทับทุกกะ)
  const near = await query(
    `SELECT shifts FROM leaves WHERE user_id = ? AND status IN ('PENDING','APPROVED') AND start_date <= ? AND end_date >= ?`,
    [req.user.id, range.end, range.start]
  );
  const clash = near.some((l) => !l.shifts || !range.shifts || l.shifts.split(",").some((x) => range.shifts.includes(x)));
  if (clash) throw new HttpError(409, "มีคำขอลาที่ทับช่วงนี้อยู่แล้ว");

  const reason = (b.reason || "").trim().slice(0, 1000) || null;
  const r = await query(
    "INSERT INTO leaves (user_id, type, start_date, end_date, shifts, reason, photo) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [req.user.id, b.type, range.start, range.end, range.shifts ? range.shifts.join(",") : null, reason, checkPhoto(b.photo)]
  );
  let leave = await getLeave(r.insertId);
  if (b.type === "SICK" && range.start === today) {
    leave = await approveLeave(leave, null, "อนุมัติอัตโนมัติ (ลาป่วยวันนี้)", true);
  }
  res.status(201).json({ ...leave, message: leave.auto
    ? `${LEAVE_LABEL.SICK}แล้ว ถอนออกจากเวร ${leave.removed.length} กะ ผู้ดูแลจะหาคนแทน`
    : "ส่งคำขอลาแล้ว รอผู้ดูแลอนุมัติ" });
});

// DELETE /api/me/leaves/:id  ยกเลิกคำขอที่ยังรออนุมัติ
router.delete("/leaves/:id", async (req, res) => {
  const r = await query("UPDATE leaves SET status = 'CANCELLED' WHERE id = ? AND user_id = ? AND status = 'PENDING'", [req.params.id, req.user.id]);
  if (!r.affectedRows) throw new HttpError(409, "ยกเลิกได้เฉพาะคำขอที่ยังรออนุมัติ");
  res.json({ message: "ยกเลิกคำขอลาแล้ว" });
});

export default router;

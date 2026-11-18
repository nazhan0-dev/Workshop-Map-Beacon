import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./config/db.js";
import { auth, adminOnly } from "./middlewares/auth.js";
import { securityHeaders, csrfGuard, ALLOWED_ORIGINS } from "./middlewares/security.js";
import { notFound, errorHandler } from "./middlewares/error.js";
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import locationsRoutes from "./routes/locations.routes.js";
import assignmentsRoutes from "./routes/assignments.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import meRoutes from "./routes/me.routes.js";
import incidentsRoutes from "./routes/incidents.routes.js";
import leavesRoutes from "./routes/leaves.routes.js";

// ---------- ตรวจค่าตั้งค่าก่อนเปิด server ----------
const secret = process.env.JWT_SECRET || "";
if (!secret) {
  console.error("ยังไม่ได้ตั้ง JWT_SECRET ในไฟล์ .env (คัดลอกจาก .env.example)");
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && (secret.length < 32 || secret.includes("change-me"))) {
  console.error("JWT_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร และห้ามใช้ค่าตัวอย่างตอนใช้งานจริง");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true"); // เปิดเมื่ออยู่หลัง reverse proxy เพื่อให้ได้ IP จริง
app.use(securityHeaders);
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: "3mb" })); // เผื่อรูปแนบ (รายงาน/ใบลา/รูปเข้ากะ)
app.use("/api", csrfGuard);

// ใช้เช็กว่า API และฐานข้อมูลพร้อม
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: true });
  } catch {
    res.status(503).json({ ok: false, db: false });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/locations", auth, locationsRoutes);
app.use("/api/me", auth, meRoutes);
app.use("/api/users", auth, adminOnly, usersRoutes);
app.use("/api/assignments", auth, adminOnly, assignmentsRoutes);
app.use("/api/dashboard", auth, adminOnly, dashboardRoutes);
app.use("/api/incidents", auth, adminOnly, incidentsRoutes);
app.use("/api/leaves", auth, adminOnly, leavesRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);
const server = app.listen(PORT, () => console.log(`API พร้อมที่ http://localhost:${PORT}`));

// ปิดอย่างนุ่มนวล: รอคำขอที่ค้างอยู่ แล้วปิดการเชื่อมต่อฐานข้อมูล
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => server.close(() => pool.end().finally(() => process.exit(0))));
}

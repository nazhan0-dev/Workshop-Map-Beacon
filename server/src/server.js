import "dotenv/config";
import express from "express";
import cors from "cors";
import { auth, adminOnly } from "./middlewares/auth.js";
import { notFound, errorHandler } from "./middlewares/error.js";
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import locationsRoutes from "./routes/locations.routes.js";
import assignmentsRoutes from "./routes/assignments.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import meRoutes from "./routes/me.routes.js";
import incidentsRoutes from "./routes/incidents.routes.js";
import leavesRoutes from "./routes/leaves.routes.js";

if (!process.env.JWT_SECRET) {
  console.error("ยังไม่ได้ตั้ง JWT_SECRET ในไฟล์ .env (คัดลอกจาก .env.example)");
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "3mb" })); // เผื่อรูปแนบในรายงานเหตุการณ์

app.get("/api/health", (req, res) => res.json({ ok: true }));
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
app.listen(PORT, () => console.log(`API พร้อมที่ http://localhost:${PORT}`));

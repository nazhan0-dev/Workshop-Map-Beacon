import mysql from "mysql2/promise";
import "dotenv/config";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "workshop_map",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // คืนค่า DATE เป็น "YYYY-MM-DD" ไม่แปลงเป็น Date (กันปัญหา timezone)
  decimalNumbers: true,
});

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

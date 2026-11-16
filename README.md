# Workshop Map — ระบบจัดเวร รปภ.

ระบบจัดเวรเจ้าหน้าที่รักษาความปลอดภัย มี 2 ฝั่ง

- **ผู้ดูแล (Admin):** จัดเวรบนแผนที่ตามวันและกะ, ดูภาพรวมประจำวัน, จัดการพนักงานและจุดเวร
- **รปภ. (User):** ดูเวรของตัวเอง กดรับทราบเวร ดูเพื่อนร่วมกะ และนำทางไปจุดด้วย Google Maps

| ส่วน | เทคโนโลยี |
|---|---|
| หน้าเว็บ (`client/`) | React + Vite, Tailwind CSS, Zustand, React Router, react-leaflet |
| API (`server/`) | Node.js + Express, mysql2, JWT, bcryptjs |
| ฐานข้อมูล | MySQL |

## วิธีรันครั้งแรก

ต้องมี Node.js 20.19 ขึ้นไป และ MySQL ที่รันอยู่ในเครื่อง

### 1. ตั้งค่า API

```bash
cd server
npm install
```

เปิดไฟล์ `server/.env` แล้วแก้ `DB_USER` / `DB_PASSWORD` ให้ตรงกับ MySQL ของคุณ จากนั้นสร้างฐานข้อมูลพร้อมข้อมูลตัวอย่าง:

```bash
npm run db:init
npm run dev
```

API จะรันที่ `http://localhost:5000`

### 2. รันหน้าเว็บ (เปิดอีก terminal)

```bash
cd client
npm install
npm run dev
```

เปิด `http://localhost:5173`

### บัญชีตัวอย่าง

| สิทธิ์ | ชื่อผู้ใช้ | รหัสผ่าน |
|---|---|---|
| ผู้ดูแล | `admin` | `admin1234` |
| รปภ. | `somchai`, `somying`, `wichai`, `suda`, `prayut`, `malee`, `thana` | `123456` |

## กะงาน

| กะ | เวลา |
|---|---|
| เช้า | 06:00–14:00 |
| บ่าย | 14:00–22:00 |
| ดึก | 22:00–06:00 |

## API

ทุกเส้นยกเว้น login ต้องส่ง `Authorization: Bearer <token>`

| สิทธิ์ | Method | Path | หน้าที่ |
|---|---|---|---|
| ทุกคน | POST | `/api/auth/login` | เข้าสู่ระบบ |
| ทุกคน | GET | `/api/auth/me` | ข้อมูลผู้ใช้ที่ล็อกอิน |
| ทุกคน | PUT | `/api/auth/password` | เปลี่ยนรหัสผ่าน |
| ทุกคน | GET | `/api/locations` | รายการจุดเวร |
| Admin | POST / PUT / DELETE | `/api/locations/:id` | เพิ่ม แก้ ลบจุด |
| Admin | GET / POST / PUT / DELETE | `/api/users/:id` | จัดการพนักงาน |
| Admin | POST | `/api/users/:id/reset-password` | รีเซ็ตรหัสผ่าน |
| Admin | GET | `/api/assignments?date=&shift=` | เวรของวันและกะ |
| Admin | POST | `/api/assignments` | จัดคนเข้าจุด (เช็กจุดเต็ม, เวรซ้ำ, เวรต่อกัน) |
| Admin | PATCH | `/api/assignments/:id` | ย้ายจุด |
| Admin | DELETE | `/api/assignments/:id` | ถอนออกจากเวร |
| Admin | POST | `/api/assignments/copy` | คัดลอกเวร `{ mode: "day" \| "week", from, to }` |
| Admin | GET | `/api/dashboard?date=` | สรุปภาพรวม |
| รปภ. | GET | `/api/me/assignments` | เวรของฉัน พร้อมเพื่อนร่วมกะ |
| รปภ. | POST | `/api/me/assignments/:id/ack` | รับทราบเวร |

### การเตือนเวรต่อกัน

ถ้าจัดคนเข้ากะที่ติดกับกะที่เขามีอยู่แล้ว (เช่น ดึกต่อเช้าวันถัดไป หรือเช้าต่อบ่าย) API จะตอบ `409` พร้อม `code: "BACK_TO_BACK"` หน้าเว็บจะถามยืนยันก่อน แล้วส่งซ้ำพร้อม `force: true`

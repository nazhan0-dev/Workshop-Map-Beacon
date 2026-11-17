-- ไฟล์ติดตั้งฐานข้อมูลแบบรันใน MySQL Workbench ได้เลย
-- เปิดไฟล์นี้ใน Workbench (File > Open SQL Script) แล้วกดปุ่มสายฟ้า ⚡ เพื่อรันทั้งหมด
-- บัญชีตัวอย่าง: admin / admin1234  และ  somchai / 123456

CREATE DATABASE IF NOT EXISTS workshop_map CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE workshop_map;

-- Workshop Map: ระบบจัดเวร รปภ.
-- ตารางหลัก 5 ตาราง: users, locations, assignments, incidents, leaves

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER',
  `rank`        ENUM('HEAD','DEPUTY','STAFF') NOT NULL DEFAULT 'STAFF',
  position      VARCHAR(100) NULL,
  phone         VARCHAR(20)  NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS locations (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  lat            DECIMAL(10,7) NOT NULL,
  lng            DECIMAL(10,7) NOT NULL,
  duties         TEXT NULL,          -- หน้าที่ที่จุดนี้
  cautions       TEXT NULL,          -- ข้อควรระวัง
  contact_phone  VARCHAR(20) NULL,   -- เบอร์หัวหน้าจุด
  need_morning   INT NOT NULL DEFAULT 1,
  need_afternoon INT NOT NULL DEFAULT 1,
  need_night     INT NOT NULL DEFAULT 1,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assignments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  location_id     INT NOT NULL,
  date            DATE NOT NULL,
  shift           ENUM('MORNING','AFTERNOON','NIGHT') NOT NULL,
  acknowledged_at DATETIME NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- คนหนึ่งอยู่ได้จุดเดียวต่อกะ
  UNIQUE KEY uq_user_shift (user_id, date, shift),
  KEY idx_date_shift (date, shift),
  CONSTRAINT fk_asg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_asg_loc  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- รายงานเหตุการณ์จาก รปภ.
CREATE TABLE IF NOT EXISTS incidents (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,                 -- คนรายงาน
  location_id   INT NOT NULL,
  date          DATE NOT NULL,                -- วันของกะ (กะดึกนับวันที่เริ่มกะ)
  shift         ENUM('MORNING','AFTERNOON','NIGHT') NOT NULL,
  level         ENUM('NORMAL','WARN','URGENT') NOT NULL DEFAULT 'NORMAL', -- ปกติ / ผิดปกติ / ด่วน
  detail        TEXT NOT NULL,
  photo         MEDIUMTEXT NULL,              -- รูปแบบ data URL (ย่อขนาดจากฝั่งเว็บแล้ว)
  status        ENUM('OPEN','ACK','CLOSED') NOT NULL DEFAULT 'OPEN',      -- เปิด / รับเรื่อง / ปิด
  handled_by    INT NULL,                     -- คนรับเรื่องหรือปิดเรื่องล่าสุด
  handled_at    DATETIME NULL,
  close_note    VARCHAR(500) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_inc_status (status, created_at),
  KEY idx_inc_slot (date, shift, location_id),
  CONSTRAINT fk_inc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_inc_loc  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  CONSTRAINT fk_inc_by   FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- การลาของ รปภ.
CREATE TABLE IF NOT EXISTS leaves (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  type         ENUM('SICK','PERSONAL','VACATION') NOT NULL,    -- ลาป่วย / ลากิจ / ลาพักร้อน
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  shifts       SET('MORNING','AFTERNOON','NIGHT') NULL,        -- NULL = ทั้งวัน
  reason       VARCHAR(1000) NULL,
  photo        MEDIUMTEXT NULL,                                -- ใบรับรองแพทย์ ฯลฯ (data URL)
  status       ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  auto         TINYINT(1) NOT NULL DEFAULT 0,                  -- 1 = ลาป่วยวันนั้น ระบบอนุมัติและถอนเวรให้ทันที
  removed      TEXT NULL,                                      -- เวรที่ถูกถอนออก (JSON) ใช้หาคนแทน
  decided_by   INT NULL,
  decided_at   DATETIME NULL,
  decide_note  VARCHAR(500) NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_leave_user (user_id, start_date),
  KEY idx_leave_status (status, start_date),
  CONSTRAINT fk_leave_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_by   FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



INSERT INTO users (name, username, password_hash, role, `rank`, position, phone) VALUES
 ("ผู้ดูแลระบบ","admin","$2b$10$kM2A8./4PAGr/kop/Wkhm.fEwYh2OLF3ECjFrnB1fIhxPevdIxFMm","ADMIN","STAFF","ผู้ดูแลระบบ","080-000-0000"),
 ("สมชาย ใจดี","somchai","$2b$10$yGeSzQJRDcmPBrLL2xHIvepRhqOgq7BYoWaBO5iBXfIrClKK21y..","USER","HEAD",NULL,"081-111-1111"),
 ("สมหญิง รักงาน","somying","$2b$10$yGeSzQJRDcmPBrLL2xHIvepRhqOgq7BYoWaBO5iBXfIrClKK21y..","USER","DEPUTY",NULL,"081-222-2222"),
 ("วิชัย มานะ","wichai","$2b$10$yGeSzQJRDcmPBrLL2xHIvepRhqOgq7BYoWaBO5iBXfIrClKK21y..","USER","STAFF",NULL,"081-333-3333"),
 ("สุดา สวยงาม","suda","$2b$10$yGeSzQJRDcmPBrLL2xHIvepRhqOgq7BYoWaBO5iBXfIrClKK21y..","USER","STAFF",NULL,"081-444-4444"),
 ("ประยุทธ ขยัน","prayut","$2b$10$yGeSzQJRDcmPBrLL2xHIvepRhqOgq7BYoWaBO5iBXfIrClKK21y..","USER","DEPUTY",NULL,"081-555-5555"),
 ("มาลี ยิ้มแย้ม","malee","$2b$10$yGeSzQJRDcmPBrLL2xHIvepRhqOgq7BYoWaBO5iBXfIrClKK21y..","USER","STAFF",NULL,"081-666-6666"),
 ("ธนา ใจกล้า","thana","$2b$10$yGeSzQJRDcmPBrLL2xHIvepRhqOgq7BYoWaBO5iBXfIrClKK21y..","USER","HEAD",NULL,"081-777-7777");

INSERT INTO locations (name, lat, lng, duties, cautions, contact_phone, need_morning, need_afternoon, need_night) VALUES
 ("ประตูทางเข้าหลัก",13.7651,100.5066,"ตรวจบัตรผู้มาติดต่อทุกคน แลกบัตรก่อนเข้าอาคาร","ห้ามจอดรถขวางทางเข้า","02-111-1234",2,2,2),
 ("ลานจอดรถ B",13.7638,100.5089,"ดูแลการจอดรถ ตรวจรถเข้า-ออก","ระวังรถถอยหลังช่วงเลิกงาน","02-111-2345",2,1,1),
 ("อาคารสำนักงาน A",13.7629,100.5064,"เดินตรวจทุกชั้นทุก 2 ชั่วโมง","ปิดไฟห้องที่ไม่มีคนหลัง 20:00","02-111-3456",2,2,1),
 ("จุดตรวจประตูหลัง",13.7617,100.5049,"เปิด-ปิดประตูให้รถขนส่ง","ตรวจใบส่งของทุกครั้ง","02-111-4567",1,1,1),
 ("คลังสินค้า",13.7611,100.5081,"ตรวจล็อกประตูคลังและกล้อง","ห้ามบุคคลภายนอกเข้า","02-111-5678",2,1,2);

INSERT INTO assignments (user_id, location_id, date, shift) VALUES
 (2,1,CURDATE(),"MORNING"),(3,1,CURDATE(),"MORNING"),(6,2,CURDATE(),"MORNING"),
 (4,3,CURDATE(),"MORNING"),(8,3,CURDATE(),"MORNING"),
 (5,1,CURDATE(),"AFTERNOON"),(7,2,CURDATE(),"AFTERNOON"),
 (2,2,CURDATE() + INTERVAL 1 DAY,"AFTERNOON"),(3,1,CURDATE() + INTERVAL 1 DAY,"MORNING");

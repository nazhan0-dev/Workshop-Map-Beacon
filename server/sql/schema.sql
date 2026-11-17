-- Workshop Map: ระบบจัดเวร รปภ.
-- ตารางหลัก 3 ตาราง: users, locations, assignments

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER',
  `rank`        ENUM('HEAD','DEPUTY','STAFF') NOT NULL DEFAULT 'STAFF', -- ตำแหน่ง: หัวหน้า / รองหัวหน้า / เจ้าหน้าที่
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

-- Workshop Map: ระบบจัดเวร รปภ.
-- ตารางหลัก 3 ตาราง: users, locations, assignments

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER',
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

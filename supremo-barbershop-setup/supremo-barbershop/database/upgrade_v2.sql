-- ============================================================
--  Supremo Barbershop - Upgrade v2
-- ============================================================
--  Idagdag ang mga bagong feature nang HINDI nabubura ang
--  kasalukuyang data (users, services, barbers, appointments).
--
--  PAANO GAMITIN:
--   1. Buksan ang http://localhost/phpmyadmin
--   2. Piliin ang database na "supremo_barbershop"
--   3. Import > piliin ang file na ito > Import
--
--  ISANG BESES LANG ITO PATAKBUHIN. Kapag inulit, mag-e-error
--  ang mga ALTER TABLE dahil naidagdag na ang mga column.
-- ============================================================

USE supremo_barbershop;

-- ------------------------------------------------------------
-- 1. Bagong role: Barber
-- ------------------------------------------------------------
ALTER TABLE users
  MODIFY role ENUM('Admin', 'User', 'Barber') NOT NULL DEFAULT 'User';

-- ------------------------------------------------------------
-- 2. I-link ang barber record sa isang login account.
--    NULL ang user_id kapag wala pang login ang barber.
-- ------------------------------------------------------------
ALTER TABLE barbers
  ADD COLUMN user_id INT UNSIGNED NULL AFTER id,
  ADD UNIQUE KEY uq_barber_user (user_id),
  ADD CONSTRAINT fk_barber_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 3. Appointment: presyo na naka-save at mas maraming status
--    Kailangan ang naka-save na presyo para tama ang report
--    kahit magbago ang presyo ng service o may discount.
-- ------------------------------------------------------------
ALTER TABLE appointments
  MODIFY status ENUM('Approved', 'Cancelled', 'Completed', 'No-show') NOT NULL DEFAULT 'Approved',
  ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER appointment_time,
  ADD COLUMN discount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER price,
  ADD COLUMN final_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER discount,
  ADD COLUMN promo_id INT UNSIGNED NULL AFTER final_price;

-- Punan ang presyo ng mga lumang appointment mula sa services table.
UPDATE appointments a
  JOIN services s ON s.id = a.service_id
   SET a.price = s.price,
       a.final_price = s.price
 WHERE a.price = 0;

-- ------------------------------------------------------------
-- 4. Day off / hindi available na araw ng barber
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS barber_days_off (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  barber_id INT UNSIGNED NOT NULL,
  off_date DATE NOT NULL,
  reason VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_barber_day (barber_id, off_date),
  CONSTRAINT fk_dayoff_barber FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. Feedback (stars + note) - isa lang kada appointment
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT UNSIGNED NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL,
  barber_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_feedback_barber (barber_id),
  CONSTRAINT fk_feedback_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_barber FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. Promo codes (ginagawa ng admin, ginagamit ng customer)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL DEFAULT '',
  discount_type ENUM('Percent', 'Fixed') NOT NULL DEFAULT 'Percent',
  discount_value DECIMAL(10,2) NOT NULL,
  service_id INT UNSIGNED NULL,                   -- NULL = lahat ng service
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  usage_limit INT UNSIGNED NOT NULL DEFAULT 0,    -- 0 = walang limit
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_promo_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE appointments
  ADD CONSTRAINT fk_appointment_promo FOREIGN KEY (promo_id) REFERENCES promos(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 7. Settings ng shop (oras ng booking, pangalan, atbp.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(60) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES
  ('shop_name',   'Supremo Barbershop'),
  ('open_hour',   '8'),
  ('close_hour',  '20'),
  ('slot_hours',  '1');

-- ------------------------------------------------------------
-- 8. Sample promo para may makita agad sa Promo page
-- ------------------------------------------------------------
INSERT IGNORE INTO promos (code, description, discount_type, discount_value, valid_from, valid_to, usage_limit, status)
VALUES ('SUPREMO10', '10% off on all services', 'Percent', 10, '2026-01-01', '2026-12-31', 0, 'Active');

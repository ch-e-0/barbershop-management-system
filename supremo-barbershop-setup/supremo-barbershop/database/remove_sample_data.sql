-- ============================================================
--  Supremo Barbershop - Burahin ang sample data
-- ============================================================
--  Tinatanggal ang lahat ng ginawa ng database/sample_data.sql at
--  wala nang iba.
--
--  PAANO ITO LIGTAS:
--  Lahat ng sample na appointment ay may markang
--      created_at = '2000-01-01 00:00:00'
--  Ang totoong booking na ginawa sa website ay may kasalukuyang
--  petsa ng created_at, kaya hindi ito maaapektuhan.
--
--  Ang feedback ay awtomatikong nabubura kasama ng appointment
--  dahil sa ON DELETE CASCADE.
--
--  PAANO GAMITIN:
--   1. http://localhost/phpmyadmin
--   2. Piliin ang database na "supremo_barbershop"
--   3. Import > piliin ang file na ito > Import
-- ============================================================

USE supremo_barbershop;

-- Ibalik ang bilang ng paggamit ng promo code.
UPDATE promos p
   SET p.used_count = GREATEST(
         0,
         p.used_count - (
           SELECT COUNT(*) FROM appointments a
            WHERE a.promo_id = p.id AND a.created_at = '2000-01-01 00:00:00'
         )
       )
 WHERE p.code = 'SUPREMO10';

-- Burahin ang sample appointments (kasama ang feedback nila).
DELETE FROM appointments WHERE created_at = '2000-01-01 00:00:00';

-- Buod pagkatapos maglinis.
SELECT DATE_FORMAT(appointment_date, '%Y-%m') AS month,
       COUNT(*) AS bookings,
       SUM(CASE WHEN status IN ('Approved','Completed') THEN final_price ELSE 0 END) AS revenue
  FROM appointments
 GROUP BY month ORDER BY month;

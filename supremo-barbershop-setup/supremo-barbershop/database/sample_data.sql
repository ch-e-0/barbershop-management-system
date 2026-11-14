-- ============================================================
--  Supremo Barbershop - Sample data (para sa testing at demo)
-- ============================================================
--  Naglalagay ng 73 sample na appointment mula Marso hanggang
--  Setyembre 2026, kasama ang 59 feedback (stars) at 9 booking
--  na gumamit ng promo code.
--
--  BAKIT KAILANGAN ITO:
--  Ang Sales Forecast ay nangangailangan ng appointments sa hindi
--  bababa sa tatlong magkakaibang buwan bago ito makapaghula.
--
--  PAANO BURAHIN:
--  Patakbuhin ang database/remove_sample_data.sql. Lahat ng row na
--  gawa ng file na ito ay may markang created_at = '2000-01-01 00:00:00'
--  kaya tanging ang sample data lang ang mabubura - ligtas ang
--  totoong booking mo.
--
--  Ginagamit nito ang mga existing na customer, service, at barbero.
--  Walang bagong user account na ginagawa.
-- ============================================================

USE supremo_barbershop;

-- Pansamantalang talahanayan ng sample rows.
DROP TABLE IF EXISTS tmp_sample_data;
CREATE TABLE tmp_sample_data (
  username    VARCHAR(150) NOT NULL,
  service     VARCHAR(150) NOT NULL,
  barber      VARCHAR(150) NOT NULL,
  appt_date   DATE NOT NULL,
  appt_time   TIME NOT NULL,
  status      VARCHAR(20) NOT NULL,
  rating      TINYINT NULL,
  comment     TEXT NOT NULL,
  use_promo   TINYINT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT INTO tmp_sample_data (username, service, barber, appt_date, appt_time, status, rating, comment, use_promo) VALUES
  ('SophiaLaforteza@email.com', 'Gupit Supremo', 'Donald Malgapo', '2026-03-02', '09:00:00', 'Completed', 5, 'Very good fade, super neat.', 0),
  ('DanielaAvanzini@email.com', 'Ahit Supremo', 'Fernando Tan', '2026-03-06', '11:00:00', 'Completed', 4, 'Nice work overall.', 0),
  ('kiethlyndoneza@email.com', 'Hair Tattoo', 'Rico Marquez', '2026-03-10', '13:00:00', 'Completed', 5, 'Fast and clean work.', 0),
  ('kiethlyndoneza11@email.com', 'Gupit Supremo w/ Banlaw', 'Donald Malgapo', '2026-03-14', '15:00:00', 'Completed', 5, 'Worth every peso, thank you!', 1),
  ('dominic_06', 'Supremo Espesyal', 'Fernando Tan', '2026-03-18', '17:00:00', 'Completed', 3, 'Okay, but a bit slow.', 0),
  ('robert@gmail.com', 'Supremo Espesyal w/ Ahit', 'Rico Marquez', '2026-03-22', '10:00:00', 'Cancelled', NULL, '', 0),
  ('jeliel@gmail.com', 'Gupit Supremo', 'Donald Malgapo', '2026-03-26', '12:00:00', 'Completed', 5, 'Best haircut I have had here.', 0),
  ('SophiaLaforteza@email.com', 'Ahit Supremo', 'Rico Marquez', '2026-04-02', '16:00:00', 'Completed', 5, 'Fast and clean work.', 0),
  ('DanielaAvanzini@email.com', 'Hair Tattoo', 'Donald Malgapo', '2026-04-06', '09:00:00', 'Completed', 5, 'Worth every peso, thank you!', 0),
  ('kiethlyndoneza@email.com', 'Gupit Supremo w/ Banlaw', 'Fernando Tan', '2026-04-10', '11:00:00', 'No-show', NULL, '', 0),
  ('kiethlyndoneza11@email.com', 'Supremo Espesyal', 'Rico Marquez', '2026-04-14', '13:00:00', 'Completed', 5, 'Very good fade, super neat.', 1),
  ('dominic_06', 'Supremo Espesyal w/ Ahit', 'Donald Malgapo', '2026-04-18', '15:00:00', 'Completed', 4, '', 0),
  ('robert@gmail.com', 'Gupit Supremo', 'Fernando Tan', '2026-04-22', '17:00:00', 'Completed', 5, 'Fast and clean work.', 0),
  ('jeliel@gmail.com', 'Ahit Supremo', 'Rico Marquez', '2026-04-26', '10:00:00', 'Completed', 5, 'Worth every peso, thank you!', 0),
  ('SophiaLaforteza@email.com', 'Hair Tattoo', 'Donald Malgapo', '2026-04-30', '12:00:00', 'Completed', 3, 'Okay, but a bit slow.', 0),
  ('DanielaAvanzini@email.com', 'Gupit Supremo w/ Banlaw', 'Fernando Tan', '2026-04-04', '14:00:00', 'Completed', 4, 'Good haircut, slight wait time.', 0),
  ('kiethlyndoneza@email.com', 'Supremo Espesyal', 'Rico Marquez', '2026-05-02', '16:00:00', 'Cancelled', NULL, '', 0),
  ('kiethlyndoneza11@email.com', 'Supremo Espesyal w/ Ahit', 'Donald Malgapo', '2026-05-06', '09:00:00', 'Completed', 4, '', 1),
  ('dominic_06', 'Gupit Supremo', 'Fernando Tan', '2026-05-10', '11:00:00', 'Completed', 5, 'Worth every peso, thank you!', 0),
  ('robert@gmail.com', 'Ahit Supremo', 'Rico Marquez', '2026-05-14', '13:00:00', 'Completed', 3, 'Average service.', 0),
  ('jeliel@gmail.com', 'Hair Tattoo', 'Donald Malgapo', '2026-05-18', '15:00:00', 'Completed', 5, 'Very good fade, super neat.', 0),
  ('SophiaLaforteza@email.com', 'Gupit Supremo w/ Banlaw', 'Fernando Tan', '2026-05-22', '17:00:00', 'Completed', 4, 'Good haircut, slight wait time.', 0),
  ('DanielaAvanzini@email.com', 'Supremo Espesyal', 'Rico Marquez', '2026-05-26', '10:00:00', 'Completed', 5, 'Fast and clean work.', 0),
  ('kiethlyndoneza@email.com', 'Supremo Espesyal w/ Ahit', 'Donald Malgapo', '2026-05-30', '12:00:00', 'Completed', 5, 'Worth every peso, thank you!', 0),
  ('kiethlyndoneza11@email.com', 'Gupit Supremo', 'Fernando Tan', '2026-05-03', '14:00:00', 'Completed', 3, 'Okay, but a bit slow.', 1),
  ('dominic_06', 'Ahit Supremo', 'Rico Marquez', '2026-05-07', '16:00:00', 'Completed', 5, 'Very good fade, super neat.', 0),
  ('robert@gmail.com', 'Hair Tattoo', 'Donald Malgapo', '2026-05-11', '09:00:00', 'No-show', NULL, '', 0),
  ('jeliel@gmail.com', 'Gupit Supremo w/ Banlaw', 'Donald Malgapo', '2026-06-02', '09:00:00', 'Cancelled', NULL, '', 0),
  ('SophiaLaforteza@email.com', 'Supremo Espesyal', 'Fernando Tan', '2026-06-06', '11:00:00', 'Completed', 5, 'Worth every peso, thank you!', 0),
  ('DanielaAvanzini@email.com', 'Supremo Espesyal w/ Ahit', 'Rico Marquez', '2026-06-10', '13:00:00', 'Completed', 3, 'Average service.', 0),
  ('kiethlyndoneza@email.com', 'Gupit Supremo', 'Donald Malgapo', '2026-06-14', '15:00:00', 'Completed', 5, 'Very good fade, super neat.', 0),
  ('kiethlyndoneza11@email.com', 'Ahit Supremo', 'Fernando Tan', '2026-06-18', '17:00:00', 'Completed', 4, 'Nice work overall.', 1),
  ('dominic_06', 'Hair Tattoo', 'Rico Marquez', '2026-06-22', '10:00:00', 'Completed', 5, 'Fast and clean work.', 0),
  ('robert@gmail.com', 'Gupit Supremo w/ Banlaw', 'Donald Malgapo', '2026-06-26', '12:00:00', 'Completed', 5, 'Worth every peso, thank you!', 0),
  ('jeliel@gmail.com', 'Supremo Espesyal', 'Fernando Tan', '2026-06-30', '14:00:00', 'Completed', 3, 'Okay, but a bit slow.', 0),
  ('SophiaLaforteza@email.com', 'Supremo Espesyal w/ Ahit', 'Rico Marquez', '2026-06-04', '16:00:00', 'Completed', 5, 'Very good fade, super neat.', 0),
  ('DanielaAvanzini@email.com', 'Gupit Supremo', 'Donald Malgapo', '2026-06-08', '09:00:00', 'Completed', 5, 'Best haircut I have had here.', 0),
  ('kiethlyndoneza@email.com', 'Ahit Supremo', 'Fernando Tan', '2026-06-12', '11:00:00', 'Completed', 4, 'Nice work overall.', 0),
  ('kiethlyndoneza11@email.com', 'Hair Tattoo', 'Rico Marquez', '2026-06-16', '13:00:00', 'Cancelled', NULL, '', 0),
  ('dominic_06', 'Gupit Supremo w/ Banlaw', 'Donald Malgapo', '2026-07-02', '12:00:00', 'Completed', 2, 'Not what I asked for.', 0),
  ('robert@gmail.com', 'Supremo Espesyal', 'Fernando Tan', '2026-07-06', '14:00:00', 'Completed', 5, 'Very good fade, super neat.', 0),
  ('jeliel@gmail.com', 'Supremo Espesyal w/ Ahit', 'Rico Marquez', '2026-07-10', '16:00:00', 'Completed', 5, 'Best haircut I have had here.', 0),
  ('SophiaLaforteza@email.com', 'Gupit Supremo', 'Donald Malgapo', '2026-07-14', '09:00:00', 'Completed', 5, 'Fast and clean work.', 0),
  ('DanielaAvanzini@email.com', 'Ahit Supremo', 'Fernando Tan', '2026-07-18', '11:00:00', 'No-show', NULL, '', 0),
  ('kiethlyndoneza@email.com', 'Hair Tattoo', 'Rico Marquez', '2026-07-22', '13:00:00', 'Completed', 4, '', 0),
  ('kiethlyndoneza11@email.com', 'Gupit Supremo w/ Banlaw', 'Donald Malgapo', '2026-07-26', '15:00:00', 'Completed', 4, 'Good haircut, slight wait time.', 1),
  ('dominic_06', 'Supremo Espesyal', 'Fernando Tan', '2026-07-30', '17:00:00', 'Completed', 5, 'Best haircut I have had here.', 0),
  ('robert@gmail.com', 'Supremo Espesyal w/ Ahit', 'Rico Marquez', '2026-07-03', '10:00:00', 'Completed', 5, 'Fast and clean work.', 0),
  ('jeliel@gmail.com', 'Gupit Supremo', 'Donald Malgapo', '2026-07-07', '12:00:00', 'Completed', 5, 'Worth every peso, thank you!', 0),
  ('SophiaLaforteza@email.com', 'Ahit Supremo', 'Fernando Tan', '2026-07-11', '14:00:00', 'Cancelled', NULL, '', 0),
  ('DanielaAvanzini@email.com', 'Hair Tattoo', 'Rico Marquez', '2026-07-15', '16:00:00', 'Completed', 5, 'Very good fade, super neat.', 0),
  ('kiethlyndoneza@email.com', 'Gupit Supremo w/ Banlaw', 'Donald Malgapo', '2026-07-19', '09:00:00', 'Completed', 4, 'Good haircut, slight wait time.', 0),
  ('kiethlyndoneza11@email.com', 'Supremo Espesyal', 'Fernando Tan', '2026-07-23', '11:00:00', 'Completed', 5, 'Fast and clean work.', 1),
  ('dominic_06', 'Supremo Espesyal w/ Ahit', 'Fernando Tan', '2026-08-02', '17:00:00', 'Completed', 5, 'Worth every peso, thank you!', 0),
  ('robert@gmail.com', 'Gupit Supremo', 'Rico Marquez', '2026-08-06', '10:00:00', 'Completed', 4, 'Good haircut, slight wait time.', 0),
  ('jeliel@gmail.com', 'Ahit Supremo', 'Donald Malgapo', '2026-08-10', '12:00:00', 'Completed', 4, 'Nice work overall.', 0),
  ('SophiaLaforteza@email.com', 'Hair Tattoo', 'Fernando Tan', '2026-08-14', '14:00:00', 'Completed', 5, 'Best haircut I have had here.', 0),
  ('DanielaAvanzini@email.com', 'Gupit Supremo w/ Banlaw', 'Rico Marquez', '2026-08-18', '16:00:00', 'Completed', 5, 'Fast and clean work.', 0),
  ('kiethlyndoneza@email.com', 'Supremo Espesyal', 'Donald Malgapo', '2026-08-22', '09:00:00', 'Completed', 5, 'Worth every peso, thank you!', 0),
  ('kiethlyndoneza11@email.com', 'Supremo Espesyal w/ Ahit', 'Fernando Tan', '2026-08-02', '11:00:00', 'Completed', 2, 'Not what I asked for.', 1),
  ('dominic_06', 'Gupit Supremo', 'Rico Marquez', '2026-08-06', '13:00:00', 'No-show', NULL, '', 0),
  ('robert@gmail.com', 'Ahit Supremo', 'Donald Malgapo', '2026-08-10', '15:00:00', 'Completed', 4, 'Nice work overall.', 0),
  ('jeliel@gmail.com', 'Hair Tattoo', 'Fernando Tan', '2026-08-14', '17:00:00', 'Completed', 5, 'Fast and clean work.', 0),
  ('SophiaLaforteza@email.com', 'Gupit Supremo w/ Banlaw', 'Rico Marquez', '2026-08-18', '10:00:00', 'Completed', 5, 'Worth every peso, thank you!', 0),
  ('DanielaAvanzini@email.com', 'Supremo Espesyal', 'Donald Malgapo', '2026-08-22', '12:00:00', 'Completed', 3, 'Okay, but a bit slow.', 0),
  ('kiethlyndoneza@email.com', 'Supremo Espesyal w/ Ahit', 'Fernando Tan', '2026-08-02', '14:00:00', 'Completed', 4, '', 0),
  ('kiethlyndoneza11@email.com', 'Gupit Supremo', 'Rico Marquez', '2026-08-06', '16:00:00', 'Completed', 5, 'Best haircut I have had here.', 1),
  ('dominic_06', 'Ahit Supremo', 'Donald Malgapo', '2026-08-10', '09:00:00', 'Completed', 4, 'Nice work overall.', 0),
  ('SophiaLaforteza@email.com', 'Gupit Supremo', 'Rico Marquez', '2026-08-27', '10:00:00', 'Approved', NULL, '', 0),
  ('DanielaAvanzini@email.com', 'Hair Tattoo', 'Donald Malgapo', '2026-08-28', '14:00:00', 'Approved', NULL, '', 0),
  ('dominic_06', 'Supremo Espesyal', 'Rico Marquez', '2026-09-01', '11:00:00', 'Approved', NULL, '', 0),
  ('robert@gmail.com', 'Gupit Supremo w/ Banlaw', 'Donald Malgapo', '2026-09-03', '16:00:00', 'Approved', NULL, '', 0),
  ('jeliel@gmail.com', 'Ahit Supremo', 'Rico Marquez', '2026-09-05', '09:00:00', 'Approved', NULL, '', 0);

-- Ang appointments. Ang presyo ay kinukuha sa services table; ang mga
-- may promo ay binabawasan ng 10% (SUPREMO10).
INSERT INTO appointments
  (user_id, service_id, barber_id, appointment_date, appointment_time,
   price, discount, final_price, promo_id, status, created_at)
SELECT u.id, s.id, b.id, t.appt_date, t.appt_time,
       s.price,
       CASE WHEN t.use_promo = 1 THEN ROUND(s.price * 0.10, 2) ELSE 0 END,
       CASE WHEN t.use_promo = 1 THEN ROUND(s.price * 0.90, 2) ELSE s.price END,
       CASE WHEN t.use_promo = 1 THEN (SELECT id FROM promos WHERE code = 'SUPREMO10') ELSE NULL END,
       t.status,
       '2000-01-01 00:00:00'
  FROM tmp_sample_data t
  JOIN users    u ON u.username = t.username
  JOIN services s ON s.name     = t.service
  JOIN barbers  b ON b.name     = t.barber;

-- Ang feedback ng mga natapos na appointment.
INSERT INTO feedback (appointment_id, user_id, barber_id, rating, comment, created_at)
SELECT a.id, a.user_id, a.barber_id, t.rating, t.comment,
       TIMESTAMP(DATE_ADD(t.appt_date, INTERVAL 1 DAY), '19:00:00')
  FROM tmp_sample_data t
  JOIN users    u ON u.username = t.username
  JOIN services s ON s.name     = t.service
  JOIN barbers  b ON b.name     = t.barber
  JOIN appointments a
    ON a.user_id = u.id AND a.service_id = s.id AND a.barber_id = b.id
   AND a.appointment_date = t.appt_date AND a.appointment_time = t.appt_time
   AND a.created_at = '2000-01-01 00:00:00'
 WHERE t.rating IS NOT NULL;

-- Bilang ng paggamit ng promo code.
UPDATE promos
   SET used_count = used_count + (SELECT COUNT(*) FROM tmp_sample_data WHERE use_promo = 1)
 WHERE code = 'SUPREMO10';

DROP TABLE tmp_sample_data;

-- Buod
SELECT DATE_FORMAT(appointment_date, '%Y-%m') AS month,
       COUNT(*) AS bookings,
       SUM(CASE WHEN status IN ('Approved','Completed') THEN final_price ELSE 0 END) AS revenue
  FROM appointments
 GROUP BY month ORDER BY month;

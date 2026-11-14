CREATE DATABASE IF NOT EXISTS supremo_barbershop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE supremo_barbershop;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  username VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  legacy_password VARCHAR(255) NULL,
  role ENUM('Admin', 'User') NOT NULL DEFAULT 'User',
  security_question VARCHAR(255) NOT NULL,
  security_answer VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE services (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE barbers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  specialty VARCHAR(255) NOT NULL DEFAULT '',
  notes TEXT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE appointments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  barber_id INT UNSIGNED NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status ENUM('Approved', 'Cancelled') NOT NULL DEFAULT 'Approved',
  cancellation_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointment_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_appointment_service FOREIGN KEY (service_id) REFERENCES services(id),
  CONSTRAINT fk_appointment_barber FOREIGN KEY (barber_id) REFERENCES barbers(id),
  INDEX idx_appointment_slot (barber_id, appointment_date, appointment_time),
  INDEX idx_appointment_user (user_id)
) ENGINE=InnoDB;

-- This file creates the empty database structure.
-- Import supremo_barbershop_import.sql instead to create the structure with
-- the existing Excel data included.

-- Existing data migrated from Supremo Barbershop DB.xlsx
INSERT INTO users (full_name, username, password_hash, legacy_password, role, security_question, security_answer, phone) VALUES
  ('donnadoneza@gmail.com', 'donnadoneza@gmail.com', '', 'Jenlisa123@', 'User', '', '', '0900-000-000'),
  ('Supremo Admin', 'admin', '', 'supremo123', 'Admin', '', '', '0900-000-000'),
  ('fate doneza', 'fatedoneza@gmail.com', '', 'Jenlisa123@', 'User', '', '', '0900-000-000'),
  ('Kiethlyn Doneza', 'kiethlyndoneza@gmail.com', '', 'Jenlisa123@', 'User', '', '', '0900-000-000'),
  ('Jorizzel Solis', 'jorizzel', '', 'Jorizel14', 'User', '', '', '0900-000-000'),
  ('sophia laforteza', 'sophialaforteza@gmail.com', '', 'Jenlisa_11', 'User', '', '', '0900-000-000'),
  ('sophialaforteza1@gmail.com', 'sophialaforteza1@gmail.com', '', 'Jenlisa_11', 'User', '', '', '0900-000-000'),
  ('Jorizzel Solis', 'jorizzel4', '', 'Jorizzel1405@', 'User', '', '', '0900-000-000'),
  ('danielavanzini@gmail.com', 'danielavanzini@gmail.com', '', 'Jnelisa_11', 'User', '', '', '0900-000-000'),
  ('dominictabinas@gmail.com', 'dominictabinas@gmail.com', '', '050516_nic', 'User', '', '', '0900-000-000'),
  ('donna ericka doneza', 'erickadoneza@gmail.com', '', 'Jenlisa_11', 'User', '', '', '0900-000-000'),
  ('John Doe Test', 'joshuagonzalessucgang@gmail.com', '', 'sucgang26', 'User', '', '', '0900-000-000'),
  ('Angel Grace Dela Cruz', 'delacruzangelgrace10@gmail.com', '', 'Angel_21', 'User', '', '', '0900-000-000'),
  ('dominic tabinas', 'dominictabinic@gmail.com', '', 'dominic123456', 'User', '', '', '0900-000-000'),
  ('SUPREMOBARBER', 'supremobarber@gmail.com', '', 'Supremo_123', 'Admin', '', '', '0900-000-000'),
  ('marian tabinas', 'tabinasmarian@gmail.com', '', 'Marian0606', 'User', '', '', '0900-000-000'),
  ('Donna doneza', 'donnaericka.doneza0006@depedmalaboncity.ph', '', 'ihgyttttyyg', 'User', '', '', '0900-000-000'),
  ('alex co', 'alexco@gmail.com', '', 'alexmore', 'User', '', '', '0900-000-000'),
  ('alex more', 'alexmore@gmail.com', '', 'morealex', 'User', '', '', '0900-000-000'),
  ('der more', 'dermore@gmail.com', '', '12345678', 'User', '', '', '0900-000-000'),
  ('donadoneza', 'donadoneza@gmail.com', '', 'donezaaedhd', 'User', '', '', '0900-000-000'),
  ('donadonneza', 'donadonneza@gmail.com', '', '123456478915', 'User', '', '', '0900-000-000'),
  ('Jeliel', 'jeliel@gmail.com', '', 'qwertyuiop', 'User', 'What was your high school name?', 'sj', '0900-000-000'),
  ('AdminSupremo', 'AdminSupremo@email.com', '', 'AdminSupremo123456', 'Admin', 'What was your high school name?', 'sj', '0900-000-000'),
  ('ads', 'asdasda', '', 'asdadasda', 'User', 'What is your mother''s maiden name?', 'asdada', '9323232323'),
  ('Sophia Laforteza', 'SophiaLaforteza@email.com', '', 'SophiaLaforteza@123', 'User', 'In what city were you born?', 'New York', '0975-181-2918'),
  ('Daniela Avanzini', 'DanielaAvanzini@email.com', '', 'DanielaAvanzini@12345678', 'User', 'What was your first pet''s name?', 'susan', '0975-181-2918'),
  ('dominic tabinas', 'dominic_06', '', 'tabinas123456789', 'User', 'In what city were you born?', 'manila', '0910-402-1218'),
  ('Kiethlyn Doneza', 'kiethlyndoneza@email.com', '', 'kiethlyn12345678', 'User', 'What was your first pet''s name?', 'bella', '0975-181-2918'),
  ('kiethlyn doneza', 'kiethlyndoneza11@email.com', '', 'kiethlyndoneza11@', 'User', 'What was your first pet''s name?', 'bella', '0975-181-2918');
INSERT INTO services (name, price) VALUES
  ('Gupit Supremo w/ Banlaw', '300'),
  ('Gupit Supremo', '250'),
  ('Ahit Supremo', '200'),
  ('Hair Tattoo', '250'),
  ('Supremo Espesyal w/ Ahit', '550'),
  ('Supremo Espesyal', '450'),
  ('hair gel', '111');
INSERT INTO barbers (name, phone, status, specialty, notes) VALUES
  ('Pablo Mendoza', '0905-373-1838', 'Inactive', '', ''),
  ('Earl Anlocotan', '0932-626-2262', 'Inactive', '', ''),
  ('Fernando Tan', '0975-181-2918', 'Inactive', '', 'date started january 1,2025'),
  ('Donald Malgapo', '0981-330-8303', 'Active', '', ''),
  ('Rico Marquez', '0910-402-1218', 'Active', '', ''),
  ('Donald Malgapo (Hair Tattoo, Hair gel, ahit)', '0975-181-2918', 'Inactive', '', '');
-- Old "Declined" records are kept as "Cancelled".
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-08', '08:00:00', 'Cancelled'
FROM users u JOIN services s ON s.name = 'Supremo Espesyal' JOIN barbers b ON b.name = 'Donald Malgapo'
WHERE u.username = 'jeliel@gmail.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-07', '08:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Supremo Espesyal w/ Ahit' JOIN barbers b ON b.name = 'Donald Malgapo'
WHERE u.username = 'jeliel@gmail.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-07', '08:00:00', 'Cancelled'
FROM users u JOIN services s ON s.name = 'Supremo Espesyal w/ Ahit' JOIN barbers b ON b.name = 'Donald Malgapo'
WHERE u.username = 'jeliel@gmail.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-18', '09:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Gupit Supremo' JOIN barbers b ON b.name = 'Pablo Mendoza'
WHERE u.username = 'SophiaLaforteza@email.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-16', '15:00:00', 'Cancelled'
FROM users u JOIN services s ON s.name = 'Hair Tattoo' JOIN barbers b ON b.name = 'Donald Malgapo'
WHERE u.username = 'SophiaLaforteza@email.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-26', '08:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Supremo Espesyal' JOIN barbers b ON b.name = 'Fernando Tan'
WHERE u.username = 'DanielaAvanzini@email.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-20', '18:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Hair Tattoo' JOIN barbers b ON b.name = 'Donald Malgapo'
WHERE u.username = 'DanielaAvanzini@email.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-09', '08:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Supremo Espesyal' JOIN barbers b ON b.name = 'Earl Anlocotan'
WHERE u.username = 'DanielaAvanzini@email.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-10', '08:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Hair Tattoo' JOIN barbers b ON b.name = 'Fernando Tan'
WHERE u.username = 'DanielaAvanzini@email.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-10', '08:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Hair Tattoo' JOIN barbers b ON b.name = 'Donald Malgapo'
WHERE u.username = 'DanielaAvanzini@email.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-10', '20:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Hair Tattoo' JOIN barbers b ON b.name = 'Donald Malgapo'
WHERE u.username = 'DanielaAvanzini@email.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-10', '20:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Hair Tattoo' JOIN barbers b ON b.name = 'Earl Anlocotan'
WHERE u.username = 'DanielaAvanzini@email.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-08', '08:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Gupit Supremo w/ Banlaw' JOIN barbers b ON b.name = 'Fernando Tan'
WHERE u.username = 'dominic_06';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-21', '15:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Gupit Supremo' JOIN barbers b ON b.name = 'Fernando Tan'
WHERE u.username = 'kiethlyndoneza@email.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2025-11-28', '18:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Gupit Supremo' JOIN barbers b ON b.name = 'Donald Malgapo'
WHERE u.username = 'kiethlyndoneza11@email.com';
INSERT INTO appointments (user_id, service_id, barber_id, appointment_date, appointment_time, status)
SELECT u.id, s.id, b.id, '2026-08-20', '14:00:00', 'Approved'
FROM users u JOIN services s ON s.name = 'Ahit Supremo' JOIN barbers b ON b.name = 'Donald Malgapo'
WHERE u.username = 'kiethlyndoneza11@email.com';

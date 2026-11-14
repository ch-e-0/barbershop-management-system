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

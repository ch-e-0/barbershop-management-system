-- MariaDB dump 10.19  Distrib 10.4.27-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: supremo_barbershop
-- ------------------------------------------------------
-- Server version	10.4.27-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `supremo_barbershop`
--

/*!40000 DROP DATABASE IF EXISTS `supremo_barbershop`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `supremo_barbershop` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `supremo_barbershop`;

--
-- Table structure for table `app_settings`
--

DROP TABLE IF EXISTS `app_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `app_settings` (
  `setting_key` varchar(60) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_settings`
--

LOCK TABLES `app_settings` WRITE;
/*!40000 ALTER TABLE `app_settings` DISABLE KEYS */;
INSERT INTO `app_settings` VALUES ('close_hour','20'),('open_hour','8'),('shop_name','Supremo Barbershop'),('slot_hours','1');
/*!40000 ALTER TABLE `app_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appointments`
--

DROP TABLE IF EXISTS `appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `appointments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `service_id` int(10) unsigned NOT NULL,
  `barber_id` int(10) unsigned NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `final_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `promo_id` int(10) unsigned DEFAULT NULL,
  `status` enum('Approved','Cancelled','Completed','No-show') NOT NULL DEFAULT 'Approved',
  `cancellation_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_appointment_service` (`service_id`),
  KEY `idx_appointment_slot` (`barber_id`,`appointment_date`,`appointment_time`),
  KEY `idx_appointment_user` (`user_id`),
  KEY `fk_appointment_promo` (`promo_id`),
  CONSTRAINT `fk_appointment_barber` FOREIGN KEY (`barber_id`) REFERENCES `barbers` (`id`),
  CONSTRAINT `fk_appointment_promo` FOREIGN KEY (`promo_id`) REFERENCES `promos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_appointment_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `fk_appointment_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=348 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appointments`
--

LOCK TABLES `appointments` WRITE;
/*!40000 ALTER TABLE `appointments` DISABLE KEYS */;
INSERT INTO `appointments` VALUES (1,42,6,4,'2025-11-08','08:00:00',450.00,0.00,450.00,NULL,'Cancelled',NULL,'2026-08-20 16:41:29'),(2,43,5,4,'2025-11-07','08:00:00',550.00,0.00,550.00,NULL,'Approved',NULL,'2026-08-20 16:41:29'),(3,44,5,4,'2025-11-07','08:00:00',550.00,0.00,550.00,NULL,'Cancelled',NULL,'2026-08-20 16:41:29'),(4,45,2,1,'2025-11-18','09:00:00',250.00,0.00,250.00,NULL,'Approved',NULL,'2026-08-20 16:41:29'),(5,41,4,4,'2025-11-16','15:00:00',250.00,0.00,250.00,NULL,'Cancelled',NULL,'2026-08-20 16:41:29'),(6,42,6,3,'2025-11-26','08:00:00',450.00,0.00,450.00,NULL,'Approved',NULL,'2026-08-20 16:41:29'),(7,43,4,4,'2025-11-20','18:00:00',250.00,0.00,250.00,NULL,'Approved',NULL,'2026-08-20 16:41:29'),(8,44,6,2,'2025-11-09','08:00:00',450.00,0.00,450.00,NULL,'Approved',NULL,'2026-08-20 16:41:29'),(9,45,4,3,'2025-11-10','08:00:00',250.00,0.00,250.00,NULL,'Approved',NULL,'2026-08-20 16:41:29'),(10,41,4,4,'2025-11-10','08:00:00',250.00,0.00,250.00,NULL,'Approved',NULL,'2026-08-20 16:41:29'),(11,42,4,4,'2025-11-10','20:00:00',250.00,0.00,250.00,NULL,'Approved',NULL,'2026-08-20 16:41:29'),(12,43,4,2,'2025-11-10','20:00:00',250.00,0.00,250.00,NULL,'Approved',NULL,'2026-08-20 16:41:29'),(13,44,1,3,'2025-11-08','08:00:00',300.00,0.00,300.00,NULL,'Completed',NULL,'2026-08-20 16:41:29'),(14,45,2,3,'2025-11-21','15:00:00',250.00,0.00,250.00,NULL,'Approved',NULL,'2026-08-20 16:41:30'),(15,41,2,4,'2025-11-28','18:00:00',250.00,0.00,250.00,NULL,'Approved',NULL,'2026-08-20 16:41:30'),(16,42,3,4,'2026-08-20','14:00:00',200.00,0.00,200.00,NULL,'Approved',NULL,'2026-08-20 16:41:30'),(273,44,2,4,'2026-03-02','09:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(274,45,3,3,'2026-03-06','11:00:00',200.00,0.00,200.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(275,41,4,5,'2026-03-10','13:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(276,42,1,4,'2026-03-14','15:00:00',300.00,30.00,270.00,1,'Completed',NULL,'1999-12-31 16:00:00'),(277,43,6,3,'2026-03-18','17:00:00',450.00,0.00,450.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(278,44,5,5,'2026-03-22','10:00:00',550.00,0.00,550.00,NULL,'Cancelled',NULL,'1999-12-31 16:00:00'),(279,45,2,4,'2026-03-26','12:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(280,41,3,5,'2026-04-02','16:00:00',200.00,0.00,200.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(281,42,4,4,'2026-04-06','09:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(282,43,1,3,'2026-04-10','11:00:00',300.00,0.00,300.00,NULL,'No-show',NULL,'1999-12-31 16:00:00'),(283,44,6,5,'2026-04-14','13:00:00',450.00,45.00,405.00,1,'Completed',NULL,'1999-12-31 16:00:00'),(284,45,5,4,'2026-04-18','15:00:00',550.00,0.00,550.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(285,41,2,3,'2026-04-22','17:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(286,42,3,5,'2026-04-26','10:00:00',200.00,0.00,200.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(287,43,4,4,'2026-04-30','12:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(288,44,1,3,'2026-04-04','14:00:00',300.00,0.00,300.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(289,45,6,5,'2026-05-02','16:00:00',450.00,0.00,450.00,NULL,'Cancelled',NULL,'1999-12-31 16:00:00'),(290,41,5,4,'2026-05-06','09:00:00',550.00,55.00,495.00,1,'Completed',NULL,'1999-12-31 16:00:00'),(291,42,2,3,'2026-05-10','11:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(292,43,3,5,'2026-05-14','13:00:00',200.00,0.00,200.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(293,44,4,4,'2026-05-18','15:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(294,45,1,3,'2026-05-22','17:00:00',300.00,0.00,300.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(295,41,6,5,'2026-05-26','10:00:00',450.00,0.00,450.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(296,42,5,4,'2026-05-30','12:00:00',550.00,0.00,550.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(297,43,2,3,'2026-05-03','14:00:00',250.00,25.00,225.00,1,'Completed',NULL,'1999-12-31 16:00:00'),(298,44,3,5,'2026-05-07','16:00:00',200.00,0.00,200.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(299,45,4,4,'2026-05-11','09:00:00',250.00,0.00,250.00,NULL,'No-show',NULL,'1999-12-31 16:00:00'),(300,41,1,4,'2026-06-02','09:00:00',300.00,0.00,300.00,NULL,'Cancelled',NULL,'1999-12-31 16:00:00'),(301,42,6,3,'2026-06-06','11:00:00',450.00,0.00,450.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(302,43,5,5,'2026-06-10','13:00:00',550.00,0.00,550.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(303,44,2,4,'2026-06-14','15:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(304,45,3,3,'2026-06-18','17:00:00',200.00,20.00,180.00,1,'Completed',NULL,'1999-12-31 16:00:00'),(305,41,4,5,'2026-06-22','10:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(306,42,1,4,'2026-06-26','12:00:00',300.00,0.00,300.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(307,43,6,3,'2026-06-30','14:00:00',450.00,0.00,450.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(308,44,5,5,'2026-06-04','16:00:00',550.00,0.00,550.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(309,45,2,4,'2026-06-08','09:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(310,41,3,3,'2026-06-12','11:00:00',200.00,0.00,200.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(311,42,4,5,'2026-06-16','13:00:00',250.00,0.00,250.00,NULL,'Cancelled',NULL,'1999-12-31 16:00:00'),(312,43,1,4,'2026-07-02','12:00:00',300.00,0.00,300.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(313,44,6,3,'2026-07-06','14:00:00',450.00,0.00,450.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(314,45,5,5,'2026-07-10','16:00:00',550.00,0.00,550.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(315,41,2,4,'2026-07-14','09:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(316,42,3,3,'2026-07-18','11:00:00',200.00,0.00,200.00,NULL,'No-show',NULL,'1999-12-31 16:00:00'),(317,43,4,5,'2026-07-22','13:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(318,44,1,4,'2026-07-26','15:00:00',300.00,30.00,270.00,1,'Completed',NULL,'1999-12-31 16:00:00'),(319,45,6,3,'2026-07-30','17:00:00',450.00,0.00,450.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(320,41,5,5,'2026-07-03','10:00:00',550.00,0.00,550.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(321,42,2,4,'2026-07-07','12:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(322,43,3,3,'2026-07-11','14:00:00',200.00,0.00,200.00,NULL,'Cancelled',NULL,'1999-12-31 16:00:00'),(323,44,4,5,'2026-07-15','16:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(324,45,1,4,'2026-07-19','09:00:00',300.00,0.00,300.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(325,41,6,3,'2026-07-23','11:00:00',450.00,45.00,405.00,1,'Completed',NULL,'1999-12-31 16:00:00'),(326,42,5,3,'2026-08-02','17:00:00',550.00,0.00,550.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(327,43,2,5,'2026-08-06','10:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(328,44,3,4,'2026-08-10','12:00:00',200.00,0.00,200.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(329,45,4,3,'2026-08-14','14:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(330,41,1,5,'2026-08-18','16:00:00',300.00,0.00,300.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(331,42,6,4,'2026-08-22','09:00:00',450.00,0.00,450.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(332,43,5,3,'2026-08-02','11:00:00',550.00,55.00,495.00,1,'Completed',NULL,'1999-12-31 16:00:00'),(333,44,2,5,'2026-08-06','13:00:00',250.00,0.00,250.00,NULL,'No-show',NULL,'1999-12-31 16:00:00'),(334,45,3,4,'2026-08-10','15:00:00',200.00,0.00,200.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(335,41,4,3,'2026-08-14','17:00:00',250.00,0.00,250.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(336,42,1,5,'2026-08-18','10:00:00',300.00,0.00,300.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(337,43,6,4,'2026-08-22','12:00:00',450.00,0.00,450.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(338,44,5,3,'2026-08-02','14:00:00',550.00,0.00,550.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(339,45,2,5,'2026-08-06','16:00:00',250.00,25.00,225.00,1,'Completed',NULL,'1999-12-31 16:00:00'),(340,41,3,4,'2026-08-10','09:00:00',200.00,0.00,200.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(341,42,2,5,'2026-08-27','10:00:00',250.00,0.00,250.00,NULL,'Approved',NULL,'1999-12-31 16:00:00'),(342,43,4,4,'2026-08-28','14:00:00',250.00,0.00,250.00,NULL,'Approved',NULL,'1999-12-31 16:00:00'),(343,44,6,5,'2026-09-01','11:00:00',450.00,0.00,450.00,NULL,'Approved',NULL,'1999-12-31 16:00:00'),(344,45,1,4,'2026-09-03','16:00:00',300.00,0.00,300.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(345,41,3,5,'2026-09-05','09:00:00',200.00,0.00,200.00,NULL,'Completed',NULL,'1999-12-31 16:00:00'),(346,42,1,4,'2027-12-12','08:00:00',300.00,0.00,300.00,NULL,'Cancelled','date is too long','2026-09-22 01:43:14'),(347,43,2,4,'2026-09-25','13:00:00',250.00,0.00,250.00,NULL,'Approved',NULL,'2026-09-23 02:09:21');
/*!40000 ALTER TABLE `appointments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `barber_days_off`
--

DROP TABLE IF EXISTS `barber_days_off`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `barber_days_off` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `barber_id` int(10) unsigned NOT NULL,
  `off_date` date NOT NULL,
  `reason` varchar(255) NOT NULL DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_barber_day` (`barber_id`,`off_date`),
  CONSTRAINT `fk_dayoff_barber` FOREIGN KEY (`barber_id`) REFERENCES `barbers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `barber_days_off`
--

LOCK TABLES `barber_days_off` WRITE;
/*!40000 ALTER TABLE `barber_days_off` DISABLE KEYS */;
/*!40000 ALTER TABLE `barber_days_off` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `barbers`
--

DROP TABLE IF EXISTS `barbers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `barbers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `specialty` varchar(255) NOT NULL DEFAULT '',
  `notes` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `uq_barber_user` (`user_id`),
  CONSTRAINT `fk_barber_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `barbers`
--

LOCK TABLES `barbers` WRITE;
/*!40000 ALTER TABLE `barbers` DISABLE KEYS */;
INSERT INTO `barbers` VALUES (1,NULL,'Pablo Mendoza','0905-373-1838','Inactive','',''),(2,NULL,'Earl Anlocotan','0932-626-2262','Inactive','',''),(3,NULL,'Fernando Tan','0975-181-2918','Inactive','','date started january 1,2025'),(4,39,'Donald Malgapo','0981-330-8303','Active','',''),(5,32,'Rico Marquez','0910-402-1218','Active','',''),(6,NULL,'Donald Malgapo (Hair Tattoo, Hair gel, ahit)','0975-181-2918','Inactive','','');
/*!40000 ALTER TABLE `barbers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feedback` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `appointment_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `barber_id` int(10) unsigned NOT NULL,
  `rating` tinyint(3) unsigned NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointment_id` (`appointment_id`),
  KEY `idx_feedback_barber` (`barber_id`),
  KEY `fk_feedback_user` (`user_id`),
  CONSTRAINT `fk_feedback_appt` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_feedback_barber` FOREIGN KEY (`barber_id`) REFERENCES `barbers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=187 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback`
--

LOCK TABLES `feedback` WRITE;
/*!40000 ALTER TABLE `feedback` DISABLE KEYS */;
INSERT INTO `feedback` VALUES (128,273,44,4,5,'Very good fade, super neat.','2026-03-03 11:00:00'),(129,274,45,3,4,'Nice work overall.','2026-03-07 11:00:00'),(130,275,41,5,5,'Fast and clean work.','2026-03-11 11:00:00'),(131,276,42,4,5,'Worth every peso, thank you!','2026-03-15 11:00:00'),(132,277,43,3,3,'Okay, but a bit slow.','2026-03-19 11:00:00'),(133,279,45,4,5,'Best haircut I have had here.','2026-03-27 11:00:00'),(134,280,41,5,5,'Fast and clean work.','2026-04-03 11:00:00'),(135,281,42,4,5,'Worth every peso, thank you!','2026-04-07 11:00:00'),(136,283,44,5,5,'Very good fade, super neat.','2026-04-15 11:00:00'),(137,284,45,4,4,'','2026-04-19 11:00:00'),(138,285,41,3,5,'Fast and clean work.','2026-04-23 11:00:00'),(139,286,42,5,5,'Worth every peso, thank you!','2026-04-27 11:00:00'),(140,287,43,4,3,'Okay, but a bit slow.','2026-05-01 11:00:00'),(141,288,44,3,4,'Good haircut, slight wait time.','2026-04-05 11:00:00'),(142,290,41,4,4,'','2026-05-07 11:00:00'),(143,291,42,3,5,'Worth every peso, thank you!','2026-05-11 11:00:00'),(144,292,43,5,3,'Average service.','2026-05-15 11:00:00'),(145,293,44,4,5,'Very good fade, super neat.','2026-05-19 11:00:00'),(146,294,45,3,4,'Good haircut, slight wait time.','2026-05-23 11:00:00'),(147,295,41,5,5,'Fast and clean work.','2026-05-27 11:00:00'),(148,296,42,4,5,'Worth every peso, thank you!','2026-05-31 11:00:00'),(149,297,43,3,3,'Okay, but a bit slow.','2026-05-04 11:00:00'),(150,298,44,5,5,'Very good fade, super neat.','2026-05-08 11:00:00'),(151,301,42,3,5,'Worth every peso, thank you!','2026-06-07 11:00:00'),(152,302,43,5,3,'Average service.','2026-06-11 11:00:00'),(153,303,44,4,5,'Very good fade, super neat.','2026-06-15 11:00:00'),(154,304,45,3,4,'Nice work overall.','2026-06-19 11:00:00'),(155,305,41,5,5,'Fast and clean work.','2026-06-23 11:00:00'),(156,306,42,4,5,'Worth every peso, thank you!','2026-06-27 11:00:00'),(157,307,43,3,3,'Okay, but a bit slow.','2026-07-01 11:00:00'),(158,308,44,5,5,'Very good fade, super neat.','2026-06-05 11:00:00'),(159,309,45,4,5,'Best haircut I have had here.','2026-06-09 11:00:00'),(160,310,41,3,4,'Nice work overall.','2026-06-13 11:00:00'),(161,312,43,4,2,'Not what I asked for.','2026-07-03 11:00:00'),(162,313,44,3,5,'Very good fade, super neat.','2026-07-07 11:00:00'),(163,314,45,5,5,'Best haircut I have had here.','2026-07-11 11:00:00'),(164,315,41,4,5,'Fast and clean work.','2026-07-15 11:00:00'),(165,317,43,5,4,'','2026-07-23 11:00:00'),(166,318,44,4,4,'Good haircut, slight wait time.','2026-07-27 11:00:00'),(167,319,45,3,5,'Best haircut I have had here.','2026-07-31 11:00:00'),(168,320,41,5,5,'Fast and clean work.','2026-07-04 11:00:00'),(169,321,42,4,5,'Worth every peso, thank you!','2026-07-08 11:00:00'),(170,323,44,5,5,'Very good fade, super neat.','2026-07-16 11:00:00'),(171,324,45,4,4,'Good haircut, slight wait time.','2026-07-20 11:00:00'),(172,325,41,3,5,'Fast and clean work.','2026-07-24 11:00:00'),(173,326,42,3,5,'Worth every peso, thank you!','2026-08-03 11:00:00'),(174,327,43,5,4,'Good haircut, slight wait time.','2026-08-07 11:00:00'),(175,328,44,4,4,'Nice work overall.','2026-08-11 11:00:00'),(176,329,45,3,5,'Best haircut I have had here.','2026-08-15 11:00:00'),(177,330,41,5,5,'Fast and clean work.','2026-08-19 11:00:00'),(178,331,42,4,5,'Worth every peso, thank you!','2026-08-23 11:00:00'),(179,332,43,3,2,'Not what I asked for.','2026-08-03 11:00:00'),(180,334,45,4,4,'Nice work overall.','2026-08-11 11:00:00'),(181,335,41,3,5,'Fast and clean work.','2026-08-15 11:00:00'),(182,336,42,5,5,'Worth every peso, thank you!','2026-08-19 11:00:00'),(183,337,43,4,3,'Okay, but a bit slow.','2026-08-23 11:00:00'),(184,338,44,3,4,'','2026-08-03 11:00:00'),(185,339,45,5,5,'Best haircut I have had here.','2026-08-07 11:00:00'),(186,340,41,4,4,'Nice work overall.','2026-08-11 11:00:00');
/*!40000 ALTER TABLE `feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promos`
--

DROP TABLE IF EXISTS `promos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `promos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(40) NOT NULL,
  `description` varchar(255) NOT NULL DEFAULT '',
  `discount_type` enum('Percent','Fixed') NOT NULL DEFAULT 'Percent',
  `discount_value` decimal(10,2) NOT NULL,
  `service_id` int(10) unsigned DEFAULT NULL,
  `valid_from` date NOT NULL,
  `valid_to` date NOT NULL,
  `usage_limit` int(10) unsigned NOT NULL DEFAULT 0,
  `used_count` int(10) unsigned NOT NULL DEFAULT 0,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `fk_promo_service` (`service_id`),
  CONSTRAINT `fk_promo_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promos`
--

LOCK TABLES `promos` WRITE;
/*!40000 ALTER TABLE `promos` DISABLE KEYS */;
INSERT INTO `promos` VALUES (1,'SUPREMO10','10% off on all services','Percent',10.00,NULL,'2026-01-01','2026-12-31',0,9,'Active','2026-08-24 17:05:20');
/*!40000 ALTER TABLE `promos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `services` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (1,'Gupit Supremo w/ Banlaw',300.00),(2,'Gupit Supremo',250.00),(3,'Ahit Supremo',200.00),(4,'Hair Tattoo',250.00),(5,'Supremo Espesyal w/ Ahit',550.00),(6,'Supremo Espesyal',450.00),(7,'hair gel',111.00);
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) NOT NULL,
  `username` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL DEFAULT '',
  `legacy_password` varchar(255) DEFAULT NULL,
  `role` enum('Admin','User','Barber') NOT NULL DEFAULT 'User',
  `security_question` varchar(255) NOT NULL,
  `security_answer` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (32,'Rico Marquez','rico','$2y$10$.WqSuEVVA8VVXHvJenBbG.S2pQZH9Npvqly4fk7aZXSHJtrvJO4LS',NULL,'Barber','','','0910-402-1218','2026-08-25 10:06:50'),(39,'Donald Malgapo','donaldmalgapo@gmail.com','$2y$10$fVtj2GLS3EBrZuBZd/m98.7NrZQyyLFAES3Nv8u89rhhq3.w2wPdK',NULL,'Barber','What was your first pet\'s name?','Bella','0981-330-8303','2026-09-23 02:11:41'),(40,'Supremo Admin','admin','','Admin12345','Admin','What was your first pet\'s name?','test','0917-000-0001','2026-10-21 03:49:11'),(41,'Juan Dela Cruz','juan','','Juan12345','User','What was your first pet\'s name?','test','0917-000-0002','2026-10-21 03:49:11'),(42,'Maria Santos','maria','','Maria12345','User','What was your first pet\'s name?','test','0917-000-0003','2026-10-21 03:49:11'),(43,'Jose Reyes','jose','','Jose12345','User','What was your first pet\'s name?','test','0917-000-0004','2026-10-21 03:49:11'),(44,'Ana Garcia','ana','','Ana123456','User','What was your first pet\'s name?','test','0917-000-0005','2026-10-21 03:49:11'),(45,'Mark Villanueva','mark','','Mark12345','User','What was your first pet\'s name?','test','0917-000-0006','2026-10-21 03:49:11');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-21 17:31:52

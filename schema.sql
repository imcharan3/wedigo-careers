-- MySQL Database Schema for Wedigo Careers LMS

CREATE DATABASE IF NOT EXISTS `wedigo_careers` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `wedigo_careers`;

-- 1. Admins Table (For manual Workbench admin creation & system admins)
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'admin',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Default Admin into admins table
INSERT IGNORE INTO `admins` (`name`, `email`, `password`, `role`) 
VALUES ('Platform Admin', 'admin@wedigocareers.com', '$2a$10$e8F9x.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1', 'admin');

-- 2. Users Table (Student Accounts)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'student',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS `courses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `duration` VARCHAR(50) NOT NULL,
  `description` TEXT NOT NULL,
  `modules` TEXT NOT NULL,
  `modules_content` LONGTEXT NULL,
  `quiz_data` LONGTEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Enrollments Table
CREATE TABLE IF NOT EXISTS `enrollments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `progress` INT DEFAULT 0,
  `completed` TINYINT(1) DEFAULT 0,
  `passed` TINYINT(1) DEFAULT 0,
  `attempts_count` INT DEFAULT 0,
  `highest_score` INT DEFAULT 0,
  `completed_modules` TEXT NULL,
  `start_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_course` (`user_id`, `course_id`),
  CONSTRAINT `fk_enrollments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enrollments_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Certificates Table
CREATE TABLE IF NOT EXISTS `certificates` (
  `certificate_id` VARCHAR(100) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `user_name` VARCHAR(255) NOT NULL,
  `user_email` VARCHAR(255) NOT NULL,
  `course_id` INT NOT NULL,
  `course_title` VARCHAR(255) NOT NULL,
  `course_duration` VARCHAR(50) NOT NULL,
  `start_date` VARCHAR(100) NOT NULL,
  `completion_date` VARCHAR(100) NOT NULL,
  `issue_date` VARCHAR(100) NOT NULL,
  `score` INT DEFAULT 100,
  `verification_hash` VARCHAR(255) NOT NULL,
  `signatory_name` VARCHAR(255) DEFAULT 'Neethu Allampati',
  `signatory_title` VARCHAR(255) DEFAULT 'Director of Academics',
  `status` VARCHAR(50) DEFAULT 'ACTIVE',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

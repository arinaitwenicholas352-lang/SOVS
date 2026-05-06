-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 06, 2026 at 10:01 AM
-- Server version: 9.1.0
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sovs_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
CREATE TABLE IF NOT EXISTS `announcements` (
  `announcement_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `image_url` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`announcement_id`),
  KEY `created_by` (`created_by`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`announcement_id`, `title`, `message`, `image_url`, `created_at`, `created_by`) VALUES
(1, 'Vacant Position', 'Please receive the list of vacant positions', '/uploads/announcements/1777993290632-878135297.jpg', '2026-05-05 15:01:30', 4);

-- --------------------------------------------------------

--
-- Table structure for table `announcement_images`
--

DROP TABLE IF EXISTS `announcement_images`;
CREATE TABLE IF NOT EXISTS `announcement_images` (
  `image_id` int NOT NULL AUTO_INCREMENT,
  `announcement_id` int NOT NULL,
  `image_url` text NOT NULL,
  PRIMARY KEY (`image_id`),
  KEY `announcement_id` (`announcement_id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `announcement_images`
--

INSERT INTO `announcement_images` (`image_id`, `announcement_id`, `image_url`) VALUES
(1, 1, '/uploads/announcements/1777993290632-878135297.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `announcement_reads`
--

DROP TABLE IF EXISTS `announcement_reads`;
CREATE TABLE IF NOT EXISTS `announcement_reads` (
  `read_id` int NOT NULL AUTO_INCREMENT,
  `announcement_id` int NOT NULL,
  `student_id` int NOT NULL,
  `read_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`read_id`),
  UNIQUE KEY `announcement_id` (`announcement_id`,`student_id`),
  KEY `student_id` (`student_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actor_type` enum('student','ec','it') NOT NULL,
  `actor_id` int NOT NULL,
  `action` varchar(255) NOT NULL,
  `details` text,
  `ip_address` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`log_id`)
) ENGINE=MyISAM AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`log_id`, `timestamp`, `actor_type`, `actor_id`, `action`, `details`, `ip_address`) VALUES
(1, '2026-04-28 11:34:07', 'student', 1, 'login', 'User logged in as student', '127.0.0.1'),
(2, '2026-04-28 11:45:58', 'it', 1, 'login', 'User logged in as it', '127.0.0.1'),
(3, '2026-04-28 12:19:57', 'ec', 1, 'login', 'User logged in as chairperson', '127.0.0.1'),
(4, '2026-04-28 12:28:33', 'ec', 3, 'login', 'User logged in as general_secretary', '127.0.0.1'),
(5, '2026-04-28 13:25:46', 'ec', 3, 'create_election', 'Created election: Guild Presidential Election 2026', '127.0.0.1'),
(6, '2026-04-28 15:42:32', 'ec', 3, 'add_position', 'Added position Guild President to election 1', '127.0.0.1'),
(7, '2026-04-28 15:43:20', 'ec', 3, 'update_election', 'Updated election 1', '127.0.0.1'),
(8, '2026-04-28 17:57:23', 'ec', 3, 'add_candidates_bulk', 'Added 3 candidates', '127.0.0.1'),
(9, '2026-04-28 18:46:39', 'ec', 3, 'edit_candidate', 'Updated candidate 1', '127.0.0.1'),
(10, '2026-04-28 18:47:17', 'ec', 3, 'edit_candidate', 'Updated candidate 2', '127.0.0.1'),
(11, '2026-05-05 05:11:33', 'student', 1, 'login', 'User logged in as student', '127.0.0.1'),
(12, '2026-05-05 06:07:36', 'student', 2, 'login', 'User logged in as student', '127.0.0.1'),
(13, '2026-05-05 06:22:25', 'ec', 2, 'login', 'User logged in as vice_chairperson', '127.0.0.1'),
(14, '2026-05-05 08:30:18', 'ec', 3, 'login', 'User logged in as general_secretary', '127.0.0.1'),
(15, '2026-05-05 08:37:13', 'ec', 3, 'create_election', 'Created election: Guild Presidential Election 2026', '127.0.0.1'),
(16, '2026-05-05 08:37:13', 'ec', 3, 'add_position', 'Added position Guild President to election 2', '127.0.0.1'),
(17, '2026-05-05 08:54:19', 'ec', 3, 'login', 'User logged in as general_secretary', '127.0.0.1'),
(18, '2026-05-05 08:54:47', 'ec', 3, 'delete_candidate', 'Deleted candidate 2 from election 1', '127.0.0.1'),
(19, '2026-05-05 08:54:51', 'ec', 3, 'delete_candidate', 'Deleted candidate 3 from election 1', '127.0.0.1'),
(20, '2026-05-05 08:54:55', 'ec', 3, 'delete_candidate', 'Deleted candidate 1 from election 1', '127.0.0.1'),
(21, '2026-05-05 09:05:03', 'ec', 3, 'add_candidates_bulk', 'Added 2 candidates', '127.0.0.1'),
(22, '2026-05-05 09:05:18', 'ec', 3, 'add_candidates_bulk', 'Added 1 candidates', '127.0.0.1'),
(23, '2026-05-05 09:07:16', 'student', 1, 'login', 'User logged in as student', '127.0.0.1'),
(24, '2026-05-05 09:10:46', 'ec', 1, 'login', 'User logged in as chairperson', '127.0.0.1'),
(25, '2026-05-05 09:11:10', 'ec', 1, 'update_election_status', 'Updated election 1 status to closed', '127.0.0.1'),
(26, '2026-05-05 09:11:19', 'ec', 1, 'update_election_status', 'Updated election 2 status to active', '127.0.0.1'),
(27, '2026-05-05 09:12:41', 'student', 1, 'login', 'User logged in as student', '127.0.0.1'),
(28, '2026-05-05 09:31:08', 'ec', 3, 'login', 'User logged in as general_secretary', '127.0.0.1'),
(29, '2026-05-05 09:32:41', 'ec', 3, 'login', 'User logged in as general_secretary', '127.0.0.1'),
(30, '2026-05-05 09:42:35', 'ec', 3, 'login', 'User logged in as general_secretary', '127.0.0.1'),
(31, '2026-05-05 10:19:34', 'student', 1, 'login', 'User logged in as student', '127.0.0.1'),
(32, '2026-05-05 10:27:28', 'student', 3, 'login', 'User logged in as student', '127.0.0.1'),
(33, '2026-05-05 10:39:26', 'student', 1, 'login', 'User logged in as student', '127.0.0.1'),
(34, '2026-05-05 10:50:01', 'ec', 3, 'login', 'User logged in as general_secretary', '127.0.0.1'),
(35, '2026-05-05 11:25:36', 'ec', 3, 'login', 'User logged in as general_secretary', '127.0.0.1'),
(36, '2026-05-05 11:30:37', 'ec', 3, 'create_election', 'Created election: Guild Presidential Election 2026', '127.0.0.1'),
(37, '2026-05-05 11:30:37', 'ec', 3, 'add_position', 'Added position Guild President to election 3', '127.0.0.1'),
(38, '2026-05-05 11:31:18', 'ec', 3, 'update_election', 'Updated election 3', '127.0.0.1'),
(39, '2026-05-05 11:38:21', 'student', 11, 'login', 'User logged in as student', '127.0.0.1'),
(40, '2026-05-05 12:09:53', 'it', 1, 'login', 'User logged in as it', '127.0.0.1'),
(41, '2026-05-05 12:47:17', 'ec', 3, 'login', 'User logged in as general_secretary', '127.0.0.1'),
(42, '2026-05-05 12:48:08', 'ec', 2, 'login', 'User logged in as vice_chairperson', '127.0.0.1'),
(43, '2026-05-05 12:50:27', 'student', 27, 'login', 'User logged in as student', '127.0.0.1'),
(44, '2026-05-05 12:51:53', 'it', 1, 'login', 'User logged in as it', '127.0.0.1'),
(45, '2026-05-05 12:55:12', 'ec', 4, 'login', 'User logged in as Public Relations Officer', '127.0.0.1'),
(46, '2026-05-05 13:18:48', 'ec', 4, 'login', 'User logged in as Public Relations Officer', '127.0.0.1'),
(47, '2026-05-05 13:21:43', 'ec', 3, 'login', 'User logged in as general_secretary', '127.0.0.1'),
(48, '2026-05-05 13:53:53', 'ec', 4, 'login', 'User logged in as Public Relations Officer', '127.0.0.1'),
(49, '2026-05-05 14:58:50', 'ec', 4, 'login', 'User logged in as Public Relations Officer', '127.0.0.1'),
(50, '2026-05-05 15:01:30', 'ec', 4, 'CREATE_ANNOUNCEMENT', 'Created announcement: Vacant Position with 1 images', '127.0.0.1'),
(51, '2026-05-05 15:02:24', 'student', 27, 'login', 'User logged in as student', '127.0.0.1'),
(52, '2026-05-05 15:29:50', 'student', 27, 'login', 'User logged in as student', '127.0.0.1'),
(53, '2026-05-05 16:14:31', 'student', 6, 'login', 'User logged in as student', '127.0.0.1');

-- --------------------------------------------------------

--
-- Table structure for table `candidates`
--

DROP TABLE IF EXISTS `candidates`;
CREATE TABLE IF NOT EXISTS `candidates` (
  `candidate_id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `position_id` int NOT NULL,
  `manifesto` text,
  `photo_url` varchar(255) DEFAULT NULL,
  `designation` text,
  `political_affiliation` text,
  `score` int DEFAULT '0',
  PRIMARY KEY (`candidate_id`),
  KEY `student_id` (`student_id`),
  KEY `position_id` (`position_id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `candidates`
--

INSERT INTO `candidates` (`candidate_id`, `student_id`, `position_id`, `manifesto`, `photo_url`, `designation`, `political_affiliation`, `score`) VALUES
(4, 22, 1, NULL, '/uploads/candidates/candidate-1777971903526-780291980.jpg', NULL, 'NUP', 0),
(5, 2, 1, NULL, '/uploads/candidates/candidate-1777971903694-256774491.jpg', NULL, 'INDEPENDENT', 0),
(6, 15, 1, NULL, '/uploads/candidates/candidate-1777971918280-452032084.png', NULL, 'NRM', 0);

-- --------------------------------------------------------

--
-- Table structure for table `ec_members`
--

DROP TABLE IF EXISTS `ec_members`;
CREATE TABLE IF NOT EXISTS `ec_members` (
  `ec_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(191) NOT NULL,
  `role` enum('chairperson','vice_chairperson','general_secretary','Public Relations Officer') NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ec_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ec_members`
--

INSERT INTO `ec_members` (`ec_id`, `full_name`, `email`, `role`, `password_hash`, `created_at`) VALUES
(1, 'Atim Charles', 'charlie@ec.university.edu', 'chairperson', '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 11:38:24'),
(2, 'Mugenyi James', 'james@ec.university.edu', 'vice_chairperson', '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 11:40:41'),
(3, ' Mutungi Dana', 'dana@ec.university.edu', 'general_secretary', '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 11:42:27'),
(4, ' Murungi Patricia', 'patricia@ec.university.edu', 'Public Relations Officer', '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 12:04:18');

-- --------------------------------------------------------

--
-- Table structure for table `elections`
--

DROP TABLE IF EXISTS `elections`;
CREATE TABLE IF NOT EXISTS `elections` (
  `election_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` enum('draft','pending','active','paused','closed','archived') DEFAULT 'draft',
  `is_results_approved` tinyint(1) DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`election_id`),
  KEY `created_by` (`created_by`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `elections`
--

INSERT INTO `elections` (`election_id`, `title`, `description`, `start_time`, `end_time`, `status`, `is_results_approved`, `created_by`, `created_at`) VALUES
(1, 'Guild Presidential Election 2026', 'Election for students guild president', '2026-04-29 04:00:00', '2026-04-29 14:59:00', 'closed', 0, 3, '2026-04-28 13:25:46'),
(2, 'Guild Presidential Election 2026', 'Election for students guild president', '2026-05-05 12:00:00', '2026-05-05 13:00:00', 'active', 0, 3, '2026-05-05 08:37:12'),
(3, 'Guild Presidential Election 2026', 'Election for students guild president', '2026-05-05 02:35:00', '2026-05-05 11:50:00', 'draft', 0, 3, '2026-05-05 11:30:37');

-- --------------------------------------------------------

--
-- Table structure for table `it_admins`
--

DROP TABLE IF EXISTS `it_admins`;
CREATE TABLE IF NOT EXISTS `it_admins` (
  `admin_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `it_admins`
--

INSERT INTO `it_admins` (`admin_id`, `full_name`, `email`, `password_hash`, `created_at`) VALUES
(1, 'Kato Ivan ', 'ivan@it.university.edu', '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 11:45:20');

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
CREATE TABLE IF NOT EXISTS `messages` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `content` text NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `sender_id` (`sender_id`),
  KEY `receiver_id` (`receiver_id`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`message_id`, `sender_id`, `receiver_id`, `content`, `timestamp`) VALUES
(1, 4, 1, 'uuuu', '2026-05-05 14:45:17'),
(2, 4, 2, 'hey', '2026-05-05 14:45:39');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `student_id` (`student_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `positions`
--

DROP TABLE IF EXISTS `positions`;
CREATE TABLE IF NOT EXISTS `positions` (
  `position_id` int NOT NULL AUTO_INCREMENT,
  `election_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  PRIMARY KEY (`position_id`),
  KEY `election_id` (`election_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `positions`
--

INSERT INTO `positions` (`position_id`, `election_id`, `title`, `description`) VALUES
(1, 1, 'Guild President', 'candidate for guild president'),
(2, 2, 'Guild President', NULL),
(3, 3, 'Guild President', 'Main guild presidential position');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
CREATE TABLE IF NOT EXISTS `students` (
  `student_id` int NOT NULL AUTO_INCREMENT,
  `student_number` varchar(50) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `sex` enum('M','F') DEFAULT NULL,
  `email` varchar(191) NOT NULL,
  `faculty` varchar(100) NOT NULL,
  `program` varchar(100) DEFAULT NULL,
  `residence` varchar(100) DEFAULT NULL,
  `is_eligible` tinyint(1) DEFAULT '1',
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_id`),
  UNIQUE KEY `student_number` (`student_number`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`student_id`, `student_number`, `full_name`, `sex`, `email`, `faculty`, `program`, `residence`, `is_eligible`, `password_hash`, `created_at`) VALUES
(1, '2024/BCS/001', 'Alice Nakato', 'F', 'alice@university.edu', 'FCI', 'BCS', 'Kihumuro Hall- Ladies Flat', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 09:51:21'),
(2, '2024/EEE/001', 'Mugisha Joseph', 'M', 'mugisha.joseph@university.edu', 'FAST', 'EEE', 'Mile 3', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(3, '2024/CVE/002', 'Okello David', 'M', 'okello.david@university.edu', 'FAST', 'CVE', 'Mile 4', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(4, '2024/BME/003', 'Byamukama Moses', 'M', 'byamukama.moses@university.edu', 'FAST', 'BME', 'Kiyanja', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(5, '2024/MIE/004', 'Musinguzi Isaac', 'M', 'musinguzi.isaac@university.edu', 'FAST', 'MIE', 'Katete', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(6, '2024/PEEM/005', 'Ogonyo Trevor', 'M', 'ogonyo.trevor@university.edu', 'FAST', 'PEEM', 'Taso', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(7, '2024/BMLS/006', 'Kato Emmanuel', 'M', 'kato.emmanuel@university.edu', 'FoM', 'BMLS', 'Town-campus Gents flat', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(8, '2024/BNS/007', 'Otim Andrew', 'M', 'otim.andrew@university.edu', 'FoM', 'BNS', 'KIhumuro-campus Gents flat', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(9, '2024/PHA/008', 'Taremwa Joshua', 'M', 'taremwa.joshua@university.edu', 'FoM', 'PHA', 'Mile 3', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(10, '2024/MBM/009', 'Mukasa Samuel', 'M', 'mukasa.samuel@university.edu', 'FoM', 'MBM', 'Mile 4', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(11, '2024/SWE/010', 'Nsubuga Peter', 'M', 'nsubuga.peter@university.edu', 'FCI', 'SWE', 'Kiyanja', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(12, '2024/BIT/011', 'Odong John', 'M', 'odong.john@university.edu', 'FCI', 'BIT', 'Katete', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(13, '2024/BCS/012', 'Baguma Robert', 'M', 'baguma.robert@university.edu', 'FCI', 'BCS', 'Taso', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(14, '2024/BPCD/013', 'Lule Charles', 'M', 'lule.charles@university.edu', 'FIS', 'BPCD', 'Town-campus Gents flat', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(15, '2024/BSAL/014', 'Asiimwe David', 'M', 'asiimwe.david@university.edu', 'FIS', 'BSAL', 'KIhumuro-campus Gents flat', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(16, '2024/BPSM/015', 'Matovu Patrick', 'M', 'matovu.patrick@university.edu', 'FoBMS', 'BPSM', 'Mile 3', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(17, '2024/BAF/016', 'Nakato Jane', 'F', 'nakato.jane@university.edu', 'FoBMS', 'BAF', 'Town-campus Ladies flat', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(18, '2024/BBA/017', 'Namatovu Sarah', 'F', 'namatovu.sarah@university.edu', 'FoBMS', 'BBA', 'KIhumuro-campus Ladies flat', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(19, '2024/SEP/018', 'Mbabazi Irene', 'F', 'mbabazi.irene@university.edu', 'FoS', 'SEP', 'Mile 4', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(20, '2024/SEB/019', 'Birungi Grace', 'F', 'birungi.grace@university.edu', 'FoS', 'SEB', 'Kiyanja', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(21, '2024/EEE/020', 'Mirembe Elizabeth', 'F', 'mirembe.elizabeth@university.edu', 'FAST', 'EEE', 'Katete', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(22, '2024/CVE/021', 'Akello Annette', 'F', 'akello.annette@university.edu', 'FAST', 'CVE', 'Taso', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(23, '2024/BME/022', 'Namukasa Margaret', 'F', 'namukasa.margaret@university.edu', 'FAST', 'BME', 'Town-campus Ladies flat', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(24, '2024/MIE/023', 'Nankya Patricia', 'F', 'nankya.patricia@university.edu', 'FAST', 'MIE', 'KIhumuro-campus Ladies flat', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(25, '2024/PEEM/024', 'Atuhaire Susan', 'F', 'atuhaire.susan@university.edu', 'FAST', 'PEEM', 'Mile 3', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(26, '2024/BMLS/025', 'Namata Joan', 'F', 'namata.joan@university.edu', 'FoM', 'BMLS', 'Mile 4', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(27, '2024/BNS/026', 'Kyomugisha Lydia', 'F', 'kyomugisha.lydia@university.edu', 'FoM', 'BNS', 'Kiyanja', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(28, '2024/PHA/027', 'Nansubuga Phiona', 'F', 'nansubuga.phiona@university.edu', 'FoM', 'PHA', 'Katete', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(29, '2024/MBM/028', 'Namubiru Rachael', 'F', 'namubiru.rachael@university.edu', 'FoM', 'MBM', 'Taso', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(30, '2024/SWE/029', 'Masika Brenda', 'F', 'masika.brenda@university.edu', 'FCI', 'SWE', 'Town-campus Ladies flat', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57'),
(31, '2024/BIT/030', 'Amulen Prisca', 'F', 'amulen.prisca@university.edu', 'FCI', 'BIT', 'KIhumuro-campus Ladies flat', 1, '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy', '2026-04-28 13:15:57');

-- --------------------------------------------------------

--
-- Table structure for table `student_feedback`
--

DROP TABLE IF EXISTS `student_feedback`;
CREATE TABLE IF NOT EXISTS `student_feedback` (
  `feedback_id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `category` enum('complaint','suggestion','inquiry','other') DEFAULT 'complaint',
  `status` enum('pending','reviewed','resolved') DEFAULT 'pending',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  KEY `student_id` (`student_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voter_registry`
--

DROP TABLE IF EXISTS `voter_registry`;
CREATE TABLE IF NOT EXISTS `voter_registry` (
  `registry_id` int NOT NULL AUTO_INCREMENT,
  `election_id` int NOT NULL,
  `student_id` int NOT NULL,
  `has_voted` tinyint(1) DEFAULT '1',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`registry_id`),
  UNIQUE KEY `election_id` (`election_id`,`student_id`),
  KEY `student_id` (`student_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `votes`
--

DROP TABLE IF EXISTS `votes`;
CREATE TABLE IF NOT EXISTS `votes` (
  `vote_id` int NOT NULL AUTO_INCREMENT,
  `election_id` int NOT NULL,
  `encrypted_vote` text NOT NULL,
  `voter_id` int DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`vote_id`),
  KEY `election_id` (`election_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

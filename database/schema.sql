
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `act_assess_idx` (`assessment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_answers` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `factor_id` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('NONE','PARTIAL','YES','NA') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `self_level` int DEFAULT NULL,
  `answer` text COLLATE utf8mb4_unicode_ci,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `answer_uq` (`assessment_id`,`factor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessments` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cycle_year` int NOT NULL,
  `status` enum('DRAFT','AWAITING_PAYMENT','DATA_COLLECTION','SUBMITTED','UNDER_REVIEW','INFO_REQUESTED','DESK_COMPLETED','VERIFICATION','CERTIFIED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `track` enum('EMERGING','MEDIUM','LARGE') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expenses` decimal(16,2) DEFAULT NULL,
  `coverage` decimal(5,2) DEFAULT NULL,
  `progress` int NOT NULL DEFAULT '0',
  `assessor_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `second_assessor_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ai_gaps` json DEFAULT NULL,
  `ai_gaps_at` datetime DEFAULT NULL,
  `desk_result` json DEFAULT NULL,
  `final_result` json DEFAULT NULL,
  `desk_score` decimal(5,1) DEFAULT NULL,
  `desk_level` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `final_score` decimal(5,1) DEFAULT NULL,
  `final_level` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assessor_summary` text COLLATE utf8mb4_unicode_ci,
  `recommendations` json DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `review_started_at` datetime DEFAULT NULL,
  `desk_completed_at` datetime DEFAULT NULL,
  `certified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assess_number_uq` (`number`),
  KEY `assess_status_idx` (`status`),
  KEY `assess_org_idx` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificates` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('UNVERIFIED','VERIFIED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` decimal(5,1) NOT NULL,
  `level` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `coverage` decimal(5,2) DEFAULT NULL,
  `period_year` int NOT NULL,
  `created_at` datetime NOT NULL,
  `valid_until` datetime NOT NULL,
  `verify_code` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ACTIVE','REVOKED','EXPIRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `snapshot` json NOT NULL,
  `revoked_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cert_number_uq` (`number`),
  UNIQUE KEY `cert_verify_uq` (`verify_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `counters` (
  `key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('PERCENT','FIXED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `product` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ALL',
  `max_uses` int DEFAULT NULL,
  `used` int NOT NULL DEFAULT '0',
  `expires_at` datetime DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupon_code_uq` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_requirements` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `required` tinyint(1) NOT NULL DEFAULT '1',
  `tracks` json NOT NULL,
  `factor_ids` json NOT NULL,
  `category` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `docreq_code_uq` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_by_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requirement_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `factor_ids` json DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` int NOT NULL,
  `sha256` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ai_status` enum('PENDING','ANALYZING','DONE','FAILED','SKIPPED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `ai_result` json DEFAULT NULL,
  `ai_error` text COLLATE utf8mb4_unicode_ci,
  `doc_type` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `docs_assess_idx` (`assessment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `factor_reviews` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `factor_id` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phase` enum('DESK','VERIFIED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DESK',
  `level` int DEFAULT NULL,
  `ai_level` int DEFAULT NULL,
  `ai_confidence` decimal(4,2) DEFAULT NULL,
  `ai_rationale` text COLLATE utf8mb4_unicode_ci,
  `justification` text COLLATE utf8mb4_unicode_ci,
  `evidence_ref` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `needs_verification` tinyint(1) NOT NULL DEFAULT '0',
  `reviewer_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `review_uq` (`assessment_id`,`factor_id`,`phase`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `factors` (
  `id` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score` decimal(5,1) NOT NULL,
  `tier` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rank` int DEFAULT NULL,
  `type` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `group_name` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `axis` int DEFAULT NULL,
  `weight` decimal(6,3) DEFAULT NULL,
  `roles` json NOT NULL,
  `section` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_question` text COLLATE utf8mb4_unicode_ci,
  `definition` text COLLATE utf8mb4_unicode_ci,
  `effect` text COLLATE utf8mb4_unicode_ci,
  `asks` json NOT NULL,
  `evidence` json NOT NULL,
  `calc` text COLLATE utf8mb4_unicode_ci,
  `levels` json NOT NULL,
  `rule` text COLLATE utf8mb4_unicode_ci,
  `flags` json DEFAULT NULL,
  `example` text COLLATE utf8mb4_unicode_ci,
  `sort_order` int NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `info_requests` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `factor_id` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `response` text COLLATE utf8mb4_unicode_ci,
  `status` enum('OPEN','ANSWERED','CLOSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `created_by_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `answered_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `data` json NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inv_number_uq` (`number`),
  UNIQUE KEY `inv_payment_uq` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notif_user_idx` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizations` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license_no` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unified_no` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `org_type` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `field` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sub_fields` json DEFAULT NULL,
  `founded_year` int DEFAULT NULL,
  `website` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_year_end` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_year_expenses` decimal(16,2) DEFAULT NULL,
  `last_year_revenue` decimal(16,2) DEFAULT NULL,
  `program_expenses` decimal(16,2) DEFAULT NULL,
  `beneficiaries_count` int DEFAULT NULL,
  `programs_count` int DEFAULT NULL,
  `employees_count` int DEFAULT NULL,
  `volunteers_count` int DEFAULT NULL,
  `track` enum('EMERGING','MEDIUM','LARGE') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `contact_name` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_title` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_completed` tinyint(1) NOT NULL DEFAULT '0',
  `account_manager_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_gateways` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '0',
  `mode` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TEST',
  `config` json DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product` enum('CERTIFICATE','VERIFICATION_VISIT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `list_price` decimal(16,2) NOT NULL,
  `discount` decimal(16,2) NOT NULL DEFAULT '0.00',
  `subtotal` decimal(16,2) NOT NULL,
  `vat` decimal(16,2) NOT NULL,
  `total` decimal(16,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SAR',
  `coupon_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','AWAITING_APPROVAL','PAID','FAILED','CANCELLED','REFUNDED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `provider_ref` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_data` json DEFAULT NULL,
  `receipt_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pay_number_uq` (`number`),
  KEY `pay_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_idx` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` json NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('SUPER_ADMIN','ACCOUNT_MANAGER','ASSESSOR','ORG_USER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `permissions` json DEFAULT NULL,
  `is_field_verifier` tinyint(1) NOT NULL DEFAULT '0',
  `specialties` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `org_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `org_role` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_uq` (`email`),
  KEY `users_role_idx` (`role`),
  KEY `users_org_idx` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visits` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `consultant_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('REQUESTED','AWAITING_PAYMENT','PAID','SCHEDULED','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'REQUESTED',
  `preferred_dates` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checklist` json DEFAULT NULL,
  `sample_result` json DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `visit_assess_uq` (`assessment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


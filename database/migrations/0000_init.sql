CREATE TABLE `activity_logs` (
	`id` varchar(30) NOT NULL,
	`assessment_id` varchar(30),
	`user_id` varchar(30),
	`action` varchar(80) NOT NULL,
	`details` json,
	`created_at` datetime NOT NULL,
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assessment_answers` (
	`id` varchar(30) NOT NULL,
	`assessment_id` varchar(30) NOT NULL,
	`factor_id` varchar(8) NOT NULL,
	`status` enum('NONE','PARTIAL','YES','NA'),
	`self_level` int,
	`answer` text,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `assessment_answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `answer_uq` UNIQUE(`assessment_id`,`factor_id`)
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` varchar(30) NOT NULL,
	`number` varchar(30) NOT NULL,
	`org_id` varchar(30) NOT NULL,
	`cycle_year` int NOT NULL,
	`status` enum('DRAFT','AWAITING_PAYMENT','DATA_COLLECTION','SUBMITTED','UNDER_REVIEW','INFO_REQUESTED','DESK_COMPLETED','VERIFICATION','CERTIFIED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
	`track` enum('EMERGING','MEDIUM','LARGE'),
	`expenses` decimal(16,2),
	`coverage` decimal(5,2),
	`progress` int NOT NULL DEFAULT 0,
	`assessor_id` varchar(30),
	`second_assessor_id` varchar(30),
	`manager_id` varchar(30),
	`ai_gaps` json,
	`ai_gaps_at` datetime,
	`desk_result` json,
	`final_result` json,
	`desk_score` decimal(5,1),
	`desk_level` varchar(30),
	`final_score` decimal(5,1),
	`final_level` varchar(30),
	`assessor_summary` text,
	`recommendations` json,
	`submitted_at` datetime,
	`review_started_at` datetime,
	`desk_completed_at` datetime,
	`certified_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`),
	CONSTRAINT `assess_number_uq` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` varchar(30) NOT NULL,
	`number` varchar(30) NOT NULL,
	`assessment_id` varchar(30) NOT NULL,
	`org_id` varchar(30) NOT NULL,
	`type` enum('UNVERIFIED','VERIFIED') NOT NULL,
	`score` decimal(5,1) NOT NULL,
	`level` varchar(30) NOT NULL,
	`coverage` decimal(5,2),
	`period_year` int NOT NULL,
	`created_at` datetime NOT NULL,
	`valid_until` datetime NOT NULL,
	`verify_code` varchar(24) NOT NULL,
	`status` enum('ACTIVE','REVOKED','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
	`snapshot` json NOT NULL,
	`revoked_reason` varchar(255),
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `cert_number_uq` UNIQUE(`number`),
	CONSTRAINT `cert_verify_uq` UNIQUE(`verify_code`)
);
--> statement-breakpoint
CREATE TABLE `counters` (
	`key` varchar(40) NOT NULL,
	`value` int NOT NULL DEFAULT 0,
	CONSTRAINT `counters_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` varchar(30) NOT NULL,
	`code` varchar(40) NOT NULL,
	`type` enum('PERCENT','FIXED') NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`product` varchar(30) NOT NULL DEFAULT 'ALL',
	`max_uses` int,
	`used` int NOT NULL DEFAULT 0,
	`expires_at` datetime,
	`active` boolean NOT NULL DEFAULT true,
	`note` varchar(255),
	`created_at` datetime NOT NULL,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `document_requirements` (
	`id` varchar(30) NOT NULL,
	`code` varchar(40) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`required` boolean NOT NULL DEFAULT true,
	`tracks` json NOT NULL,
	`factor_ids` json NOT NULL,
	`category` varchar(40) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `document_requirements_id` PRIMARY KEY(`id`),
	CONSTRAINT `docreq_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` varchar(30) NOT NULL,
	`assessment_id` varchar(30) NOT NULL,
	`uploaded_by_id` varchar(30),
	`requirement_id` varchar(30),
	`factor_ids` json,
	`file_name` varchar(255) NOT NULL,
	`stored_path` varchar(255) NOT NULL,
	`mime_type` varchar(120) NOT NULL,
	`size` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`ai_status` enum('PENDING','ANALYZING','DONE','FAILED','SKIPPED') NOT NULL DEFAULT 'PENDING',
	`ai_result` json,
	`ai_error` text,
	`doc_type` varchar(120),
	`created_at` datetime NOT NULL,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `factor_reviews` (
	`id` varchar(30) NOT NULL,
	`assessment_id` varchar(30) NOT NULL,
	`factor_id` varchar(8) NOT NULL,
	`phase` enum('DESK','VERIFIED') NOT NULL DEFAULT 'DESK',
	`level` int,
	`ai_level` int,
	`ai_confidence` decimal(4,2),
	`ai_rationale` text,
	`justification` text,
	`evidence_ref` varchar(500),
	`needs_verification` boolean NOT NULL DEFAULT false,
	`reviewer_id` varchar(30),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `factor_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_uq` UNIQUE(`assessment_id`,`factor_id`,`phase`)
);
--> statement-breakpoint
CREATE TABLE `factors` (
	`id` varchar(8) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_en` varchar(255),
	`score` decimal(5,1) NOT NULL,
	`tier` varchar(2) NOT NULL,
	`rank` int,
	`type` varchar(80),
	`group_name` varchar(40) NOT NULL,
	`axis` int,
	`weight` decimal(6,3),
	`roles` json NOT NULL,
	`section` varchar(40) NOT NULL,
	`question` text NOT NULL,
	`org_question` text,
	`definition` text,
	`effect` text,
	`asks` json NOT NULL,
	`evidence` json NOT NULL,
	`calc` text,
	`levels` json NOT NULL,
	`rule` text,
	`flags` json,
	`example` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `factors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `info_requests` (
	`id` varchar(30) NOT NULL,
	`assessment_id` varchar(30) NOT NULL,
	`factor_id` varchar(8),
	`message` text NOT NULL,
	`response` text,
	`status` enum('OPEN','ANSWERED','CLOSED') NOT NULL DEFAULT 'OPEN',
	`created_by_id` varchar(30) NOT NULL,
	`created_at` datetime NOT NULL,
	`answered_at` datetime,
	CONSTRAINT `info_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(30) NOT NULL,
	`number` varchar(30) NOT NULL,
	`payment_id` varchar(30) NOT NULL,
	`created_at` datetime NOT NULL,
	`data` json NOT NULL,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `inv_number_uq` UNIQUE(`number`),
	CONSTRAINT `inv_payment_uq` UNIQUE(`payment_id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(30) NOT NULL,
	`user_id` varchar(30) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text,
	`link` varchar(255),
	`read_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` varchar(30) NOT NULL,
	`name` varchar(200) NOT NULL,
	`name_en` varchar(200),
	`license_no` varchar(60),
	`unified_no` varchar(60),
	`org_type` varchar(80),
	`region` varchar(80),
	`city` varchar(80),
	`field` varchar(120),
	`sub_fields` json,
	`founded_year` int,
	`website` varchar(200),
	`email` varchar(190),
	`phone` varchar(30),
	`address` varchar(255),
	`fiscal_year_end` varchar(10),
	`last_year_expenses` decimal(16,2),
	`last_year_revenue` decimal(16,2),
	`program_expenses` decimal(16,2),
	`beneficiaries_count` int,
	`programs_count` int,
	`employees_count` int,
	`volunteers_count` int,
	`track` enum('EMERGING','MEDIUM','LARGE'),
	`description` text,
	`contact_name` varchar(160),
	`contact_title` varchar(120),
	`profile_completed` boolean NOT NULL DEFAULT false,
	`account_manager_id` varchar(30),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_gateways` (
	`id` varchar(30) NOT NULL,
	`name` varchar(80) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`mode` varchar(10) NOT NULL DEFAULT 'TEST',
	`config` json,
	`sort_order` int NOT NULL DEFAULT 0,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `payment_gateways_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(30) NOT NULL,
	`number` varchar(30) NOT NULL,
	`org_id` varchar(30) NOT NULL,
	`assessment_id` varchar(30),
	`product` enum('CERTIFICATE','VERIFICATION_VISIT') NOT NULL,
	`list_price` decimal(16,2) NOT NULL,
	`discount` decimal(16,2) NOT NULL DEFAULT 0,
	`subtotal` decimal(16,2) NOT NULL,
	`vat` decimal(16,2) NOT NULL,
	`total` decimal(16,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'SAR',
	`coupon_id` varchar(30),
	`gateway` varchar(30),
	`status` enum('PENDING','AWAITING_APPROVAL','PAID','FAILED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING',
	`provider_ref` varchar(120),
	`provider_data` json,
	`receipt_path` varchar(255),
	`paid_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `pay_number_uq` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(30) NOT NULL,
	`expires_at` datetime NOT NULL,
	`ip` varchar(64),
	`user_agent` varchar(255),
	`created_at` datetime NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(80) NOT NULL,
	`value` json NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(30) NOT NULL,
	`email` varchar(190) NOT NULL,
	`password_hash` varchar(100) NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(30),
	`role` enum('SUPER_ADMIN','ACCOUNT_MANAGER','ASSESSOR','ORG_USER') NOT NULL,
	`permissions` json,
	`is_field_verifier` boolean NOT NULL DEFAULT false,
	`specialties` varchar(255),
	`active` boolean NOT NULL DEFAULT true,
	`org_id` varchar(30),
	`org_role` varchar(20),
	`last_login_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` varchar(30) NOT NULL,
	`assessment_id` varchar(30) NOT NULL,
	`consultant_id` varchar(30),
	`status` enum('REQUESTED','AWAITING_PAYMENT','PAID','SCHEDULED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'REQUESTED',
	`preferred_dates` varchar(255),
	`scheduled_at` datetime,
	`location` varchar(255),
	`checklist` json,
	`sample_result` json,
	`notes` text,
	`completed_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `visits_id` PRIMARY KEY(`id`),
	CONSTRAINT `visit_assess_uq` UNIQUE(`assessment_id`)
);
--> statement-breakpoint
CREATE INDEX `act_assess_idx` ON `activity_logs` (`assessment_id`);--> statement-breakpoint
CREATE INDEX `assess_status_idx` ON `assessments` (`status`);--> statement-breakpoint
CREATE INDEX `assess_org_idx` ON `assessments` (`org_id`);--> statement-breakpoint
CREATE INDEX `docs_assess_idx` ON `documents` (`assessment_id`);--> statement-breakpoint
CREATE INDEX `notif_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `pay_status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_org_idx` ON `users` (`org_id`);
CREATE TABLE `email_outbox` (
	`id` varchar(30) NOT NULL,
	`to_email` varchar(400) NOT NULL,
	`subject` varchar(250) NOT NULL,
	`html` text NOT NULL,
	`status` enum('SENT','QUEUED','FAILED') NOT NULL DEFAULT 'QUEUED',
	`error` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `email_outbox_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` varchar(30) NOT NULL,
	`assessment_id` varchar(30) NOT NULL,
	`sender_role` enum('ORG','EXPERT','STAFF') NOT NULL,
	`sender_id` varchar(30),
	`body` text NOT NULL,
	`org_read_at` datetime,
	`staff_read_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `org_documents` (
	`id` varchar(30) NOT NULL,
	`org_id` varchar(30) NOT NULL,
	`kind` enum('LICENSE','BYLAWS','AUTH_LETTER','BOARD','TAX_CERT','OTHER') NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`stored_path` varchar(255) NOT NULL,
	`mime_type` varchar(120) NOT NULL,
	`size` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`uploaded_by_id` varchar(30),
	`created_at` datetime NOT NULL,
	CONSTRAINT `org_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` varchar(30) NOT NULL,
	`org_id` varchar(30) NOT NULL,
	`user_id` varchar(30) NOT NULL,
	`role` varchar(20) NOT NULL DEFAULT 'OWNER',
	`created_at` datetime NOT NULL,
	CONSTRAINT `organization_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `orgmem_uq` UNIQUE(`org_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` varchar(30) NOT NULL,
	`user_id` varchar(30) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `password_resets_id` PRIMARY KEY(`id`),
	CONSTRAINT `pwreset_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `user_identities` (
	`id` varchar(30) NOT NULL,
	`user_id` varchar(30) NOT NULL,
	`provider` varchar(20) NOT NULL,
	`provider_user_id` varchar(120) NOT NULL,
	`email` varchar(190),
	`created_at` datetime NOT NULL,
	CONSTRAINT `user_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `identity_uq` UNIQUE(`provider`,`provider_user_id`)
);
--> statement-breakpoint
CREATE TABLE `visit_events` (
	`id` varchar(30) NOT NULL,
	`visit_id` varchar(30) NOT NULL,
	`type` varchar(30) NOT NULL,
	`actor_id` varchar(30),
	`actor_role` varchar(20),
	`note` text,
	`data` json,
	`created_at` datetime NOT NULL,
	CONSTRAINT `visit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `visits` MODIFY COLUMN `status` enum('REQUESTED','AWAITING_PAYMENT','PAID','SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'REQUESTED';--> statement-breakpoint
ALTER TABLE `assessments` ADD `verifier_id` varchar(30);--> statement-breakpoint
ALTER TABLE `assessments` ADD `reveal_assessor` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `assessments` ADD `reveal_verifier` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `assessments` ADD `assessor_assigned_at` datetime;--> statement-breakpoint
ALTER TABLE `assessments` ADD `verifier_assigned_at` datetime;--> statement-breakpoint
ALTER TABLE `organizations` ADD `license_issuer` varchar(160);--> statement-breakpoint
ALTER TABLE `organizations` ADD `license_issue_date` datetime;--> statement-breakpoint
ALTER TABLE `organizations` ADD `license_expiry` datetime;--> statement-breakpoint
ALTER TABLE `organizations` ADD `national_address` varchar(20);--> statement-breakpoint
ALTER TABLE `organizations` ADD `rep_name` varchar(160);--> statement-breakpoint
ALTER TABLE `organizations` ADD `rep_title` varchar(120);--> statement-breakpoint
ALTER TABLE `organizations` ADD `rep_phone` varchar(30);--> statement-breakpoint
ALTER TABLE `organizations` ADD `rep_email` varchar(190);--> statement-breakpoint
ALTER TABLE `organizations` ADD `verification_status` enum('UNVERIFIED','PENDING','VERIFIED','REJECTED') DEFAULT 'UNVERIFIED' NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `verification_note` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `submitted_for_verification_at` datetime;--> statement-breakpoint
ALTER TABLE `organizations` ADD `verified_at` datetime;--> statement-breakpoint
ALTER TABLE `organizations` ADD `verified_by_id` varchar(30);--> statement-breakpoint
ALTER TABLE `organizations` ADD `created_by_id` varchar(30);--> statement-breakpoint
ALTER TABLE `visits` ADD `org_confirmed_at` datetime;--> statement-breakpoint
ALTER TABLE `visits` ADD `site_contact_name` varchar(160);--> statement-breakpoint
ALTER TABLE `visits` ADD `site_contact_phone` varchar(30);--> statement-breakpoint
ALTER TABLE `visits` ADD `reschedule_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `visits` ADD `cancel_reason` varchar(255);--> statement-breakpoint
ALTER TABLE `visits` ADD `started_at` datetime;--> statement-breakpoint
ALTER TABLE `visits` ADD `followup_status` enum('NONE','DRAFT','PUBLISHED') DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE `visits` ADD `followup` json;--> statement-breakpoint
ALTER TABLE `visits` ADD `followup_published_at` datetime;--> statement-breakpoint
CREATE INDEX `outbox_created_idx` ON `email_outbox` (`created_at`);--> statement-breakpoint
CREATE INDEX `msg_assess_idx` ON `messages` (`assessment_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `orgdoc_org_idx` ON `org_documents` (`org_id`);--> statement-breakpoint
CREATE INDEX `orgmem_user_idx` ON `organization_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `pwreset_user_idx` ON `password_resets` (`user_id`);--> statement-breakpoint
CREATE INDEX `identity_user_idx` ON `user_identities` (`user_id`);--> statement-breakpoint
CREATE INDEX `vevent_visit_idx` ON `visit_events` (`visit_id`);
--> statement-breakpoint
-- نقل البيانات القائمة: كل مستخدم جهة يصبح عضواً في جهته (الجهة النشطة تبقى في users.org_id)
INSERT INTO `organization_members` (`id`, `org_id`, `user_id`, `role`, `created_at`)
SELECT CONCAT('m', SUBSTRING(MD5(CONCAT(u.`id`, u.`org_id`)), 1, 24)), u.`org_id`, u.`id`, COALESCE(u.`org_role`, 'OWNER'), NOW()
FROM `users` u WHERE u.`org_id` IS NOT NULL;--> statement-breakpoint
UPDATE `organizations` o SET o.`created_by_id` = (SELECT m.`user_id` FROM `organization_members` m WHERE m.`org_id` = o.`id` ORDER BY m.`created_at` LIMIT 1) WHERE o.`created_by_id` IS NULL;--> statement-breakpoint
-- الأسعار الأساسية الجديدة: التقييم 500 ريال، والتوثيق 5000 ريال (تشمل التقرير التعقيبي). لا يُمس إلا إن كان السعر القديم 1000
UPDATE `settings` SET `value` = JSON_SET(`value`, '$.certificate', 500) WHERE `key` = 'pricing' AND JSON_EXTRACT(`value`, '$.certificate') = 1000;
--> statement-breakpoint
-- مديرو الحسابات الذين يملكون صلاحية تعديل الجهات يحصلون على صلاحية توثيق الجهات الجديدة
UPDATE `users` SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$', 'orgs.verify') WHERE `role` = 'ACCOUNT_MANAGER' AND JSON_CONTAINS(`permissions`, '"orgs.manage"') AND NOT JSON_CONTAINS(`permissions`, '"orgs.verify"');

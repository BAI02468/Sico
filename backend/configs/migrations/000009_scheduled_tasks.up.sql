ALTER TABLE `t_conversation`
    ADD COLUMN `extra_info` json NULL COMMENT 'Extensible conversation metadata' AFTER `ext`;

INSERT INTO `t_casbin_rule` (`ptype`, `v0`, `v1`, `v2`, `v3`) VALUES ('p', 'org_admin', '*', 'sicodev', 'entry');
INSERT INTO `t_casbin_rule` (`ptype`, `v0`, `v1`, `v2`, `v3`) VALUES ('p', 'org_admin', '*', 'agent', 'create');

CREATE TABLE `t_scheduled_task` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
    `name` varchar(256) NOT NULL DEFAULT '' COMMENT 'Display name',
    `enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether future occurrences may run',
    `agent_instance_id` bigint NOT NULL COMMENT 'Fixed agent instance ID',
    `creator_username` varchar(128) NOT NULL COMMENT 'Creator username',
    `message` mediumtext NOT NULL COMMENT 'Fixed user message',
    `attachments` json NULL COMMENT 'Fixed user-message attachments',
    `extra_info` json NULL COMMENT 'Extensible scheduled task metadata',
    `cron_expression` varchar(128) NOT NULL COMMENT 'Five-field cron expression',
    `timezone` varchar(128) NOT NULL COMMENT 'IANA timezone name',
    `next_run_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Next occurrence in Unix milliseconds',
    `last_run_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Last claimed occurrence in Unix milliseconds',
    `created_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Creation time in Unix milliseconds',
    `updated_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Update time in Unix milliseconds',
    `deleted_at` datetime NULL COMMENT 'Deletion time',
    PRIMARY KEY (`id`),
    KEY `idx_scheduled_task_due` (`enabled`, `next_run_at`, `deleted_at`),
    KEY `idx_scheduled_task_creator` (`creator_username`, `deleted_at`)
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Scheduled agent tasks';

CREATE TABLE `t_scheduled_task_run` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
    `scheduled_task_id` bigint unsigned NOT NULL COMMENT 'Scheduled task ID',
    `scheduled_for` bigint unsigned NOT NULL COMMENT 'Claimed occurrence in Unix milliseconds',
    `status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '1=claimed, 2=running, 3=succeeded, 4=failed',
    `submission_id` varchar(128) NOT NULL COMMENT 'Deterministic chat submission ID',
    `conversation_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Created conversation ID',
    `error_message` text NULL COMMENT 'Execution error',
    `extra_info` json NULL COMMENT 'Extensible run result metadata',
    `notification_sent_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Completion notification time in Unix milliseconds',
    `started_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Start time in Unix milliseconds',
    `finished_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Finish time in Unix milliseconds',
    `lease_expires_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Worker lease expiration in Unix milliseconds',
    `created_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Creation time in Unix milliseconds',
    `updated_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Update time in Unix milliseconds',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_scheduled_task_occurrence` (`scheduled_task_id`, `scheduled_for`),
    KEY `idx_scheduled_task_run_task` (`scheduled_task_id`, `created_at`),
    KEY `idx_scheduled_task_run_lease` (`status`, `lease_expires_at`),
    KEY `idx_scheduled_task_run_notification` (`status`, `notification_sent_at`)
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Scheduled task execution ledger';

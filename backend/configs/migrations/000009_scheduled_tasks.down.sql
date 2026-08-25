DROP TABLE IF EXISTS `t_scheduled_task_run`;
DROP TABLE IF EXISTS `t_scheduled_task`;

DELETE FROM `t_casbin_rule`
WHERE `ptype` = 'p' AND `v0` = 'org_admin' AND `v1` = '*' AND `v2` = 'sicodev' AND `v3` = 'entry';
DELETE FROM `t_casbin_rule`
WHERE `ptype` = 'p' AND `v0` = 'org_admin' AND `v1` = '*' AND `v2` = 'agent' AND `v3` = 'create';

ALTER TABLE `t_conversation`
    DROP COLUMN `extra_info`;

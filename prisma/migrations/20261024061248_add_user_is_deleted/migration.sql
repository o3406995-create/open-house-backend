-- AlterTable
ALTER TABLE `User` ADD COLUMN `is_deleted` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `User_is_deleted_role_idx` ON `User`(`is_deleted`, `role`);

UPDATE `User` SET `is_deleted` = true WHERE `deleted_at` IS NOT NULL;

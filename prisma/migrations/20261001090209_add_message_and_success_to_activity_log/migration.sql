/*
  Warnings:

  - Added the required column `success` to the `ActivityLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ActivityLog` ADD COLUMN `message` VARCHAR(191) NULL,
    ADD COLUMN `success` BOOLEAN NOT NULL;

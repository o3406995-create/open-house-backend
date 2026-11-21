/*
  Warnings:

  - A unique constraint covering the columns `[property_id,external_id]` on the table `OpenHouse` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `OpenHouse` ADD COLUMN `external_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `OpenHouse_property_id_external_id_key` ON `OpenHouse`(`property_id`, `external_id`);

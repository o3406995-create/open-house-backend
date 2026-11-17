/*
  Warnings:

  - A unique constraint covering the columns `[source,external_id]` on the table `Property` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Property` ADD COLUMN `display_price` VARCHAR(191) NULL,
    ADD COLUMN `external_id` VARCHAR(191) NULL,
    ADD COLUMN `listing_url` VARCHAR(2048) NULL,
    ADD COLUMN `source` VARCHAR(191) NULL,
    MODIFY `price` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Property_source_external_id_key` ON `Property`(`source`, `external_id`);

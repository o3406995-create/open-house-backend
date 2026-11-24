/*
  Warnings:

  - A unique constraint covering the columns `[saved_property_id]` on the table `Note` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_openhouse_id]` on the table `Note` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Note` ADD COLUMN `saved_property_id` INTEGER NULL,
    ADD COLUMN `user_openhouse_id` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Note_saved_property_id_key` ON `Note`(`saved_property_id`);

-- CreateIndex
CREATE UNIQUE INDEX `Note_user_openhouse_id_key` ON `Note`(`user_openhouse_id`);

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_saved_property_id_fkey` FOREIGN KEY (`saved_property_id`) REFERENCES `SavedProperty`(`saved_property_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_user_openhouse_id_fkey` FOREIGN KEY (`user_openhouse_id`) REFERENCES `UserOpenHouse`(`user_openHouse_id`) ON DELETE CASCADE ON UPDATE CASCADE;

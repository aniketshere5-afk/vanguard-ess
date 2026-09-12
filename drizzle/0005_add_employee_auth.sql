ALTER TABLE `users` ADD COLUMN `employeeId` varchar(40);--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD UNIQUE INDEX `user_employee_id_idx` (`employeeId`);

CREATE TABLE `device_families` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyCode` varchar(80) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_families_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_families_familyCode_unique` UNIQUE(`familyCode`)
);
--> statement-breakpoint
CREATE TABLE `drift_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`componentId` int NOT NULL,
	`analysisId` int NOT NULL,
	`horizonHours` int NOT NULL,
	`predictedValue` decimal(12,4) NOT NULL,
	`lowerBound` decimal(12,4),
	`upperBound` decimal(12,4),
	`modelVersion` varchar(60) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drift_predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`componentId` int NOT NULL,
	`analysisId` int NOT NULL,
	`score` decimal(6,2) NOT NULL,
	`band` varchar(30) NOT NULL,
	`contributorsJson` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `risk_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `test_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lotId` int NOT NULL,
	`runCode` varchar(80) NOT NULL,
	`conditionJson` json,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `test_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `test_runs_runCode_unique` UNIQUE(`runCode`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','qa','scientist') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `drift_predictions` ADD CONSTRAINT `drift_predictions_componentId_components_id_fk` FOREIGN KEY (`componentId`) REFERENCES `components`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drift_predictions` ADD CONSTRAINT `drift_predictions_analysisId_analysis_runs_id_fk` FOREIGN KEY (`analysisId`) REFERENCES `analysis_runs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risk_scores` ADD CONSTRAINT `risk_scores_componentId_components_id_fk` FOREIGN KEY (`componentId`) REFERENCES `components`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risk_scores` ADD CONSTRAINT `risk_scores_analysisId_analysis_runs_id_fk` FOREIGN KEY (`analysisId`) REFERENCES `analysis_runs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_runs` ADD CONSTRAINT `test_runs_lotId_lots_id_fk` FOREIGN KEY (`lotId`) REFERENCES `lots`(`id`) ON DELETE no action ON UPDATE no action;
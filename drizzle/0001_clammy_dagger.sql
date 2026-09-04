CREATE TABLE `analysis_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`componentId` int NOT NULL,
	`status` varchar(30) NOT NULL,
	`resultJson` json NOT NULL,
	`modelVersion` varchar(60) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysis_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(80) NOT NULL,
	`targetType` varchar(50) NOT NULL,
	`targetId` varchar(80),
	`actorId` int,
	`metadataJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`componentCode` varchar(64) NOT NULL,
	`lotId` int NOT NULL,
	`scenario` varchar(80) NOT NULL,
	`unit` varchar(20) NOT NULL DEFAULT 'µA',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `components_id` PRIMARY KEY(`id`),
	CONSTRAINT `components_componentCode_unique` UNIQUE(`componentCode`)
);
--> statement-breakpoint
CREATE TABLE `decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investigationId` int NOT NULL,
	`decision` varchar(80) NOT NULL,
	`comment` text,
	`decidedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investigations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`componentId` int NOT NULL,
	`status` enum('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
	`suggestedAction` varchar(80) NOT NULL,
	`openedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	CONSTRAINT `investigations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lotCode` varchar(64) NOT NULL,
	`deviceFamily` varchar(100) NOT NULL,
	`dataLabel` varchar(100) NOT NULL DEFAULT 'Synthetic / Demonstration Data',
	`specificationMax` decimal(12,4) NOT NULL,
	`safetyMargin` decimal(12,4) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lots_id` PRIMARY KEY(`id`),
	CONSTRAINT `lots_lotCode_unique` UNIQUE(`lotCode`),
	CONSTRAINT `lot_code_idx` UNIQUE(`lotCode`)
);
--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`componentId` int NOT NULL,
	`checkpointHours` int NOT NULL,
	`leakageCurrent` decimal(12,4) NOT NULL,
	`temperatureC` decimal(8,3) NOT NULL DEFAULT '25',
	`voltageV` decimal(8,3) NOT NULL DEFAULT '5',
	`measuredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `measurements_id` PRIMARY KEY(`id`),
	CONSTRAINT `component_time_idx` UNIQUE(`componentId`,`checkpointHours`)
);
--> statement-breakpoint
CREATE TABLE `model_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`modelType` varchar(80) NOT NULL,
	`version` varchar(40) NOT NULL,
	`featureVersion` varchar(40) NOT NULL,
	`datasetId` varchar(120) NOT NULL,
	`metricsJson` json NOT NULL,
	`trainedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `model_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `analysis_component_idx` ON `analysis_runs` (`componentId`);--> statement-breakpoint
CREATE INDEX `audit_time_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `component_lot_idx` ON `components` (`lotId`);
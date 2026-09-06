ALTER TABLE `components` DROP INDEX `components_componentCode_unique`;--> statement-breakpoint
ALTER TABLE `components` ADD CONSTRAINT `component_lot_code_idx` UNIQUE(`lotId`,`componentCode`);
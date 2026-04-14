CREATE TABLE `asset_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`assetId` int NOT NULL,
	`userId` int,
	`assignedTo` varchar(255),
	`location` varchar(255),
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`returnedAt` timestamp,
	`notes` text,
	`assignedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `asset_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`categoryId` int,
	`warehouseId` int,
	`name` varchar(255) NOT NULL,
	`assetTag` varchar(100) NOT NULL,
	`serialNumber` varchar(100),
	`model` varchar(255),
	`manufacturer` varchar(255),
	`description` text,
	`status` enum('active','maintenance','retired','disposed','lost') NOT NULL DEFAULT 'active',
	`condition` enum('new','good','fair','poor') NOT NULL DEFAULT 'good',
	`purchaseDate` timestamp,
	`purchasePrice` decimal(15,2),
	`warrantyExpiry` timestamp,
	`depreciationRate` decimal(5,2),
	`currentValue` decimal(15,2),
	`supplierId` int,
	`imageUrl` text,
	`qrCode` text,
	`notes` text,
	`customFields` json,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `asset_org_tag_idx` UNIQUE(`organizationId`,`assetTag`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int,
	`action` varchar(100) NOT NULL,
	`module` varchar(50) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`entityName` varchar(255),
	`changes` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`parentId` int,
	`type` enum('inventory','asset','both') NOT NULL DEFAULT 'both',
	`color` varchar(20),
	`icon` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `cat_org_slug_idx` UNIQUE(`organizationId`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50),
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`city` varchar(100),
	`country` varchar(100),
	`contactPerson` varchar(255),
	`taxId` varchar(100),
	`creditLimit` decimal(15,2) DEFAULT '0',
	`paymentTerms` varchar(100),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `file_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`uploadedBy` int,
	`filename` varchar(500) NOT NULL,
	`originalName` varchar(500) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`size` int NOT NULL,
	`url` text NOT NULL,
	`fileKey` text NOT NULL,
	`referenceType` varchar(50),
	`referenceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `file_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`categoryId` int,
	`name` varchar(255) NOT NULL,
	`sku` varchar(100) NOT NULL,
	`barcode` varchar(100),
	`description` text,
	`unit` varchar(50) DEFAULT 'pcs',
	`costPrice` decimal(15,2) DEFAULT '0',
	`sellingPrice` decimal(15,2) DEFAULT '0',
	`reorderPoint` int DEFAULT 0,
	`reorderQty` int DEFAULT 0,
	`maxStock` int,
	`imageUrl` text,
	`supplierId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`tags` json,
	`customFields` json,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `inventory_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `inv_org_sku_idx` UNIQUE(`organizationId`,`sku`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`referenceType` varchar(50),
	`referenceId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `org_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','manager','staff','viewer') NOT NULL DEFAULT 'staff',
	`isActive` boolean NOT NULL DEFAULT true,
	`invitedBy` int,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `org_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_user_idx` UNIQUE(`organizationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `org_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`lowStockAlerts` boolean NOT NULL DEFAULT true,
	`emailNotifications` boolean NOT NULL DEFAULT true,
	`autoReorder` boolean NOT NULL DEFAULT false,
	`defaultWarehouseId` int,
	`fiscalYearStart` varchar(10) DEFAULT '01-01',
	`dateFormat` varchar(20) DEFAULT 'MM/DD/YYYY',
	`customFields` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `org_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_settings_organizationId_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`logoUrl` text,
	`website` varchar(500),
	`industry` varchar(100),
	`timezone` varchar(100) DEFAULT 'UTC',
	`currency` varchar(10) DEFAULT 'USD',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`module` varchar(50) NOT NULL,
	`action` varchar(50) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`itemId` int NOT NULL,
	`quantity` int NOT NULL,
	`receivedQty` int NOT NULL DEFAULT 0,
	`unitPrice` decimal(15,2) NOT NULL,
	`totalPrice` decimal(15,2) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`orderNumber` varchar(100) NOT NULL,
	`supplierId` int NOT NULL,
	`warehouseId` int,
	`status` enum('draft','pending','approved','ordered','partial','received','cancelled') NOT NULL DEFAULT 'draft',
	`orderDate` timestamp NOT NULL DEFAULT (now()),
	`expectedDate` timestamp,
	`receivedDate` timestamp,
	`subtotal` decimal(15,2) DEFAULT '0',
	`taxAmount` decimal(15,2) DEFAULT '0',
	`discountAmount` decimal(15,2) DEFAULT '0',
	`totalAmount` decimal(15,2) DEFAULT '0',
	`currency` varchar(10) DEFAULT 'USD',
	`notes` text,
	`createdBy` int,
	`approvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `po_org_num_idx` UNIQUE(`organizationId`,`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`role` enum('owner','admin','manager','staff','viewer') NOT NULL,
	`permissionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_perm_idx` UNIQUE(`organizationId`,`role`,`permissionId`)
);
--> statement-breakpoint
CREATE TABLE `sales_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`salesOrderId` int NOT NULL,
	`itemId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(15,2) NOT NULL,
	`totalPrice` decimal(15,2) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`orderNumber` varchar(100) NOT NULL,
	`customerId` int,
	`warehouseId` int,
	`status` enum('draft','confirmed','processing','shipped','delivered','cancelled','returned') NOT NULL DEFAULT 'draft',
	`orderDate` timestamp NOT NULL DEFAULT (now()),
	`requiredDate` timestamp,
	`shippedDate` timestamp,
	`shippingAddress` text,
	`subtotal` decimal(15,2) DEFAULT '0',
	`taxAmount` decimal(15,2) DEFAULT '0',
	`discountAmount` decimal(15,2) DEFAULT '0',
	`totalAmount` decimal(15,2) DEFAULT '0',
	`currency` varchar(10) DEFAULT 'USD',
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `sales_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `so_org_num_idx` UNIQUE(`organizationId`,`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `stock_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`itemId` int NOT NULL,
	`warehouseId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`reservedQty` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_levels_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_item_wh_idx` UNIQUE(`itemId`,`warehouseId`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`itemId` int NOT NULL,
	`warehouseId` int NOT NULL,
	`toWarehouseId` int,
	`type` enum('in','out','transfer','adjustment','return') NOT NULL,
	`quantity` int NOT NULL,
	`unitCost` decimal(15,2),
	`referenceType` varchar(50),
	`referenceId` int,
	`notes` text,
	`performedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50),
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`city` varchar(100),
	`country` varchar(100),
	`contactPerson` varchar(255),
	`taxId` varchar(100),
	`paymentTerms` varchar(100),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`address` text,
	`city` varchar(100),
	`country` varchar(100),
	`postalCode` varchar(20),
	`isActive` boolean NOT NULL DEFAULT true,
	`managerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`),
	CONSTRAINT `wh_org_code_idx` UNIQUE(`organizationId`,`code`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_assetId_assets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `file_uploads` ADD CONSTRAINT `file_uploads_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `file_uploads` ADD CONSTRAINT `file_uploads_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_members` ADD CONSTRAINT `org_members_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_members` ADD CONSTRAINT `org_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_members` ADD CONSTRAINT `org_members_invitedBy_users_id_fk` FOREIGN KEY (`invitedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_settings` ADD CONSTRAINT `org_settings_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_settings` ADD CONSTRAINT `org_settings_defaultWarehouseId_warehouses_id_fk` FOREIGN KEY (`defaultWarehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchaseOrderId_purchase_orders_id_fk` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_itemId_inventory_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_permissions_id_fk` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_order_items` ADD CONSTRAINT `sales_order_items_salesOrderId_sales_orders_id_fk` FOREIGN KEY (`salesOrderId`) REFERENCES `sales_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_order_items` ADD CONSTRAINT `sales_order_items_itemId_inventory_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_levels` ADD CONSTRAINT `stock_levels_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_levels` ADD CONSTRAINT `stock_levels_itemId_inventory_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_levels` ADD CONSTRAINT `stock_levels_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_itemId_inventory_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_toWarehouseId_warehouses_id_fk` FOREIGN KEY (`toWarehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_performedBy_users_id_fk` FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_managerId_users_id_fk` FOREIGN KEY (`managerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `aa_asset_idx` ON `asset_assignments` (`assetId`);--> statement-breakpoint
CREATE INDEX `aa_org_idx` ON `asset_assignments` (`organizationId`);--> statement-breakpoint
CREATE INDEX `asset_org_idx` ON `assets` (`organizationId`);--> statement-breakpoint
CREATE INDEX `asset_status_idx` ON `assets` (`status`);--> statement-breakpoint
CREATE INDEX `audit_org_idx` ON `audit_logs` (`organizationId`);--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `audit_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `audit_module_idx` ON `audit_logs` (`module`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `cat_org_idx` ON `categories` (`organizationId`);--> statement-breakpoint
CREATE INDEX `cust_org_idx` ON `customers` (`organizationId`);--> statement-breakpoint
CREATE INDEX `file_org_idx` ON `file_uploads` (`organizationId`);--> statement-breakpoint
CREATE INDEX `file_ref_idx` ON `file_uploads` (`referenceType`,`referenceId`);--> statement-breakpoint
CREATE INDEX `inv_org_idx` ON `inventory_items` (`organizationId`);--> statement-breakpoint
CREATE INDEX `inv_cat_idx` ON `inventory_items` (`categoryId`);--> statement-breakpoint
CREATE INDEX `notif_org_idx` ON `notifications` (`organizationId`);--> statement-breakpoint
CREATE INDEX `notif_user_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notif_read_idx` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `org_idx` ON `org_members` (`organizationId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `org_members` (`userId`);--> statement-breakpoint
CREATE INDEX `poi_po_idx` ON `purchase_order_items` (`purchaseOrderId`);--> statement-breakpoint
CREATE INDEX `poi_item_idx` ON `purchase_order_items` (`itemId`);--> statement-breakpoint
CREATE INDEX `po_org_idx` ON `purchase_orders` (`organizationId`);--> statement-breakpoint
CREATE INDEX `po_status_idx` ON `purchase_orders` (`status`);--> statement-breakpoint
CREATE INDEX `rp_org_idx` ON `role_permissions` (`organizationId`);--> statement-breakpoint
CREATE INDEX `soi_so_idx` ON `sales_order_items` (`salesOrderId`);--> statement-breakpoint
CREATE INDEX `soi_item_idx` ON `sales_order_items` (`itemId`);--> statement-breakpoint
CREATE INDEX `so_org_idx` ON `sales_orders` (`organizationId`);--> statement-breakpoint
CREATE INDEX `so_status_idx` ON `sales_orders` (`status`);--> statement-breakpoint
CREATE INDEX `stock_org_idx` ON `stock_levels` (`organizationId`);--> statement-breakpoint
CREATE INDEX `sm_org_idx` ON `stock_movements` (`organizationId`);--> statement-breakpoint
CREATE INDEX `sm_item_idx` ON `stock_movements` (`itemId`);--> statement-breakpoint
CREATE INDEX `sm_wh_idx` ON `stock_movements` (`warehouseId`);--> statement-breakpoint
CREATE INDEX `sm_created_idx` ON `stock_movements` (`createdAt`);--> statement-breakpoint
CREATE INDEX `sup_org_idx` ON `suppliers` (`organizationId`);--> statement-breakpoint
CREATE INDEX `wh_org_idx` ON `warehouses` (`organizationId`);
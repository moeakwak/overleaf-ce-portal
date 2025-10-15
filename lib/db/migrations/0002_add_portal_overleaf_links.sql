CREATE TABLE `portal_user_overleaf_link` (
	`portal_user_id` text NOT NULL,
	`overleaf_user_id` text NOT NULL,
	`overleaf_user_email` text,
	`created_at` integer DEFAULT (current_timestamp) NOT NULL,
	`updated_at` integer DEFAULT (current_timestamp) NOT NULL,
	PRIMARY KEY(`portal_user_id`, `overleaf_user_id`),
	FOREIGN KEY (`portal_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

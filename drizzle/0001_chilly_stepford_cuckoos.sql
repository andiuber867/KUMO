CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`credential_version` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);

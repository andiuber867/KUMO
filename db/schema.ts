import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
export const products = sqliteTable('products', {id:text('id').primaryKey(),name:text('name').notNull(),description:text('description').notNull(),category:text('category').notNull(),price:real('price').notNull(),image:text('image').notNull(),portion:text('portion').notNull(),isNew:integer('is_new').notNull().default(0),available:integer('available').notNull().default(1),createdAt:integer('created_at').notNull()});
export const settings = sqliteTable('settings',{key:text('key').primaryKey(),value:text('value').notNull()});
export const adminSessions = sqliteTable('admin_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  username: text('username').notNull(),
  credentialVersion: text('credential_version').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const loginLimits = sqliteTable('login_limits', {
  key: text('key').primaryKey(),
  attempts: integer('attempts').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

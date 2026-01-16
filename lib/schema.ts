import { mysqlTable, varchar, int, timestamp } from 'drizzle-orm/mysql-core';

export const project_keywords = mysqlTable('project_keywords', {
  id: int('id').primaryKey().autoincrement(),
  project_id: int('project_id').notNull(),
  keyword: varchar('keyword', { length: 100 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
}); 
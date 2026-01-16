import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

// MySQL 연결 생성
const poolConnection = mysql.createPool({
  host: 'host.docker.internal',
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// Drizzle 인스턴스 생성
export const db = drizzle(poolConnection); 
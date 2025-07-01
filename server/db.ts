import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

// Create a PostgreSQL client
const connectionString = process.env.DATABASE_URL!;
// For local Postgres (not Neon), we need to set ssl to false
const sql = postgres(connectionString, { ssl: 'require' });

// Create a Drizzle ORM instance with our schema
export const db = drizzle(sql, { schema });
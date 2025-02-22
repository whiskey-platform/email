import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import postgres from 'postgres';
import { Secrets } from '@whiskey-platform/secrets';
import { logger } from '@whiskey-platform/logging';

export const db = async () => {
  const secrets = new Secrets();
  const connectionString = await secrets.get('DB_CONNECTION');
  logger.info('Connecting to database');
  const client = postgres(connectionString, { prepare: false });
  logger.info('Connection to database successful');
  return drizzle(client, { schema });
};

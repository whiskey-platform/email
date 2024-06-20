import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import postgres from 'postgres';
import { Secrets } from '../services/secrets';
import { logger } from '../services/logging';

export const db = async () => {
  const secrets = new Secrets();
  const connectionString = await secrets.get('DATABASE_CONNECTION');
  logger.info('Connecting to database');
  const client = postgres(connectionString, { prepare: false });
  logger.info('Connection to database successful');
  return drizzle(client, { schema });
};

import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import postgres from 'postgres';
import { Secrets } from '../services/secrets';

export const db = async () => {
  const secrets = new Secrets();
  const connectionString = await secrets.get('DATABASE_CONNECTION');
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
};

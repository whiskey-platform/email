import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import postgres from 'postgres';
import { getSecret } from '../services/secrets';

export const db = async () => {
  const connectionString = (await getSecret('DATABASE_CONNECTION')).secretValue;
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
};

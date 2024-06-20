import { Handler } from 'aws-lambda';
import { Gmail } from '../services/gmail';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { oauthAccounts } from '../db/schema';
import { Secrets } from '../services/secrets';
import { logger } from '../services/logging';

export const handler: Handler = async event => {
  const secrets = new Secrets();
  const clientId = await secrets.get('GOOGLE_CLIENT_ID');
  const clientSecret = await secrets.get('GOOGLE_CLIENT_SECRET');
  const dbClient = await db();
  logger.info('Getting Gmail account info');
  const result = await dbClient.query.oauthAccounts.findFirst({
    where: eq(oauthAccounts.type, 'gmail'),
  });
  if (!result) {
    logger.error('No Gmail account found');
    throw Error('No Gmail account found');
  }
  logger.info('Successfully retrieved Gmail account details');
  const gmail = new Gmail(clientId, clientSecret, result.accessToken!, result.refreshToken!);
  const messages = await gmail.listFullMessages();
  // save to database
  // save backups
  // send events
};

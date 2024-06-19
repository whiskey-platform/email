import { Handler } from 'aws-lambda';
import { Gmail } from '../services/gmail';
import { getSecret } from '../services/secrets';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { oauthAccounts } from '../db/schema';

export const handler: Handler = async event => {
  const clientId = await getSecret('GOOGLE_CLIENT_ID');
  const clientSecret = await getSecret('GOOGLE_CLIENT_SECRET');
  const dbClient = await db();
  const result = await dbClient.query.oauthAccounts.findFirst({
    where: eq(oauthAccounts.type, 'gmail'),
  });
  if (!result) {
    throw new Error('No Gmail account found');
  }
  const gmail = new Gmail(
    clientId.secretValue,
    clientSecret.secretValue,
    result.accessToken!,
    result.refreshToken!
  );
  await gmail.watchForMessages();
};

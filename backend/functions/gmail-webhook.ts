import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Gmail } from '../services/gmail';
import { Resource } from 'sst';
import { Secrets } from '../services/secrets';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { googleAccountDetails, oauthAccounts } from '../db/schema';
import { logger } from '../services/logging';

type GmailWebhookBody = {
  message: {
    // This is the actual notification data, as base64url-encoded JSON.
    data: string;

    // This is a Cloud Pub/Sub message id, unrelated to Gmail messages.
    messageId: string;

    // This is the publish time of the message.
    publishTime: string;
  };

  subscription: string;
};

type GmailWebhookBodyData = {
  emailAddress: string;
  historyId: string;
};

export const handler: APIGatewayProxyHandlerV2 = async event => {
  const s3 = new S3Client({ region: 'us-east-1' });
  const secrets = new Secrets();
  const body: GmailWebhookBody = JSON.parse(event.body ?? '{}');
  const data: GmailWebhookBodyData = JSON.parse(
    Buffer.from(body.message.data, 'base64').toString()
  );
  const clientId = await secrets.get('GOOGLE_CLIENT_ID');
  const clientSecret = await secrets.get('GOOGLE_CLIENT_SECRET');
  const dbClient = await db();
  logger.info('Getting Gmail account info');
  const oauthResult = await dbClient.query.oauthAccounts.findFirst({
    where: eq(oauthAccounts.type, 'google'),
  });
  if (!oauthResult) {
    logger.error('No Gmail account found');
    throw Error('No Gmail account found');
  }
  logger.info('Successfully retrieved Gmail account details');
  const gmail = new Gmail(
    clientId,
    clientSecret,
    oauthResult.accessToken!,
    oauthResult.refreshToken!
  );
  const lastHistory = await dbClient.query.googleAccountDetails.findFirst({
    where: eq(googleAccountDetails.loginId, oauthResult.loginId),
  });
  const history = await gmail.getFullHistory(lastHistory.lastHistoryId);
  const paths: string[] = [];
  for (const historyItem of history) {
    if (historyItem.messagesAdded) {
      const messages = await Promise.all(
        historyItem.messagesAdded.map(async message => {
          return await gmail.getFullMessage(message.message!.id!);
        })
      );
      // save to s3
      for (const message of messages) {
        if (
          !message.payload?.headers?.find(
            header => header.name === 'To' && header.value!.includes('@mattwyskiel.com')
          )
        ) {
          logger.info(`Saving message to S3: ${message.id}`);
          const command = new PutObjectCommand({
            Bucket: Resource.EmailBucket.name,
            Key: `raw/gmail/${message.id}.json`,
            Body: JSON.stringify(message),
          });
          await s3.send(command);
          logger.info(`Successfully saved message to S3: ${message.id}`);
          paths.push(`raw/gmail/${message.id}.json`);
        } else {
          logger.info(`Skipping @mattwyskiel.com message: ${message.id}`);
        }
      }
    }
  }
  await dbClient
    .insert(googleAccountDetails)
    .values({ loginId: oauthResult.loginId, lastHistoryId: data.historyId })
    .onConflictDoUpdate({
      target: googleAccountDetails.loginId,
      set: { lastHistoryId: data.historyId },
    });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'success', paths }),
  };
};

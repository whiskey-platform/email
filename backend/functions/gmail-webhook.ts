import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Gmail } from '../services/gmail';
import { Resource } from 'sst';
import { getSecret } from '../services/secrets';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { oauthAccounts } from '../db/schema';

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

const s3 = new S3Client({ region: 'us-east-1' });

export const handler: APIGatewayProxyHandlerV2 = async event => {
  const body: GmailWebhookBody = JSON.parse(event.body ?? '{}');
  const data: GmailWebhookBodyData = JSON.parse(
    Buffer.from(body.message.data, 'base64').toString()
  );
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
  const history = await gmail.getFullHistory(data.historyId);
  const paths: string[] = [];
  history.forEach(async historyItem => {
    if (historyItem.messagesAdded) {
      const messages = await Promise.all(
        historyItem.messagesAdded.map(async message => {
          return await gmail.getFullMessage(message.message!.id!);
        })
      );
      // save to s3
      messages.forEach(async message => {
        if (
          !message.payload?.headers?.find(
            header => header.name === 'To' && header.value!.includes('@mattwyskiel.com')
          )
        ) {
          const command = new PutObjectCommand({
            Bucket: Resource.EmailBucket.name,
            Key: `raw/gmail/${message.id}.json`,
            Body: JSON.stringify(message),
          });
          await s3.send(command);
          paths.push(`raw/gmail/${message.id}.json`);
        }
      });
    }
  });
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'success', paths }),
  };
};

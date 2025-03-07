import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Resource } from 'sst';
import { logger } from '@whiskey-platform/logging';

export const handler: APIGatewayProxyHandlerV2 = async event => {
  const s3 = new S3Client({ region: 'us-east-1' });
  const payload = JSON.parse(event.body ?? '{}');
  logger.info(`Saving ImprovMX message to S3: ${payload['message-id']}`);
  const command = new PutObjectCommand({
    Bucket: Resource.EmailBucket.name,
    Key: `raw/improvmx/${payload['timestamp']}.json`,
    Body: event.body,
  });
  const res = await s3.send(command);
  logger.info(`Successfully saved ImprovMX message to S3: ${payload['message-id']}`);
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'success',
      path: `raw/improvmx/${payload['timestamp']}.json`,
    }),
  };
};

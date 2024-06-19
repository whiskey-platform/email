import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Resource } from 'sst';

const s3 = new S3Client({ region: 'us-east-1' });

export const handler: APIGatewayProxyHandlerV2 = async event => {
  console.log('event', event);
  const payload = JSON.parse(event.body ?? '{}');
  console.log('payload', payload);
  const command = new PutObjectCommand({
    Bucket: Resource.EmailBucket.name,
    Key: `raw/improvmx/${payload['message-id']}.json`,
    Body: event.body,
  });
  const res = await s3.send(command);
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'success',
      path: `raw/improvmx/${payload['message-id']}.json`,
    }),
  };
};

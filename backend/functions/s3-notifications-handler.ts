import { S3Handler } from 'aws-lambda';
import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

export const handler: S3Handler = async event => {
  console.log('event', event);
  const gmailPrefix = 'raw/gmail/';
  const gmailFunction = process.env.GMAIL_FUNCTION;
  const improvmxFunction = process.env.IMPROVMX_FUNCTION;
  const improvmxPrefix = 'raw/improvmx/';
  event.Records.forEach(async record => {
    const key = record.s3.object.key;
    if (!key) return;
    if (key.startsWith(gmailPrefix)) {
      await lambda.send(
        new InvokeCommand({
          FunctionName: gmailFunction,
          Payload: JSON.stringify({ key }),
          InvocationType: InvocationType.Event,
        })
      );
    }
    if (key.startsWith(improvmxPrefix)) {
      await lambda.send(
        new InvokeCommand({
          FunctionName: improvmxFunction,
          Payload: JSON.stringify({ key }),
          InvocationType: InvocationType.Event,
        })
      );
    }
  });
};

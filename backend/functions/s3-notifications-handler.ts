import { S3Handler } from 'aws-lambda';
import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';
import { logger } from '../services/logging';

const lambda = new LambdaClient({ region: 'us-east-1' });

export const handler: S3Handler = async event => {
  const gmailPrefix = 'raw/gmail/';
  const gmailFunction = process.env.GMAIL_FUNCTION;
  const improvmxFunction = process.env.IMPROVMX_FUNCTION;
  const improvmxPrefix = 'raw/improvmx/';
  event.Records.forEach(async record => {
    const key = record.s3.object.key;
    if (!key) return;
    if (key.startsWith(gmailPrefix)) {
      logger.info(`Received Gmail message: ${key}`);
      await lambda.send(
        new InvokeCommand({
          FunctionName: gmailFunction,
          Payload: JSON.stringify({ key }),
          InvocationType: InvocationType.Event,
        })
      );
      logger.info(`Invoked Gmail function`);
    }
    if (key.startsWith(improvmxPrefix)) {
      logger.info(`Received ImprovMX message: ${key}`);
      await lambda.send(
        new InvokeCommand({
          FunctionName: improvmxFunction,
          Payload: JSON.stringify({ key }),
          InvocationType: InvocationType.Event,
        })
      );
      logger.info(`Invoked ImprovMX function`);
    }
  });
};

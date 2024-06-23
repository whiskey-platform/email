import { InvocationType, InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client, _Object, paginateListObjectsV2 } from '@aws-sdk/client-s3';
import { Handler } from 'aws-lambda';
import { Resource } from 'sst';

const s3 = new S3Client({});
const lambda = new LambdaClient({ region: 'us-east-1' });

export const handler: Handler = async _event => {
  const paginator = paginateListObjectsV2({ client: s3 }, { Bucket: Resource.EmailBucket.name });
  const files: _Object[] = [];
  for await (const page of paginator) {
    files.push(...page.Contents);
  }
  const keys = files.map(file => file.Key);
  const event = {
    Records: keys.map(key => ({
      s3: {
        object: {
          key,
        },
      },
    })),
  };

  await lambda.send(
    new InvokeCommand({
      FunctionName: process.env.SUBSCRIBER_FUNCTION_ARN,
      Payload: JSON.stringify(event),
      InvocationType: InvocationType.Event,
    })
  );
};

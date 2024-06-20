import { S3Handler } from 'aws-lambda';
import { S3 } from '../services/s3';
import { emailMessageFromGmail } from '../model/gmail-message';
import { EventBridge } from '../services/eventbridge';
import { messageMeta } from '../model/message';

const s3 = new S3();
const eventbridge = new EventBridge();

export const handler: S3Handler = async event => {
  event.Records.forEach(async record => {
    const key = record.s3.object.key;
    const rawEmail = await s3.getRawEmail(key);
    const message = emailMessageFromGmail(rawEmail);
    await s3.uploadEmailMessage(message);
    await eventbridge.putNewMessageEvent(messageMeta(message));
  });
};

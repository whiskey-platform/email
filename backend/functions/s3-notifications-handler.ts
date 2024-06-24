import { S3Handler } from 'aws-lambda';
import { logger } from '../services/logging';
import { S3 } from '../services/s3';
import { emailMessageFromImprovmx } from '../model/improvmx-message';
import { EventBridge } from '../services/eventbridge';
import { EmailMessage, messageMeta } from '../model/message';
import { emailMessageFromGmail } from '../model/gmail-message';

export const handler: S3Handler = async event => {
  const s3 = new S3();
  const eventbridge = new EventBridge();
  const gmailPrefix = 'raw/gmail/';
  const improvmxPrefix = 'raw/improvmx/';
  event.Records.forEach(async record => {
    const key = record.s3.object.key;
    if (!key) return;
    const rawEmail = await s3.getRawEmail(key);
    let message: EmailMessage;
    if (key.startsWith(gmailPrefix)) {
      logger.info(`Received Gmail message: ${key}`);
      message = emailMessageFromGmail(rawEmail);
    } else if (key.startsWith(improvmxPrefix)) {
      logger.info(`Received ImprovMX message: ${key}`);
      message = emailMessageFromImprovmx(rawEmail);
    } else {
      logger.error(`Unknown message type: ${key}`);
      return;
    }
    await s3.uploadEmailMessage(message);
    await eventbridge.putNewMessageEvent(messageMeta(message));
  });
};
